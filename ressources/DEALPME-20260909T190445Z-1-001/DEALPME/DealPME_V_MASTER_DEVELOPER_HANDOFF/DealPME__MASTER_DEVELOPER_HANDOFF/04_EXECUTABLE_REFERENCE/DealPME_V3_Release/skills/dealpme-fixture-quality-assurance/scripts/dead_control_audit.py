#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
# coverage format: {visible_controls:[{control_id,...}], exercised:[control_id...], runtime_errors:[]}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('registry');ap.add_argument('coverage');ap.add_argument('--output');a=ap.parse_args();reg=json.loads(Path(a.registry).read_text(encoding='utf-8'));cov=json.loads(Path(a.coverage).read_text(encoding='utf-8'));ids={x['control_id'] for x in reg.get('contracts',[])};f=[]
 for x in cov.get('visible_controls',[]):
  cid=x.get('control_id') or x.get('id')
  if not cid:f.append({'severity':'P0','rule_id':'DEAD-001','message':f"Visible control lacks ID: {x}"})
  elif cid not in ids:f.append({'severity':'P0','rule_id':'DEAD-002','message':f'Visible control not registered: {cid}'})
 for cid in cov.get('required_exercised',[]):
  if cid not in set(cov.get('exercised',[])):f.append({'severity':'P0','rule_id':'DEAD-003','message':f'Required control not exercised: {cid}'})
 for e in cov.get('runtime_errors',[]):f.append({'severity':'P0','rule_id':'DEAD-004','message':f'Runtime error: {e}'})
 p0=len(f);r={'status':'FAIL' if p0 else 'PASS','summary':{'P0':p0},'findings':f};txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if p0 else 0)
if __name__=='__main__':main()
