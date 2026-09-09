import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa'; (QA/'screenshots').mkdir(parents=True,exist_ok=True)
results=[]

def check(case_id,name,ok,detail=''):
    results.append({'case_id':case_id,'name':name,'ok':bool(ok),'detail':str(detail)})
    if not ok: print('FAIL',case_id,name,detail)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--allow-file-access-from-files'])
    for case_dir in sorted([x for x in ROOT.iterdir() if x.is_dir() and x.name.startswith('PT-')]):
        case_id=case_dir.name
        fixture=json.loads((case_dir/'data/fixture.v3.json').read_text(encoding='utf-8'))
        html=(case_dir/'standalone.html').read_text(encoding='utf-8')
        registry=json.loads((case_dir/'data/interaction-contract.json').read_text(encoding='utf-8'))
        reg_ids={c['control_id'] for c in registry['contracts']}
        console=[]; page_errors=[]
        page=browser.new_page(viewport={'width':1365,'height':900})
        page.on('console',lambda msg,arr=console: arr.append(msg.text) if msg.type=='error' else None)
        page.on('pageerror',lambda err,arr=page_errors: arr.append(str(err)))
        page.set_content(html,wait_until='load'); page.wait_for_timeout(120)
        check(case_id,'title',case_id in page.title(),page.title())
        check(case_id,'synthetic banner',page.locator('.demo-banner').is_visible())
        check(case_id,'six tabs',page.locator('.tabbtn').count()==6,page.locator('.tabbtn').count())
        # all main tabs populate meaningful content
        expected={'TAB_OVERVIEW':'Informations clés','TAB_FINANCIALS':'Compte de résultat','TAB_TRANSACTION':'Parcours de transaction','TAB_RISKS':'Risques à diligenter','TAB_DOCUMENTS':'Inventaire VDR synthétique','TAB_QA':'Questions & réponses'}
        for cid,text in expected.items():
            page.locator(f'[data-control-id="{cid}"]').click(); page.wait_for_timeout(20)
            check(case_id,f'{cid} populated',text in page.locator('#tabSlot').inner_text(),page.locator('#tabSlot').inner_text()[:100])
        # documents have real synthetic content
        page.locator('[data-control-id="TAB_DOCUMENTS"]').click(); page.wait_for_timeout(20)
        check(case_id,'document rows >= 28',page.locator('.doc-row').count()>=28,page.locator('.doc-row').count())
        page.locator('[data-control-id="OPEN_DOCUMENT"]').first.click(); page.wait_for_selector('.modal')
        check(case_id,'document viewer synthetic','DÉMO SYNTHÉTIQUE' in page.locator('.modal').inner_text())
        page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click()
        # Q&A prepopulated
        page.locator('[data-control-id="TAB_QA"]').click(); page.wait_for_timeout(20)
        check(case_id,'Q&A >= 10',page.locator('.qa-card').count()>=10,page.locator('.qa-card').count())
        # VDR gate and authorized path
        page.locator('#profileSelect').select_option('GUEST'); page.locator('[data-control-id="OPEN_VDR"]').click(); page.wait_for_selector('.modal')
        check(case_id,'guest VDR blocked','LOGIN_REQUIRED' in page.locator('.modal').inner_text())
        page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click()
        page.locator('#profileSelect').select_option('AUTHORIZED'); page.locator('[data-control-id="OPEN_VDR"]').click(); page.wait_for_selector('.vdr-shell')
        check(case_id,'authorized VDR opens',page.locator('.vdr-shell').is_visible())
        check(case_id,'VDR folders 10',page.locator('[data-control-id="VDR_SELECT_FOLDER"]').count()==10,page.locator('[data-control-id="VDR_SELECT_FOLDER"]').count())
        check(case_id,'VDR docs visible',page.locator('[data-control-id="VDR_SELECT_DOCUMENT"]').count()>=1,page.locator('[data-control-id="VDR_SELECT_DOCUMENT"]').count())
        # visible controls have IDs and are registered
        visible=page.locator('button:visible,a:visible,input:visible,select:visible,textarea:visible').evaluate_all("els => els.map(e => ({id:e.dataset.controlId||'',text:(e.innerText||e.placeholder||'').trim()}))")
        missing_id=[x for x in visible if not x['id']]
        unregistered=[x for x in visible if x['id'] and x['id'] not in reg_ids]
        check(case_id,'visible controls identified',not missing_id,missing_id)
        check(case_id,'visible controls registered',not unregistered,unregistered)
        page.screenshot(path=str(QA/'screenshots'/f'{case_id}-vdr.png'),full_page=True)
        page.close()
        # mobile smoke
        mob=browser.new_page(viewport={'width':390,'height':844})
        mob.set_content(html,wait_until='load'); mob.wait_for_timeout(80)
        overflow=mob.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
        check(case_id,'mobile no horizontal overflow',overflow,f"{mob.evaluate('document.documentElement.scrollWidth')}/{mob.evaluate('document.documentElement.clientWidth')}")
        mob.close()
        check(case_id,'runtime errors absent',not console and not page_errors,console+page_errors)
    browser.close()

cases=sorted(set(r['case_id'] for r in results))
case_status={c: all(r['ok'] for r in results if r['case_id']==c) for c in cases}
summary={'status':'PASS' if all(case_status.values()) else 'FAIL','cases':case_status,'passed_cases':sum(case_status.values()),'total_cases':len(cases),'passed_tests':sum(r['ok'] for r in results),'total_tests':len(results),'tests':results}
(QA/'portfolio-smoke-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k!='tests'},ensure_ascii=False,indent=2))
if summary['status']!='PASS': sys.exit(1)
