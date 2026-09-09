#!/usr/bin/env python3
import argparse,copy,json,sys
from pathlib import Path

def mutate(d,kind):
 x=copy.deepcopy(d)
 if kind=='balance':x['financials']['balance_sheet'][-1]['total_assets']+=1
 elif kind=='t1_leak':x['disclosure']['T1']['data']['company']=x['master']['company']
 elif kind=='auto_cert':x['deal_ready']['human_decision_required']=False
 elif kind=='vdr_gate':x['vdr']['nda_required']=False
 elif kind=='admin_access':x['access_model']['admin_confidential_default']=True
 elif kind=='unregister_control':x['interaction_contracts']=[c for c in x['interaction_contracts'] if c.get('control_id')!='OPEN_VDR']
 elif kind=='broken_qa_ref':x['qa_threads'][0]['document_id']='MISSING-DOC'
 elif kind=='live_fixture':x['synthetic']=False
 elif kind=='valuation_claim':x.setdefault('ui_copy_contract',{})['asking_disclaimer']='Valorisation DealPME recommandée'
 return x

def main():
 ap=argparse.ArgumentParser();ap.add_argument('fixture');ap.add_argument('output_dir');a=ap.parse_args();d=json.loads(Path(a.fixture).read_text(encoding='utf-8'));out=Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)
 kinds=['balance','t1_leak','auto_cert','vdr_gate','admin_access','unregister_control','broken_qa_ref','live_fixture','valuation_claim'];manifest=[]
 for k in kinds:
  p=out/f'{k}.json';p.write_text(json.dumps(mutate(d,k),ensure_ascii=False,indent=2),encoding='utf-8');manifest.append({'mutation':k,'file':str(p)})
 (out/'mutation-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
