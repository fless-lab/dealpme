#!/usr/bin/env python3
from pathlib import Path
import json, sys, base64
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/dealpme_skill_v3/services_v3')
shots=ROOT/'qa/screenshots'; shots.mkdir(parents=True,exist_ok=True)
results=[]

def assert_true(cond,msg):
    if not cond: raise AssertionError(msg)

logo=(ROOT.parent/'reference_app/assets/dealpme-logo.jpg').read_bytes()
logo_uri='data:image/jpeg;base64,'+base64.b64encode(logo).decode()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1365,'height':900},device_scale_factor=1)
    console_errors=[]; page_errors=[]
    page.on('console',lambda m: console_errors.append(m.text) if m.type=='error' else None)
    page.on('pageerror',lambda e: page_errors.append(str(e)))
    for fp in sorted(ROOT.glob('*/*/standalone.html')):
        sid=fp.parent.name; service=fp.parent.parent.name; tests=[]
        content=fp.read_text(encoding='utf-8').replace('./assets/dealpme-logo.jpg',logo_uri)
        def load(): page.set_content(content,wait_until='domcontentloaded',timeout=10000)
        def run(name,fn):
            try: fn(); tests.append({'name':name,'status':'PASS'})
            except Exception as e: tests.append({'name':name,'status':'FAIL','error':str(e)})
        load()
        run('synthetic_banner',lambda: assert_true('SPÉCIMEN SYNTHÉTIQUE' in page.locator('body').inner_text(),'missing synthetic banner'))
        for control,expect in [('TAB_WORKFLOW','Parcours exécutable'),('TAB_CONTROLS','Contrôles clés'),('TAB_EVIDENCE','Preuves attendues'),('TAB_TESTS','Assertions de qualité'),('TAB_OVERVIEW','Situation de test')]:
            def make(c=control,e=expect):
                def f():
                    page.locator(f'[data-control-id="{c}"]').first.click(timeout=3000)
                    assert_true(e in page.locator('#slot').inner_text(),f'{c} did not render {e}')
                return f
            run(control.lower(),make())
        def primary():
            page.locator('[data-control-id="PRIMARY_ACTION"]').click(timeout=3000); assert_true(page.locator('.modalback').count()==1,'primary modal missing')
            page.locator('[data-control-id="MODAL_CLOSE"]').last.click(timeout=3000); assert_true(page.locator('.modalback').count()==0,'modal did not close')
        run('primary_action',primary)
        def secondary():
            page.locator('[data-control-id="SECONDARY_ACTION"]').click(timeout=3000); assert_true(page.locator('.modalback').count()==1,'secondary modal missing')
            page.locator('[data-control-id="MODAL_CLOSE"]').last.click(timeout=3000)
        run('secondary_action',secondary)
        def profile():
            sel=page.locator('[data-control-id="PROFILE_SWITCH"]'); sel.select_option(index=1,timeout=3000); assert_true(sel.input_value()!='','profile selection failed')
        run('profile_switch',profile)
        shot=shots/f'{sid}.png'; page.screenshot(path=str(shot),full_page=False)
        page.set_viewport_size({'width':390,'height':844}); load()
        def mobile():
            overflow=page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 2')
            assert_true(not overflow,'mobile horizontal overflow')
            page.locator('[data-control-id="TAB_WORKFLOW"]').click(timeout=3000); assert_true('Parcours exécutable' in page.locator('#slot').inner_text(),'mobile tab failed')
        run('mobile',mobile)
        page.set_viewport_size({'width':1365,'height':900})
        failures=[t for t in tests if t['status']=='FAIL']
        results.append({'scenario_id':sid,'service':service,'status':'FAIL' if failures else 'PASS','tests':tests,'screenshot':str(shot.relative_to(ROOT))})
        print(sid,'PASS' if not failures else f'FAIL {len(failures)}')
    browser.close()
summary={'scenarios':len(results),'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'tests_total':sum(len(r['tests']) for r in results),'tests_passed':sum(t['status']=='PASS' for r in results for t in r['tests']),'console_errors':console_errors,'page_errors':page_errors,'results':results}
(ROOT/'qa/service-e2e-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:summary[k] for k in ('scenarios','passed','failed','tests_total','tests_passed')},ensure_ascii=False))
sys.exit(1 if summary['failed'] or console_errors or page_errors else 0)
