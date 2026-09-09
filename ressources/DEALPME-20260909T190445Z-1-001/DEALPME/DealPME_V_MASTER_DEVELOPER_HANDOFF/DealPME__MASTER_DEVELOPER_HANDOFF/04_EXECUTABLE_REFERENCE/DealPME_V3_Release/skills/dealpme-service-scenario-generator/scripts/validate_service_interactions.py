#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixtures',nargs='+');ap.add_argument('--output');a=ap.parse_args();find=[]
 for fp in a.fixtures:
  d=json.loads(Path(fp).read_text(encoding='utf-8'));cs=d.get('interaction_contracts',[])
  if not cs:find.append({'severity':'P0','rule_id':'SCN-INT-001','file':fp,'message':'No interaction contracts'})
  for c in cs:
   miss=[k for k in ('control_id','surface','label','action','target','required_profile','success_state','audit_event') if not c.get(k)]
   if miss:find.append({'severity':'P0','rule_id':'SCN-INT-002','file':fp,'message':f"{c.get('control_id')}: missing {miss}"})
  if d.get('archetype')=='CONTROL_FAILURE':
   prohibited=set(d.get('prohibited_states',[]));success={c.get('success_state') for c in cs}
   if not prohibited:find.append({'severity':'P0','rule_id':'SCN-INT-003','file':fp,'message':'Failure scenario lacks prohibited states'})
 p0=sum(x['severity']=='P0' for x in find);r={'status':'FAIL' if p0 else 'PASS','summary':{'P0':p0},'findings':find};txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if p0 else 0)
if __name__=='__main__':main()
