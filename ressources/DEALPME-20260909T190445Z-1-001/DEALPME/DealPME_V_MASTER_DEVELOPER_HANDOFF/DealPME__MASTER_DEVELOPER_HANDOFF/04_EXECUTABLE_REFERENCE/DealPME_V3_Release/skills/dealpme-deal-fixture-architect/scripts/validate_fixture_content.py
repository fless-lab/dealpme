#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
REQ_ROOT=['transaction_workspace','risk_register','documents','qa_threads','interaction_profiles','interaction_contracts','interaction_rules','expected_audit_events','evidence_ledger','ui_copy_contract']
REQ_TABS={'TAB_OVERVIEW','TAB_FINANCIALS','TAB_TRANSACTION','TAB_RISKS','TAB_DOCUMENTS','TAB_QA','OPEN_VDR'}
REQ_PROFILES={'GUEST','VERIFIED_BUYER','QUALIFIED','ADMITTED','NDA_SIGNED','AUTHORIZED','REVOKED'}
def add(f,s,r,p,m): f.append({'severity':s,'rule_id':r,'path':p,'message':m})
def validate(d,base=None):
 f=[]
 if d.get('schema_version')!='3.0': add(f,'P1','CNT-VER-001','schema_version','Golden v3 fixtures should use schema 3.0')
 for k in REQ_ROOT:
  if not d.get(k): add(f,'P0','CNT-ROOT-001',k,'Required v3 content is missing or empty')
 risks=d.get('risk_register',[]); docs=d.get('documents',[]); qa=d.get('qa_threads',[])
 if len(risks)<6: add(f,'P1','CNT-RISK-001','risk_register','Robust Pass Transmission fixture should contain at least 6 structured risks')
 if len(docs)<10: add(f,'P1','CNT-DOC-001','documents','Golden fixture should populate the diligence corpus, not only rows')
 if len(qa)<6: add(f,'P1','CNT-QA-001','qa_threads','Golden fixture should contain a meaningful Q&R corpus')
 docids={x.get('document_id') for x in docs}
 folders=set(d.get('vdr',{}).get('folders',[])); used={x.get('folder') for x in docs}
 for folder in folders-used: add(f,'P1','CNT-DOC-002','documents',f'VDR folder has no test document: {folder}')
 for x in docs:
  if not x.get('synthetic'): add(f,'P0','CNT-DOC-003',x.get('document_id','document'),'Synthetic document is not marked synthetic')
  if x.get('folder') not in folders: add(f,'P0','CNT-DOC-004',x.get('document_id','document'),'Document references unknown VDR folder')
  if base and x.get('file_path') and not x.get('content'):
   fp=Path(x['file_path'])
   candidates=[base/fp, base.parent/fp]
   if not any(c.exists() for c in candidates): add(f,'P0','CNT-DOC-005',x.get('document_id','document'),'Document has neither existing file nor embedded content')
 for q in qa:
  if q.get('document_id') not in docids: add(f,'P0','CNT-QA-002',q.get('qa_id','qa'),'Q&R links to unknown document')
 for r in risks:
  if not r.get('evidence'): add(f,'P1','CNT-RISK-002',r.get('risk_id','risk'),'Risk has no evidence link')
  for doc in r.get('evidence',[]):
   if doc not in docids: add(f,'P0','CNT-RISK-003',r.get('risk_id','risk'),f'Risk links to unknown document {doc}')
 ids={c.get('control_id') for c in d.get('interaction_contracts',[])}
 for x in REQ_TABS-ids: add(f,'P0','CNT-INT-001','interaction_contracts',f'Missing mandatory control {x}')
 prof=set(d.get('interaction_profiles',{}))
 for x in REQ_PROFILES-prof: add(f,'P0','CNT-INT-002','interaction_profiles',f'Missing access profile {x}')
 for c in d.get('interaction_contracts',[]):
  for k in ('control_id','surface','label','action','target','required_profile','success_state','audit_event'):
   if not c.get(k): add(f,'P0','CNT-INT-003',c.get('control_id','control'),f'Missing interaction field {k}')
 p0=sum(x['severity']=='P0' for x in f);p1=sum(x['severity']=='P1' for x in f);p2=sum(x['severity']=='P2' for x in f)
 return {'status':'FAIL' if p0 else ('PASS_WITH_WARNINGS' if p1 or p2 else 'PASS'),'summary':{'P0':p0,'P1':p1,'P2':p2},'findings':f}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('--output');a=ap.parse_args();p=Path(a.fixture);d=json.loads(p.read_text(encoding='utf-8'));r=validate(d,p.parent);txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if r['status']=='FAIL' else 0)
if __name__=='__main__':main()
