#!/usr/bin/env python3
import argparse, copy, json
from pathlib import Path

SYN_LABEL="DÉMO SYNTHÉTIQUE · DONNÉES FICTIVES"

def ratio(v):
    if isinstance(v,(int,float)) and abs(v)>1: return v/100.0
    return v

def wrap_tier(name, raw, deal_type):
    if isinstance(raw, dict) and "data" in raw and "tier" in raw:
        node=copy.deepcopy(raw)
        node.setdefault('indexable', name=='T0')
        node.setdefault('access_condition', {"T0":"AUTHENTICATED_OR_PUBLIC_POLICY","T1":"ADMISSION_IF_SHARE_DEAL" if deal_type=="SHARE_DEAL" else "STANDARD_ACCESS","T2":"NDA_EXECUTED_AND_T2_GRANTED"}[name])
        return node
    data=copy.deepcopy(raw or {})
    data.setdefault('synthetic_label',SYN_LABEL)
    access={"T0":"AUTHENTICATED_OR_PUBLIC_POLICY","T1":"ADMISSION_IF_SHARE_DEAL" if deal_type=="SHARE_DEAL" else "STANDARD_ACCESS","T2":"NDA_EXECUTED_AND_T2_GRANTED"}[name]
    return {"tier":name,"indexable": name=='T0', "access_condition":access,"data":data}

