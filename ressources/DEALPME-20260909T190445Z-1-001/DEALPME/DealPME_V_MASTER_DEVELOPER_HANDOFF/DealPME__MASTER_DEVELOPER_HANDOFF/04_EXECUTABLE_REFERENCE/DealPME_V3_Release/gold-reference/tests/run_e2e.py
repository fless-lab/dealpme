import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

APP = Path(__file__).resolve().parents[1]
QA = APP / 'qa'; QA.mkdir(exist_ok=True)
HTML = (APP / 'standalone.html').read_text(encoding='utf-8')
REG = json.loads((APP/'data/interaction-contract.json').read_text(encoding='utf-8'))
REG_IDS = {x['control_id'] for x in REG['contracts']}
results=[]; console_errors=[]; page_errors=[]

def check(name, ok, detail=''):
    results.append({'name':name,'ok':bool(ok),'detail':str(detail)})
    if not ok: print('FAIL',name,detail)

def modal_code(page):
    loc=page.locator('.modal .notice strong')
    return loc.first.text_content().strip() if loc.count() else None

def visible_controls(page):
    return page.locator('button:visible,a:visible,input:visible,select:visible,textarea:visible').evaluate_all(
        "els => els.map(e => ({tag:e.tagName,id:e.dataset.controlId||'',text:(e.innerText||e.getAttribute('aria-label')||e.placeholder||'').trim()}))")

