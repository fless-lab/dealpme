#!/usr/bin/env python3
import argparse, json, sys
from pathlib import Path

ALLOWED_ARCH={'NORMAL','REMEDIATION','CONTROL_FAILURE'}
ALLOWED_CAP={'GOVERNED_V0','PARTNER_DEPENDENT','FUTURE_TARGET'}
SERVICE_ALIASES={
 'deal-ready':'DEAL_READY','deal ready':'DEAL_READY','deal_ready':'DEAL_READY',
 'deal-experts':'DEAL_EXPERTS','deal experts':'DEAL_EXPERTS','deal_experts':'DEAL_EXPERTS',
 'vdr/q&a':'VDR_QA','vdr-qa':'VDR_QA','vdr_qa':'VDR_QA','vdr':'VDR_QA',
 'alerte & rebond':'ALERTE_REBOND','alerte-rebond':'ALERTE_REBOND','alerte_rebond':'ALERTE_REBOND',
 'legaltech ohada':'LEGALTECH_OHADA','legaltech-ohada':'LEGALTECH_OHADA','legaltech_ohada':'LEGALTECH_OHADA',
 'conformité & fiscalité':'CONFORMITE_FISCALITE','conformite-fiscalite':'CONFORMITE_FISCALITE','conformite_fiscalite':'CONFORMITE_FISCALITE',
 'deal-connect':'DEAL_CONNECT','deal connect':'DEAL_CONNECT','deal_connect':'DEAL_CONNECT',
 'guichet diaspora':'GUICHET_DIASPORA','guichet-diaspora':'GUICHET_DIASPORA','guichet_diaspora':'GUICHET_DIASPORA'
}

def canon_service(v):
    s=str(v or '').strip().lower()
    return SERVICE_ALIASES.get(s, s.upper().replace(' ','_').replace('-','_'))

def add(f,sev,rule,path,msg,expected=None): f.append({'severity':sev,'rule_id':rule,'path':path,'message':msg,'expected':expected})

def text(d):
    if isinstance(d,str): return d.lower()
    if isinstance(d,dict): return ' '.join(text(v) for v in d.values())
    if isinstance(d,list): return ' '.join(text(v) for v in d)
    return str(d).lower()

