#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
REQ=['fixture','interaction_registry','access_state_matrix','implementation_standard','release_gate','runtime_results','screenshots']
def main():
 ap=argparse.ArgumentParser();ap.add_argument('manifest');ap.add_argument('--output');a=ap.parse_args();d=json.loads(Path(a.manifest).read_text(encoding='utf-8'));f=[];base=Path(a.manifest).parent
 for k in REQ:
  if k not in d:f.append({'severity':'P0','rule_id':'REF-MAN-001','message':f'Missing manifest field {k}'})
 def paths(v):
  if isinstance(v,str):yield v
  elif isinstance(v,list):
   for x in v:yield from paths(x)
  elif isinstance(v,dict):
   for x in v.values():yield from paths(x)
 for k in REQ:
  if k in d:
   for p in paths(d[k]):
    if p and not p.startswith('http') and not (base/p).exists():f.append({'severity':'P0','rule_id':'REF-MAN-002','message':f'Missing referenced artifact {p}'})
 p0=len(f);r={'status':'FAIL' if p0 else 'PASS','summary':{'P0':p0},'findings':f};txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt);(Path(a.output).write_text(txt+'\n',encoding='utf-8') if a.output else None);sys.exit(1 if p0 else 0)
if __name__=='__main__':main()
