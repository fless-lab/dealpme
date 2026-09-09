#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
MANDATORY={'TAB_OVERVIEW','TAB_FINANCIALS','TAB_TRANSACTION','TAB_RISKS','TAB_DOCUMENTS','TAB_QA','OPEN_VDR'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('--output');a=ap.parse_args();d=json.loads(Path(a.fixture).read_text(encoding='utf-8'));f=[]
 cs=d.get('interaction_contracts',[]);ids=[c.get('control_id') for c in cs];dup={x for x in ids if ids.count(x)>1}
 for x in dup:f.append({'severity':'P0','rule_id':'UI-INT-001','message':f'Duplicate control ID {x}'})
 for x in MANDATORY-set(ids):f.append({'severity':'P0','rule_id':'UI-INT-002','message':f'Missing mandatory control {x}'})
 for c in cs:
  miss=[k for k in ('control_id','surface','label','action','target','required_profile','success_state','audit_event') if not c.get(k)]
  if miss:f.append({'severity':'P0','rule_id':'UI-INT-003','message':f"{c.get('control_id')}: missing {miss}"})
 p0=sum(x['severity']=='P0' for x in f);r={'status':'FAIL' if p0 else 'PASS','summary':{'P0':p0},'findings':f,'registered_controls':len(ids)};txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if p0 else 0)
if __name__=='__main__':main()
