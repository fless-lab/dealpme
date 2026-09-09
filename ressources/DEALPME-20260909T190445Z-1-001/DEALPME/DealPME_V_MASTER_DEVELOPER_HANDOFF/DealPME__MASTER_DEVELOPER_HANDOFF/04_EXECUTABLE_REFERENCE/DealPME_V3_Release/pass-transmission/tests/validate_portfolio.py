import json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'/'validators'; QA.mkdir(parents=True,exist_ok=True)
validators={
 'financial':'/mnt/data/dealpme_skill_v3/skills/dealpme-deal-fixture-architect/scripts/validate_financials.py',
 'content':'/mnt/data/dealpme_skill_v3/skills/dealpme-deal-fixture-architect/scripts/validate_fixture_content.py',
 'disclosure':'/mnt/data/dealpme_skill_v3/skills/dealpme-disclosure-announcement/scripts/check_disclosure.py',
 'fixture_qa':'/mnt/data/dealpme_skill_v3/skills/dealpme-fixture-quality-assurance/scripts/validate_fixture.py',
 'interactions':'/mnt/data/dealpme_skill_v3/skills/dealpme-fixture-quality-assurance/scripts/validate_interactions.py',
}
res=[]
for case_dir in sorted([p for p in ROOT.iterdir() if p.is_dir() and p.name.startswith('PT-')]):
  fixture=case_dir/'data/fixture.v3.json'
  for name,script in validators.items():
    out=QA/f'{case_dir.name}-{name}.json'
    cp=subprocess.run([sys.executable,script,str(fixture),'--output',str(out)],text=True,capture_output=True)
    status='PASS' if cp.returncode==0 else 'FAIL'
    detail=''
    if out.exists():
      try:
        data=json.loads(out.read_text(encoding='utf-8')); detail=data.get('status','')
      except Exception: pass
    res.append({'case_id':case_dir.name,'validator':name,'status':status,'returncode':cp.returncode,'stdout':cp.stdout[-500:],'stderr':cp.stderr[-500:]})
    if cp.returncode: print('FAIL',case_dir.name,name,cp.stdout,cp.stderr)
summary={'status':'PASS' if all(r['status']=='PASS' for r in res) else 'FAIL','validations':res,'passed':sum(r['status']=='PASS' for r in res),'total':len(res),'cases':len(set(r['case_id'] for r in res))}
(QA/'portfolio-validator-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k!='validations'},ensure_ascii=False,indent=2))
if summary['status']!='PASS': sys.exit(1)
