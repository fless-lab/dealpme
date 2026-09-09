#!/usr/bin/env python3
import argparse, json, re, sys
from pathlib import Path

FORBIDDEN_KEYS={
    'company','companyname','company_name','brand','legal_name','rccm','rccmnumber','rccm_number',
    'asking','asking_price','askingprice','price','valuation','fair_value','offerterms','offer_terms',
    't2_url','vdr_url','document_url','download_url','document_link','vdr_link'
}
FORBIDDEN_KEY_PARTS=('rccm','valuation','fair_value','asking_price','offer_terms','vdr_url','document_url','download_url')
BAD_PRICE_PHRASES=(
    'valorisation dealpme','juste valeur dealpme','prix recommande par dealpme','prix recommandé par dealpme',
    'fair value dealpme','valeur certifiee par dealpme','valeur certifiée par dealpme'
)
SYNTHETIC_LABEL_TOKENS=('demo synthetique','démo synthétique','donnees fictives','données fictives')

def is_negated_claim(text, phrase):
    t=str(text).strip().lower()
    idx=t.find(phrase)
    if idx < 0:
        return False
    prefix=t[max(0,idx-32):idx]
    return any(x in prefix for x in ('non ', 'pas une ', "n\'est pas une ", 'n’est pas une ', 'ne constitue pas une ', 'not a ', 'not an '))


def norm(s):
    return str(s).strip().lower()


def tier_node(d,t):
    node=d.get('disclosure',{}).get(t,{})
    if isinstance(node,dict) and 'data' in node: return node, node.get('data',{})
    return {'tier':t,'data':node}, node if isinstance(node,dict) else {}


def walk(obj,path=''):
    if isinstance(obj,dict):
        for k,v in obj.items():
            p=f'{path}.{k}' if path else str(k)
            yield p,k,v
            yield from walk(v,p)
    elif isinstance(obj,list):
        for i,v in enumerate(obj):
            p=f'{path}[{i}]'
            yield p,str(i),v
            yield from walk(v,p)


def all_strings(obj):
    vals=[]
    if isinstance(obj,str): vals.append(obj)
    elif isinstance(obj,dict):
        for v in obj.values(): vals.extend(all_strings(v))
    elif isinstance(obj,list):
        for v in obj: vals.extend(all_strings(v))
    return vals


def finding(arr,severity,rule,path,msg,expected=None):
    arr.append({'severity':severity,'rule_id':rule,'path':path,'message':msg,'expected':expected})


def validate(d):
    f=[]
    master=d.get('master',{})
    share=master.get('deal_type')=='SHARE_DEAL'
    synthetic=bool(d.get('synthetic'))
    sensitive_values=[]
    for key in ('company','rccm'):
        v=master.get(key)
        if isinstance(v,str) and len(v.strip())>=4: sensitive_values.append((key,norm(v)))
    t2meta,t2data=tier_node(d,'T2')
    for key in ('offer_terms','offerTerms'):
        v=t2data.get(key) if isinstance(t2data,dict) else None
        if isinstance(v,str) and len(v.strip())>=12: sensitive_values.append((key,norm(v)))

    for tier in ('T0','T1'):
        meta,data=tier_node(d,tier)
        if share:
            for path,k,v in walk(data,f'disclosure.{tier}.data'):
                nk=norm(k).replace('-','_')
                if nk in FORBIDDEN_KEYS or any(part in nk for part in FORBIDDEN_KEY_PARTS):
                    finding(f,'P0','DISC-KEY-001',path,f'Forbidden confidential key in {tier}: {k}')
                if isinstance(v,str):
                    nv=norm(v)
                    if '/vdr' in nv or 'vdr/' in nv or '/t2' in nv or 'data-room' in nv:
                        finding(f,'P0','DISC-LINK-001',path,f'T2/VDR-like link or reference leaked into {tier}')
                    for label,sval in sensitive_values:
                        if sval and sval in nv:
                            finding(f,'P0','DISC-VALUE-001',path,f'Sensitive {label} value leaked into {tier}')
            if tier=='T1' and meta.get('indexable') is not False:
                finding(f,'P0','DISC-INDEX-001',f'disclosure.{tier}.indexable','Share-deal T1 must be non-indexable',False)
        if synthetic:
            text=' '.join(norm(x) for x in all_strings(data))
            if not any(tok in text for tok in SYNTHETIC_LABEL_TOKENS):
                finding(f,'P1','DISC-SYN-001',f'disclosure.{tier}.data','Synthetic tier lacks visible synthetic-data label')

    t2_access=t2meta.get('access_condition') or (t2data.get('vdr_gate') if isinstance(t2data,dict) else None)
    if share and not t2_access:
        finding(f,'P0','DISC-GATE-001','disclosure.T2.access_condition','Share-deal T2 must declare an access gate')
    elif share and 'NDA' not in str(t2_access).upper():
        finding(f,'P0','DISC-GATE-002','disclosure.T2.access_condition','Share-deal T2 gate must include NDA execution')
    if t2meta.get('indexable') is True:
        finding(f,'P0','DISC-INDEX-002','disclosure.T2.indexable','T2 must not be indexable',False)

    # Seller-price wording and prohibited DealPME valuation claims anywhere in disclosure
    for raw in all_strings(d.get('disclosure',{})):
        txt=norm(raw)
        for bad in BAD_PRICE_PHRASES:
            if bad in txt and not is_negated_claim(txt,bad):
                finding(f,'P0','DISC-COPY-001','disclosure',f'Prohibited DealPME valuation/price claim: {bad}')
    if isinstance(t2data,dict):
        has_price=any(k in t2data for k in ('asking_price','askingPrice','asking'))
        if has_price:
            src=' '.join(str(t2data.get(k,'')) for k in ('asking_price_source','asking_source','price_source'))
            if not re.search(r'c[eé]dant|seller',src,re.I):
                finding(f,'P1','DISC-COPY-002','disclosure.T2.data','Seller asking price is not explicitly attributed to the seller')

    p0=sum(x['severity']=='P0' for x in f); p1=sum(x['severity']=='P1' for x in f); p2=sum(x['severity']=='P2' for x in f)
    return {'status':'FAIL' if p0 else ('PASS_WITH_WARNINGS' if p1 or p2 else 'PASS'),'summary':{'P0':p0,'P1':p1,'P2':p2},'findings':f}


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('fixture'); ap.add_argument('--output')
    a=ap.parse_args(); d=json.loads(Path(a.fixture).read_text(encoding='utf-8')); r=validate(d)
    text=json.dumps(r,ensure_ascii=False,indent=2)
    if a.output: Path(a.output).write_text(text+'\n',encoding='utf-8')
    print(text); sys.exit(1 if r['status']=='FAIL' else 0)
if __name__=='__main__': main()
