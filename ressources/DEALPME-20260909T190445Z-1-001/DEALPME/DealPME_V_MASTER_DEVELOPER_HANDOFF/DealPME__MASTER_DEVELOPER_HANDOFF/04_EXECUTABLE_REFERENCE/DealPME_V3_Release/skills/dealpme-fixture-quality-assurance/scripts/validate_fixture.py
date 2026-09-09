#!/usr/bin/env python3
import argparse,json,math,re,sys
from pathlib import Path
FORBIDDEN={'company','company_name','companyname','rccm','asking','asking_price','askingprice','valuation','fair_value','offerterms','offer_terms','vdr_url','vdr_link','document_url','document_link'}
BAD_CLAIMS=('valorisation dealpme','juste valeur dealpme','prix recommandé par dealpme','prix recommande par dealpme','dealpme garantit','dealpme guarantees','empêche toute capture','empeche toute capture')
def norm(s):return re.sub(r'\s+',' ',str(s).lower()).strip()
def negated_claim(text, phrase):
 t=norm(text); idx=t.find(phrase)
 if idx<0:return False
 prefix=t[max(0,idx-48):idx]
 return any(x in prefix for x in ('non ', 'pas une ', 'pas un ', "n'est pas une " , 'n’est pas une ', "n'est pas un ", 'n’est pas un ', 'ne constitue pas une ', 'ne constitue pas un ', "n\'est ni une ", 'n’est ni une ', "n\'est ni un ", 'n’est ni un ', 'not a ', 'not an '))
def walk(x,path='$'):
 if isinstance(x,dict):
  for k,v in x.items():yield path+'.'+str(k),k,v;yield from walk(v,path+'.'+str(k))
 elif isinstance(x,list):
  for i,v in enumerate(x):yield from walk(v,f'{path}[{i}]')
def add(f,s,r,p,m):f.append({'severity':s,'rule_id':r,'path':p,'message':m})
def close(a,b,t=.001):
 try:return math.isclose(float(a),float(b),abs_tol=t,rel_tol=0)
 except:return False
def validate(d):
 f=[]
 if d.get('synthetic') is not True:add(f,'P0','SYN-001','synthetic','Golden/generated fixture must be explicitly synthetic')
 if d.get('schema_version') not in {'2.0','3.0'}:add(f,'P1','VER-001','schema_version','Expected schema 3.0 for new reference fixtures')
 prov=d.get('provenance',{})
 if not (prov.get('not_real_company') or prov.get('not_real_case')):add(f,'P0','SYN-002','provenance','Synthetic fixture needs not-real-case/company marker')
 # financial reconciliation
 fin=d.get('financials',{});inc=fin.get('income_statement',[]);bs=fin.get('balance_sheet',[]);cf=fin.get('cash_flow',[]);k=fin.get('kpis',{})
 for r in inc:
  y=r.get('year');p=f'financials.income_statement[{y}]'
  if not close(r.get('ebitda'),r.get('gross_profit',0)-r.get('opex',0)):add(f,'P0','FIN-001',p+'.ebitda','EBITDA mismatch')
  if not close(r.get('ebit'),r.get('ebitda',0)-r.get('da',0)):add(f,'P0','FIN-002',p+'.ebit','EBIT mismatch')
  if not close(r.get('net_income'),r.get('ebt',0)-r.get('tax',0)):add(f,'P0','FIN-003',p+'.net_income','Net income mismatch')
 for r in bs:
  assets=sum(r.get(x,0) for x in ('cash','receivables','inventory','ppe','other_assets'));le=sum(r.get(x,0) for x in ('payables','debt','other_liabilities','equity'))
  if not close(assets,r.get('total_assets')) or not close(le,r.get('total_assets')):add(f,'P0','FIN-004',f"financials.balance_sheet[{r.get('year')}]",'Balance sheet does not reconcile')
 for r in cf:
  exp=r.get('ebitda',0)-r.get('cash_tax',0)-r.get('interest',0)-r.get('change_nwc',0)-r.get('capex',0)
  if not close(exp,r.get('free_cash_flow')):add(f,'P0','FIN-005',f"financials.cash_flow[{r.get('year')}].free_cash_flow",'Cash flow does not reconcile')
 if bs and inc:
  br=bs[-1];net=br.get('debt',0)-br.get('cash',0)
  if k.get('net_debt') is not None and not close(k['net_debt'],net):add(f,'P0','FIN-006','financials.kpis.net_debt','Net debt mismatch')
 # disclosure recursive keys
 if d.get('master',{}).get('deal_type')=='SHARE_DEAL':
  for tier in ('T0','T1'):
   data=d.get('disclosure',{}).get(tier,{}).get('data',{})
   for path,key,val in walk(data):
    nk=norm(key).replace('-','_')
    if nk in FORBIDDEN or any(part in nk for part in ('rccm','asking_price','offer_terms','vdr_url','document_url')):add(f,'P0','DISC-001',f'disclosure.{tier}{path[1:]}',f'Forbidden restricted field {key}')
 # Deal Ready
 dr=d.get('deal_ready',{})
 if dr.get('certification_awarded') and (dr.get('human_decision_required') is not True or not dr.get('decision_owner')):add(f,'P0','DR-001','deal_ready','Certification lacks named human decision')
 # VDR gates
 v=d.get('vdr',{})
 if v.get('nda_required') is not True or v.get('t2_grant_required') is not True:add(f,'P0','VDR-001','vdr','VDR gate incomplete')
 if d.get('access_model',{}).get('admin_confidential_default') is not False:add(f,'P0','ACC-001','access_model.admin_confidential_default','Broad admin access not allowed')
 # content references
 docs=d.get('documents',[]);ids={x.get('document_id') for x in docs}
 if d.get('schema_version')=='3.0':
  if len(docs)<10:add(f,'P1','CNT-001','documents','Golden v3 fixture has too few documents')
  if len(d.get('risk_register',[]))<6:add(f,'P1','CNT-002','risk_register','Golden v3 fixture has too few risks')
  if len(d.get('qa_threads',[]))<6:add(f,'P1','CNT-003','qa_threads','Golden v3 fixture has too few Q&R threads')
  if not d.get('interaction_contracts'):add(f,'P0','INT-001','interaction_contracts','No interaction contracts')
 for q in d.get('qa_threads',[]):
  if q.get('document_id') not in ids:add(f,'P0','CNT-004',q.get('qa_id','qa'),'Q&R missing linked document')
 for r in d.get('risk_register',[]):
  for doc in r.get('evidence',[]):
   if doc not in ids:add(f,'P0','CNT-005',r.get('risk_id','risk'),f'Missing risk evidence {doc}')
 # claim scan
 for _,_,v in walk(d):
  if isinstance(v,str):
   t=norm(v)
   for bad in BAD_CLAIMS:
    if bad in t and not negated_claim(v,bad):add(f,'P0','COPY-001','fixture',f'Prohibited platform claim: {bad}')
 p0=sum(x['severity']=='P0' for x in f);p1=sum(x['severity']=='P1' for x in f);p2=sum(x['severity']=='P2' for x in f)
 return {'status':'FAIL' if p0 else ('PASS_WITH_WARNINGS' if p1 or p2 else 'PASS'),'summary':{'P0':p0,'P1':p1,'P2':p2},'findings':f}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('--output');a=ap.parse_args();d=json.loads(Path(a.fixture).read_text(encoding='utf-8'));r=validate(d);r['file']=a.fixture;txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if r['status']=='FAIL' else 0)
if __name__=='__main__':main()
