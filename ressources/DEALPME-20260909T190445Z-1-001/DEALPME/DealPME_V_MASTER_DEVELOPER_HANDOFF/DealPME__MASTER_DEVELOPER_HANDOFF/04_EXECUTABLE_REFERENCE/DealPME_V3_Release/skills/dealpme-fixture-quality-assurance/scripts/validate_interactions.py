#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
MANDATORY={'TAB_OVERVIEW','TAB_FINANCIALS','TAB_TRANSACTION','TAB_RISKS','TAB_DOCUMENTS','TAB_QA','OPEN_VDR'}
SENSITIVE_ACTIONS={'OPEN_VDR','OPEN_DOCUMENT','DOWNLOAD_DOCUMENT','REQUEST_CONTACT','EXPRESS_INTEREST','REQUEST_MEETING','ASK_QUESTION','SUBMIT_QUESTION','SELECT_DOCUMENT'}
REQ_PROFILES={'GUEST','VERIFIED_BUYER','QUALIFIED','ADMITTED','NDA_SIGNED','AUTHORIZED','REVOKED'}
def add(f,s,r,p,m):f.append({'severity':s,'rule_id':r,'path':p,'message':m})
def vdr_result(p):
 if p.get('revoked'): return 'ACCESS_REVOKED'
 if not p.get('authenticated'): return 'LOGIN_REQUIRED'
 if not p.get('qualified'): return 'QUALIFICATION_REQUIRED'
 if not p.get('admitted'): return 'ADMISSION_REQUIRED'
 if not p.get('nda_executed'): return 'NDA_REQUIRED'
 if not p.get('t2_granted'): return 'T2_GRANT_REQUIRED'
 if not p.get('seller_approved'): return 'SELLER_APPROVAL_REQUIRED'
 return 'VDR_HOME'
def validate(d):
 f=[];cs=d.get('interaction_contracts',[]);ids=[c.get('control_id') for c in cs]
 if not cs:add(f,'P0','INT-REG-001','interaction_contracts','No interaction contracts')
 for dup in {x for x in ids if x and ids.count(x)>1}:add(f,'P0','INT-REG-002',dup,'Duplicate control ID')
 for x in MANDATORY-set(ids):add(f,'P0','INT-REG-003','interaction_contracts',f'Missing mandatory control {x}')
 for c in cs:
  cid=c.get('control_id','control')
  for k in ('surface','label','action','target','required_profile','success_state','audit_event'):
   if not c.get(k):add(f,'P0','INT-REG-004',cid,f'Missing {k}')
  if c.get('action') in SENSITIVE_ACTIONS and not c.get('audit_event'):add(f,'P0','INT-AUD-001',cid,'Sensitive action lacks audit event')
 profiles=d.get('interaction_profiles',{})
 for x in REQ_PROFILES-set(profiles):add(f,'P0','INT-PRO-001','interaction_profiles',f'Missing profile {x}')
 expected={'GUEST':'LOGIN_REQUIRED','VERIFIED_BUYER':'QUALIFICATION_REQUIRED','QUALIFIED':'ADMISSION_REQUIRED','ADMITTED':'NDA_REQUIRED','NDA_SIGNED':'T2_GRANT_REQUIRED','AUTHORIZED':'VDR_HOME','REVOKED':'ACCESS_REVOKED'}
 for k,out in expected.items():
  if k in profiles and vdr_result(profiles[k])!=out:add(f,'P0','INT-VDR-001',k,f'VDR gate result {vdr_result(profiles[k])}, expected {out}')
 docs=d.get('documents',[]);docids={x.get('document_id') for x in docs}
 for q in d.get('qa_threads',[]):
  if q.get('document_id') not in docids:add(f,'P0','INT-REF-001',q.get('qa_id','qa'),'Q&R references missing document')
 for r in d.get('risk_register',[]):
  for doc in r.get('evidence',[]):
   if doc not in docids:add(f,'P0','INT-REF-002',r.get('risk_id','risk'),f'Risk references missing document {doc}')
 audit=set(d.get('expected_audit_events',[]))
 for c in cs:
  if c.get('audit_event') and c['audit_event'] not in audit:add(f,'P1','INT-AUD-002',c.get('control_id','control'),f"Audit event {c['audit_event']} not listed in expected_audit_events")
 p0=sum(x['severity']=='P0' for x in f);p1=sum(x['severity']=='P1' for x in f);p2=sum(x['severity']=='P2' for x in f)
 return {'status':'FAIL' if p0 else ('PASS_WITH_WARNINGS' if p1 or p2 else 'PASS'),'summary':{'P0':p0,'P1':p1,'P2':p2},'registered_controls':len(ids),'findings':f}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('--output');a=ap.parse_args();d=json.loads(Path(a.fixture).read_text(encoding='utf-8'));r=validate(d);txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if r['status']=='FAIL' else 0)
if __name__=='__main__':main()