def audit_ids(page):
    log=page.evaluate('window.__dealpmeAudit || []')
    return log, {x.get('control_id') for x in log if x.get('control_id')}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1440,'height':1100}, device_scale_factor=1)
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    page.set_content(HTML, wait_until='load'); page.wait_for_timeout(250)

    check('page title', 'PT-001' in page.title(), page.title())
    check('synthetic banner visible', page.locator('.demo-banner').is_visible())
    check('six main tabs', page.locator('.tabbtn').count()==6, page.locator('.tabbtn').count())
    controls=visible_controls(page)
    check('initial visible controls all identified', not [x for x in controls if not x['id']], [x for x in controls if not x['id']])
    check('initial visible controls all registered', not [x for x in controls if x['id'] not in REG_IDS], [x for x in controls if x['id'] not in REG_IDS])

    # Global/detail controls
    page.locator('[data-control-id="TOGGLE_FAVORITE"]').click(); check('favorite responds','★ Favori' in page.locator('[data-control-id="TOGGLE_FAVORITE"]').inner_text())
    page.locator('[data-control-id="CONTACT_SELLER"]').click(); check('contact responds','Demande envoyée' in page.locator('[data-control-id="CONTACT_SELLER"]').inner_text())
    page.locator('[data-control-id="NAV_OPPORTUNITIES"]').click(); check('opportunities nav responds','Informations clés' in page.locator('#tabSlot').inner_text())
    for cid in ['NAV_BUYERS','NAV_SERVICES','NAV_RESOURCES','NAV_ABOUT','BACK_TO_OPPORTUNITIES']:
        page.locator(f'[data-control-id="{cid}"]').first.click(); page.wait_for_selector('.modal')
        check(f'{cid} explicit scope state','Hors périmètre' in page.locator('.modal').inner_text())
        page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click()

    # Populated tabs
    expectations={'TAB_FINANCIALS':'Compte de résultat','TAB_TRANSACTION':'Parcours de transaction','TAB_RISKS':'Risques à diligenter','TAB_DOCUMENTS':'Inventaire VDR synthétique','TAB_QA':'Questions & réponses','TAB_OVERVIEW':'Informations clés'}
    for cid,text in expectations.items():
        page.locator(f'[data-control-id="{cid}"]').click(); page.wait_for_timeout(50)
        check(f'{cid} populated', text in page.locator('#tabSlot').inner_text(), page.locator('#tabSlot').inner_text()[:160])

    # Document filtering + viewing + blocked download
    page.locator('[data-control-id="TAB_DOCUMENTS"]').click()
    search=page.locator('[data-control-id="DOCUMENT_SEARCH"]'); search.fill('RCCM'); page.wait_for_timeout(80)
    check('document search responds', page.locator('.doc-row').count()>=1)
    search.fill(''); page.wait_for_timeout(60)
    folder=page.locator('[data-control-id="DOCUMENT_FOLDER_FILTER"]'); opts=folder.locator('option').all()
    if len(opts)>2:
        folder.select_option(index=2); page.wait_for_timeout(80); check('document folder filter responds', page.locator('.doc-row').count()>=1)
    folder.select_option('ALL'); page.wait_for_timeout(80)
    page.locator('[data-control-id="OPEN_DOCUMENT"]').first.click(); page.wait_for_selector('.modal')
    check('document viewer content','DÉMO SYNTHÉTIQUE' in page.locator('.modal').inner_text())
    check('document metadata present','Métadonnées' in page.locator('.modal').inner_text())
    page.locator('.modal [data-control-id="DOWNLOAD_DOCUMENT"]').click(); page.wait_for_timeout(40)
    check('document modal download policy responds','Téléchargement bloqué' in page.locator('.toast-host').inner_text())
    page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click()

    # Q&R filter + input + submit + cancel/close
    page.locator('[data-control-id="TAB_QA"]').click()
    qf=page.locator('[data-control-id="QA_STATUS_FILTER"]'); qf.select_option('OPEN'); page.wait_for_timeout(60); check('Q&A status filter responds', page.locator('.qa-card').count()>=1)
    qf.select_option('ALL')
    before=page.locator('.qa-card').count(); page.locator('[data-control-id="ASK_QUESTION"]').click()
    page.locator('[data-control-id="QUESTION_TEXT_INPUT"]').fill('Question de test E2E : confirmer le mécanisme BFR ?')
    page.locator('[data-control-id="QUESTION_SUBMIT"]').click(); page.wait_for_timeout(80)
    after=page.locator('.qa-card').count(); check('Q&A create interaction',after==before+1,f'{before}->{after}')
    page.locator('[data-control-id="ASK_QUESTION"]').click(); page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click(); check('question modal close responds',page.locator('.modal').count()==0)

    # Transaction controls
    page.locator('[data-control-id="TAB_TRANSACTION"]').click()
    page.locator('[data-control-id="EXPRESS_INTEREST"]').click(); check('interest state changes','Intérêt enregistré' in page.locator('#tabSlot').inner_text())
    page.locator('[data-control-id="REQUEST_MEETING"]').click(); check('meeting state changes','Réunion demandée' in page.locator('#tabSlot').inner_text())

    # VDR access matrix — also exercises DEV_SET_PROFILE and OPEN_VDR repeatedly
    access_expect={'GUEST':'LOGIN_REQUIRED','VERIFIED_BUYER':'QUALIFICATION_REQUIRED','QUALIFIED':'ADMISSION_REQUIRED','ADMITTED':'NDA_REQUIRED','NDA_SIGNED':'T2_GRANT_REQUIRED','REVOKED':'ACCESS_REVOKED'}
    for prof,code in access_expect.items():
        page.locator('#profileSelect').select_option(prof); page.wait_for_timeout(30)
        page.locator('[data-control-id="OPEN_VDR"]').click(); page.wait_for_selector('.modal')
        check(f'VDR gate {prof}',modal_code(page)==code,modal_code(page))
        page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click()

    # Authorized VDR, all visible control families
    page.locator('#profileSelect').select_option('AUTHORIZED'); page.locator('[data-control-id="OPEN_VDR"]').click(); page.wait_for_selector('.vdr-shell')
    check('VDR opens authorized', page.locator('.vdr-shell').is_visible())
    check('VDR folders populated', page.locator('[data-control-id="VDR_SELECT_FOLDER"]').count()==10, page.locator('[data-control-id="VDR_SELECT_FOLDER"]').count())
    vs=page.locator('[data-control-id="VDR_SEARCH"]'); vs.fill('fiscal'); page.wait_for_timeout(80); check('VDR search responds',page.locator('[data-control-id="VDR_SELECT_DOCUMENT"]').count()>=1); vs.fill(''); page.wait_for_timeout(50)
    page.locator('[data-control-id="VDR_SELECT_FOLDER"]').nth(1).click(); page.wait_for_timeout(70); check('VDR folder selection responds',page.locator('[data-control-id="VDR_SELECT_DOCUMENT"]').count()>=1)
    page.locator('[data-control-id="VDR_SELECT_DOCUMENT"]').first.click(); page.wait_for_timeout(70)
    check('VDR viewer contains synthetic doc','DÉMO SYNTHÉTIQUE' in page.locator('#vdrDetail').inner_text())
    # audit every visible control in VDR
    vdr_controls=visible_controls(page)
    check('VDR controls all identified',not [x for x in vdr_controls if not x['id']],[x for x in vdr_controls if not x['id']])
    check('VDR controls all registered',not [x for x in vdr_controls if x['id'] not in REG_IDS],[x for x in vdr_controls if x['id'] not in REG_IDS])
    page.locator('#vdrDetail [data-control-id="DOWNLOAD_DOCUMENT"]').first.click(); page.wait_for_timeout(50); check('download blocked by default','Téléchargement bloqué' in page.locator('.toast-host').inner_text())
    page.locator('#vdrDetail [data-control-id="ASK_QUESTION"]').first.click(); page.wait_for_selector('.modal'); page.locator('.modal [data-control-id="MODAL_CLOSE"]').first.click(); check('VDR Q&R action responds',page.locator('.modal').count()==0)
    page.screenshot(path=str(QA/'pt001-vdr-desktop.png'),full_page=True)
    page.locator('[data-control-id="VDR_BACK"]').click(); page.wait_for_selector('.tabs-wrap')

    # Screenshots
    page.locator('[data-control-id="TAB_OVERVIEW"]').click(); page.screenshot(path=str(QA/'pt001-overview-desktop.png'),full_page=True)
    page.locator('[data-control-id="TAB_FINANCIALS"]').click(); page.screenshot(path=str(QA/'pt001-financials-desktop.png'),full_page=True)

    # Mobile
    mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1); mobile.set_content(HTML,wait_until='load'); mobile.wait_for_timeout(250)
    check('mobile no horizontal body overflow',mobile.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'),f"{mobile.evaluate('document.documentElement.scrollWidth')} / {mobile.evaluate('document.documentElement.clientWidth')}")
    mobile.locator('[data-control-id="TAB_FINANCIALS"]').click(); check('mobile financial tab populated','Compte de résultat' in mobile.locator('#tabSlot').inner_text()); mobile.screenshot(path=str(QA/'pt001-mobile.png'),full_page=True); mobile.close()

    # Final registry and exercise coverage
    controls=visible_controls(page); check('final visible controls all identified',not [x for x in controls if not x['id']],[x for x in controls if not x['id']]); check('final visible controls all registered',not [x for x in controls if x['id'] not in REG_IDS],[x for x in controls if x['id'] not in REG_IDS])
    audit_log,exercised=audit_ids(page)
    missing_exercise=sorted(REG_IDS-exercised)
    check('every registered interaction exercised in runtime',not missing_exercise,missing_exercise)
    coverage={'visible_controls':controls,'exercised':sorted(exercised),'required_exercised':sorted(REG_IDS),'runtime_errors':console_errors+page_errors,'audit_events':audit_log,'registry_count':len(REG_IDS)}
    (QA/'control-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()

summary={'status':'PASS' if all(r['ok'] for r in results) and not console_errors and not page_errors else 'FAIL','tests':results,'console_errors':console_errors,'page_errors':page_errors,'passed':sum(r['ok'] for r in results),'total':len(results)}
(QA/'e2e-results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
if summary['status']!='PASS': sys.exit(1)