def migrate(d):
    x=copy.deepcopy(d)
    if x.get("schema_version")=="2.0": return x
    master=x.setdefault("master",{})
    fin=x.setdefault('financials',{})
    inc=fin.get('income_statement',[]) or []
    bs=fin.get('balance_sheet',[]) or []
    cf=fin.get('cash_flow',[]) or []
    years=[r.get('year') for r in inc if isinstance(r,dict) and isinstance(r.get('year'),int)]
    ref=master.get("reference_year") or (max(years) if years else None) or 2025

    # Normalize percentages from historical v1 fixtures.
    for r in inc:
        if isinstance(r,dict) and 'ebitda_margin' in r: r['ebitda_margin']=ratio(r['ebitda_margin'])
    oldk=fin.pop('latest_kpis',None)
    if oldk and not fin.get('kpis'):
        fin['kpis']={
            'year':ref,
            'revenue':oldk.get('revenue'),
            'ebitda':oldk.get('ebitda'),
            'ebitda_margin':ratio(oldk.get('ebitda_margin')),
            'net_income':oldk.get('net_income'),
            'net_debt':oldk.get('net_debt'),
            'net_debt_to_ebitda':oldk.get('net_debt_to_ebitda'),
            'working_capital':oldk.get('working_capital',oldk.get('nwc')),
            'top5_customer_concentration':ratio(oldk.get('top5_customer_concentration',oldk.get('customer_top5_pct'))),
            'recurring_revenue':ratio(oldk.get('recurring_revenue',oldk.get('recurring_revenue_pct'))),
            'export_share':ratio(oldk.get('export_share',oldk.get('export_pct'))),
            'headcount':master.get('employees')
        }
    k=fin.setdefault('kpis',{})
    if 'year' not in k: k['year']=ref
    for fld in ('ebitda_margin','top5_customer_concentration','recurring_revenue','export_share'):
        if fld in k: k[fld]=ratio(k[fld])

    # Canonical net debt is debt minus cash. Preserve legacy value for traceability.
    latest_bs=next((r for r in bs if r.get('year')==ref), bs[-1] if bs else None)
    if latest_bs:
        derived_net=latest_bs.get('debt',0)-latest_bs.get('cash',0)
        legacy_net=master.get('net_debt',k.get('net_debt'))
        if legacy_net is not None and legacy_net != derived_net:
            master['legacy_reported_net_debt']=legacy_net
            k['legacy_reported_net_debt']=k.get('net_debt')
        master['net_debt']=derived_net
        k['net_debt']=derived_net
        ebitda=next((r.get('ebitda') for r in inc if r.get('year')==ref),None)
        if ebitda not in (None,0): k['net_debt_to_ebitda']=round(derived_net/ebitda,4)
        wc=latest_bs.get('receivables',0)+latest_bs.get('inventory',0)-latest_bs.get('payables',0)
        k['working_capital']=wc
    master['reference_year']=ref
    master.setdefault('currency_unit', master.get('currency',master.get('asking_unit','M FCFA')))
    master.setdefault('asking_unit',master.get('currency_unit','M FCFA'))
    master.setdefault('asking_source','SELLER_EXPECTATION')
    master.setdefault('rccm',f"SYN-{x.get('case_id','CASE')}-RCCM")

    x["schema_version"]="2.0"
    x.setdefault('fixture_kind','PASS_TRANSMISSION')
    x["synthetic"]=bool(x.get("synthetic",True))
    x["meta"]={
        "seed": x.get("case_id","MIGRATED-V1"),
        "as_of_date": f"{ref}-12-31",
        "source_locale":"fr",
        "scenario_class": str(master.get("variant","MIGRATED_V1")).upper(),
        "confidentiality_class":"RESTRICTED" if master.get("deal_type")=="SHARE_DEAL" else "STANDARD",
        "reference_year": ref,
        "currency":"XOF",
        "scale":"MILLION" if "M" in str(master.get("currency_unit",master.get("asking_unit",""))) else "UNIT",
        "migration_from":"1.0"
    }

    disc=x.setdefault("disclosure",{})
    for t in ("T0","T1","T2"):
        disc[t]=wrap_tier(t,disc.get(t,{}),master.get("deal_type"))
    # Normalize disclosure percentages and enrich T2 seller attribution.
    for t in ('T1','T2'):
        data=disc[t]['data']
        for fld in ('ebitda_margin','recurring_share','export_share','top5_customer_concentration'):
            if fld in data: data[fld]=ratio(data[fld])
    t2=disc['T2']['data']
    t2.setdefault('company',master.get('company'))
    t2.setdefault('rccm',master.get('rccm'))
    if master.get('asking') is not None:
        t2.setdefault('asking_price',master.get('asking'))
        t2.setdefault('asking_price_unit',master.get('asking_unit',master.get('currency_unit')))
        t2.setdefault('asking_price_source','Attente du cédant — non valorisation DealPME')
    t2.setdefault('vdr_gate','NDA_EXECUTED_AND_T2_GRANTED')

    dr=x.setdefault('deal_ready',{})
    if 'institutional_badge' in dr and 'certification_awarded' not in dr: dr['certification_awarded']=bool(dr.get('institutional_badge'))
    dr.setdefault('human_decision_required',True)
    dr.setdefault('decision_owner','CCI / officier nommé')
    dr.setdefault('open_items',[])
    if dr.get('certification_awarded'):
        dr.setdefault('decision_evidence','Décision humaine institutionnelle synthétique, migrée depuis le fixture v1')

    v=x.setdefault("vdr",{})
    v.setdefault('status','PREPARED_NOT_GRANTED')
    v.setdefault('access_rule','NDA + T2 grant + seller approval')
    v.setdefault("nda_required",True)
    v.setdefault("t2_grant_required",True)
    v.setdefault("seller_approval_required",True)
    if 'download_default' in v and 'default_download_allowed' not in v: v['default_download_allowed']=bool(v.get('download_default'))
    v.setdefault("default_download_allowed",False)
    if 'watermark' in v and 'watermark_required' not in v: v['watermark_required']=bool(v.get('watermark'))
    v.setdefault("watermark_required",True)

    x.setdefault("access_model",{
        "default_deny":True,
        "admin_confidential_default":False,
        "break_glass_required":True,
        "expert_scope_required":True,
        "expert_access_expires":True
    })
    x.setdefault("audit_events",[])
    if not x["audit_events"]:
        x["audit_events"]=["VERIFICATION_DECISION","DISCLOSURE_ADMISSION","NDA_EXECUTION","T2_GRANT","VDR_ACCESS"]
    if not x.get("evidence_ledger"):
        fields=[
            ("master.asking","DECLARED","SELLER_DECLARATION",0.7),
            ("financials.kpis.revenue","SYNTHETIC","SYNTHETIC_MODEL",1.0),
            ("financials.kpis.ebitda","SYNTHETIC","SYNTHETIC_MODEL",1.0),
            ("master.rccm","SYNTHETIC","SYNTHETIC_MODEL",1.0),
            ("deal_ready.status","SYNTHETIC","SYNTHETIC_MODEL",1.0)]
        date=x["meta"]["as_of_date"]
        x["evidence_ledger"]=[{"field_path":p,"status":s,"source_type":st,"as_of_date":date,"confidence":c} for p,s,st,c in fields]
    prov=x.setdefault("provenance",{})
    prov.setdefault("type","SYNTHETIC_TEST_DATA")
    prov.setdefault("generated_for",prov.get('created_for','DealPME fixture migration'))
    prov["not_real_case"]=True
    prov.setdefault("source_documents",[])
    return x

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("input"); ap.add_argument("output")
    a=ap.parse_args(); d=json.loads(Path(a.input).read_text(encoding="utf-8")); out=migrate(d)
    Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(a.output)
if __name__=="__main__": main()
