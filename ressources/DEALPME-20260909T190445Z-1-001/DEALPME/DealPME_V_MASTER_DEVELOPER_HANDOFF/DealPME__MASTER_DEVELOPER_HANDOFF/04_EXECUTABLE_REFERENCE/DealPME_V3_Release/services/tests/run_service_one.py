#!/usr/bin/env python3
from pathlib import Path
import json,sys,base64,argparse
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/dealpme_skill_v3/services_v3')
ap=argparse.ArgumentParser(); ap.add_argument('service'); a=ap.parse_args()
logo=(ROOT.parent/'reference_app/assets/dealpme-logo.jpg').read_bytes(); uri='data:image/jpeg;base64,'+base64.b64encode(logo).decode()
results=[]; all_console=[]; all_errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for fp in sorted((ROOT/a.service).glob('*/standalone.html')):
  page=b.new_page(viewport={'width':1365,'height':900}); page.set_default_timeout(1500)
  console=[]; errors=[]; page.on('console',lambda m: console.append(m.text) if m.type=='error' else None); page.on('pageerror',lambda e: errors.append(str(e)))
  sid=fp.parent.name; content=fp.read_text(encoding='utf-8').replace('./assets/dealpme-logo.jpg',uri); tests=[]
  def run(n,fn):
   try: fn(); tests.append({'name':n,'status':'PASS'})
   except Exception as e: tests.append({'name':n,'status':'FAIL','error':str(e)[:500]})
  page.set_content(content,wait_until='domcontentloaded',timeout=5000)
  run('synthetic_banner',lambda: (_ for _ in ()).throw(AssertionError('missing synthetic banner')) if 'SPÉCIMEN SYNTHÉTIQUE' not in page.locator('body').inner_text() else None)
  for c,e in [('TAB_WORKFLOW','Parcours exécutable'),('TAB_CONTROLS','Contrôles clés'),('TAB_EVIDENCE','Preuves attendues'),('TAB_TESTS','Assertions de qualité'),('TAB_OVERVIEW','Situation de test')]:
   run(c,lambda c=c,e=e:(page.locator(f'[data-control-id="{c}"]').first.click(), (_ for _ in ()).throw(AssertionError(e)) if e not in page.locator('#slot').inner_text() else None))
  run('PRIMARY_ACTION',lambda:(page.locator('[data-control-id="PRIMARY_ACTION"]').click(), (_ for _ in ()).throw(AssertionError('modal')) if page.locator('.modalback').count()!=1 else None, page.locator('[data-control-id="MODAL_CLOSE"]').last.click()))
  run('SECONDARY_ACTION',lambda:(page.locator('[data-control-id="SECONDARY_ACTION"]').click(), (_ for _ in ()).throw(AssertionError('modal')) if page.locator('.modalback').count()!=1 else None, page.locator('[data-control-id="MODAL_CLOSE"]').last.click()))
  run('PROFILE_SWITCH',lambda:page.locator('[data-control-id="PROFILE_SWITCH"]').select_option(index=1))
  shot=ROOT/'qa/screenshots'/f'{sid}.png'; shot.parent.mkdir(parents=True,exist_ok=True); page.screenshot(path=str(shot),full_page=False)
  failures=[x for x in tests if x['status']=='FAIL']; results.append({'scenario_id':sid,'status':'FAIL' if failures or errors else 'PASS','tests':tests,'console_errors':console,'page_errors':errors})
  all_console.extend([f'{sid}: {x}' for x in console]); all_errors.extend([f'{sid}: {x}' for x in errors]); print(sid,results[-1]['status'])
  page.close()
 b.close()
out={'service':a.service,'scenarios':len(results),'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'tests_total':sum(len(r['tests']) for r in results),'tests_passed':sum(t['status']=='PASS' for r in results for t in r['tests']),'console_errors':all_console,'page_errors':all_errors,'results':results}
(ROOT/'qa'/f'{a.service}-e2e.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:out[k] for k in ('service','scenarios','passed','failed','tests_total','tests_passed')},ensure_ascii=False))
sys.exit(1 if out['failed'] or all_console or all_errors else 0)