def validate_one(d,idx):
    f=[]; p=f'scenarios[{idx}]'
    req=['schema_version','fixture_kind','synthetic','scenario_id','service','archetype','capability_status','state_in','trigger','actors','inputs','controls','dependencies','events','human_decision','state_out','prohibited_states','expected_user_message','audit_events','negative_assertions','qa_assertions','provenance']
    for k in req:
        if k not in d: add(f,'P0','SCN-REQ-001',p+'.'+k,'Required field missing')
    if d.get('schema_version') not in {'2.0','3.0'}: add(f,'P1','SCN-VER-001',p+'.schema_version','New service fixtures should use schema 3.0','3.0')
    if d.get('fixture_kind')!='SERVICE_SCENARIO': add(f,'P0','SCN-KIND-001',p+'.fixture_kind','fixture_kind must be SERVICE_SCENARIO')
    if d.get('synthetic') is not True: add(f,'P0','SCN-SYN-001',p+'.synthetic','Generated scenario must be synthetic')
    if d.get('archetype') not in ALLOWED_ARCH: add(f,'P0','SCN-ARCH-001',p+'.archetype','Invalid archetype',sorted(ALLOWED_ARCH))
    if d.get('capability_status') not in ALLOWED_CAP: add(f,'P1','SCN-CAP-001',p+'.capability_status','Capability status must be explicit',sorted(ALLOWED_CAP))
    if not d.get('negative_assertions'): add(f,'P1','SCN-NEG-001',p+'.negative_assertions','Negative assertions are required')
    if not d.get('audit_events'): add(f,'P1','SCN-AUD-001',p+'.audit_events','Expected audit events are required')
    if d.get('archetype')=='CONTROL_FAILURE' and not d.get('prohibited_states'): add(f,'P0','SCN-FAIL-001',p+'.prohibited_states','Failure scenario must name prohibited success states')
    if d.get('archetype')=='REMEDIATION' and not any(x in text(d) for x in ('remedi','corrig','missing','manquant','rework','hold','pause','review')):
        add(f,'P1','SCN-REM-001',p,'Remediation scenario lacks an observable remediation/rework signal')

    service=canon_service(d.get('service')); t=text(d)
    hd=d.get('human_decision') or {}
    if service=='DEAL_READY':
        if hd.get('required') is not True: add(f,'P0','SCN-DR-001',p+'.human_decision','Deal-Ready requires a human institutional decision')
        auto_states=[str(d.get('state_out','')).upper()] + [str(e.get('result','')).upper() for e in d.get('events',[]) if isinstance(e,dict)]
        if any(x in {'AUTO_CERTIFIED','AUTOMATICALLY_CERTIFIED','CERTIFIED_AUTOMATICALLY'} for x in auto_states):
            add(f,'P0','SCN-DR-002',p,'Scenario contains an automatic certification result state')
    elif service=='DEAL_EXPERTS':
        if not any(x in t for x in ('scope','scop','périmètre','perimetre')): add(f,'P0','SCN-EXP-001',p,'Expert access scope is not explicit')
        if not any(x in t for x in ('expire','expiry','expiration','temporaire','temporary')): add(f,'P1','SCN-EXP-002',p,'Expert access expiry is not explicit')
    elif service=='VDR_QA':
        if not any(x in t for x in ('nda','accord de confidentialité','accord de confidentialite')): add(f,'P0','SCN-VDR-001',p,'VDR scenario lacks NDA/access gate')
    elif service=='ALERTE_REBOND':
        if d.get('archetype')!='NORMAL' and any(x in t for x in ('public search','open search','recherche publique')) and 'not' not in t and 'pas' not in t:
            add(f,'P0','SCN-REB-001',p,'Protected distress scenario must not be open-search content')
    elif service=='LEGALTECH_OHADA':
        if not any(x in t for x in ('drafting aid','aide à la rédaction','aide a la redaction','professional review','revue professionnelle','conseil qualifié','conseil qualifie')):
            add(f,'P0','SCN-LEG-001',p,'LegalTech drafting-aid/professional-review boundary missing')
        if 'employment' in t or 'contrat de travail' in t:
            if 'ohada-compliant' in t or 'conforme ohada' in t: add(f,'P0','SCN-LEG-002',p,'Employment contract must not be presented as governed by an OHADA uniform act')
    elif service=='CONFORMITE_FISCALITE':
        if d.get('archetype')=='CONTROL_FAILURE' and any(x in str(d.get('state_out','')).upper() for x in ('SUCCESS','COMPLETED','CERTIFICATE_ISSUED','FILED')):
            add(f,'P0','SCN-TAX-001',p+'.state_out','Partner/API failure cannot end in a success state')
    elif service=='DEAL_CONNECT':
        if not any(x in t for x in ('consent','accord mutuel','mutual')): add(f,'P1','SCN-CNX-001',p,'Contact/match consent is not explicit')
    elif service=='GUICHET_DIASPORA':
        if d.get('archetype')=='CONTROL_FAILURE' and not any(x in t for x in ('bank','banque','counsel','conseil','authorization','autorisation','repatri','rapatri','fx','change')):
            add(f,'P1','SCN-DIA-001',p,'Cross-border hold lacks bank/counsel/authorization routing')
    return f

def validate(ds):
    f=[]
    if len(ds)!=3: add(f,'P0','TRI-COUNT-001','scenarios',f'Expected exactly 3 scenarios, got {len(ds)}',3)
    arch=[d.get('archetype') for d in ds]
    if set(arch)!=ALLOWED_ARCH: add(f,'P0','TRI-ARCH-001','scenarios','Triplet must contain NORMAL, REMEDIATION and CONTROL_FAILURE exactly once',sorted(ALLOWED_ARCH))
    services={canon_service(d.get('service')) for d in ds}
    if len(services)>1: add(f,'P0','TRI-SVC-001','scenarios','All three scenarios must test the same service',sorted(services))
    ids=[d.get('scenario_id') for d in ds]
    if len(ids)!=len(set(ids)): add(f,'P0','TRI-ID-001','scenarios','Scenario IDs must be unique')
    for i,d in enumerate(ds): f.extend(validate_one(d,i))
    normal=next((d for d in ds if d.get('archetype')=='NORMAL'),None)
    fail=next((d for d in ds if d.get('archetype')=='CONTROL_FAILURE'),None)
    if normal and fail and normal.get('state_out')==fail.get('state_out'):
        add(f,'P0','TRI-STATE-001','scenarios','Normal and failure scenarios must not end in the same state')
    p0=sum(x['severity']=='P0' for x in f); p1=sum(x['severity']=='P1' for x in f); p2=sum(x['severity']=='P2' for x in f)
    return {'status':'FAIL' if p0 else ('PASS_WITH_WARNINGS' if p1 or p2 else 'PASS'),'summary':{'P0':p0,'P1':p1,'P2':p2},'findings':f}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('fixtures',nargs='+'); ap.add_argument('--output')
    a=ap.parse_args(); ds=[json.loads(Path(p).read_text(encoding='utf-8')) for p in a.fixtures]; r=validate(ds)
    txt=json.dumps(r,ensure_ascii=False,indent=2)
    if a.output: Path(a.output).write_text(txt+'\n',encoding='utf-8')
    print(txt); sys.exit(1 if r['status']=='FAIL' else 0)
if __name__=='__main__': main()
