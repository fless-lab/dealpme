#!/usr/bin/env python3
import argparse, importlib.util, json, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('vf',HERE/'validate_fixture.py'); vf=importlib.util.module_from_spec(spec); spec.loader.exec_module(vf)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('root'); ap.add_argument('--output')
    a=ap.parse_args(); root=Path(a.root)
    files=sorted(root.rglob('fixture.json')) if root.is_dir() else [root]
    results=[]; counts={'PASS':0,'PASS_WITH_WARNINGS':0,'FAIL':0}; rules={}
    for p in files:
        try:
            d=json.loads(p.read_text(encoding='utf-8')); r=vf.validate(d); r['file']=str(p); results.append(r); counts[r['status']]+=1
            for x in r['findings']: rules[x['rule_id']]=rules.get(x['rule_id'],0)+1
        except Exception as e:
            r={'file':str(p),'status':'FAIL','summary':{'P0':1,'P1':0,'P2':0},'coverage':{'rule_families_evaluated':[],'count':0},'findings':[{'severity':'P0','rule_id':'PARSE-001','path':'$','message':str(e),'expected':'Valid JSON','recommendation':'Repair fixture JSON.'}]}
            results.append(r); counts['FAIL']+=1; rules['PARSE-001']=rules.get('PARSE-001',0)+1
    out={'root':str(root),'files_checked':len(files),'status':'FAIL' if counts['FAIL'] else ('PASS_WITH_WARNINGS' if counts['PASS_WITH_WARNINGS'] else 'PASS'),'counts':counts,'rule_frequency':dict(sorted(rules.items(),key=lambda kv:(-kv[1],kv[0]))),'results':results}
    txt=json.dumps(out,ensure_ascii=False,indent=2)
    if a.output: Path(a.output).write_text(txt+'\n',encoding='utf-8')
    print(txt); sys.exit(1 if out['status']=='FAIL' else 0)
if __name__=='__main__': main()
