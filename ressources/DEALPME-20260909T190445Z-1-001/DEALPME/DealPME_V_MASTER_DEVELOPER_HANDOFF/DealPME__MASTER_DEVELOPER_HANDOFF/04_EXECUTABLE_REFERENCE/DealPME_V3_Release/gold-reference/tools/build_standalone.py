#!/usr/bin/env python3
import json,re
from pathlib import Path
APP=Path(__file__).resolve().parents[1]
fixture=json.loads((APP/'data/pt001.fixture.v3.json').read_text(encoding='utf-8'))
documents=json.loads((APP/'data/documents.json').read_text(encoding='utf-8'))
risks=json.loads((APP/'data/risks.json').read_text(encoding='utf-8'))
qa=json.loads((APP/'data/q-and-a.json').read_text(encoding='utf-8'))
interaction=json.loads((APP/'data/interaction-contract.json').read_text(encoding='utf-8'))
for d in documents:
    fp=d.get('file_path')
    if fp:
        p=APP/fp
        if p.exists(): d['content']=p.read_text(encoding='utf-8')
embed='window.__DEALPME_DATA__ = '+json.dumps({'fixture':fixture,'documents':documents,'risks':risks,'qa':qa,'interaction':interaction},ensure_ascii=False,separators=(',',':'))+';\n'
(APP/'data/embed.js').write_text(embed,encoding='utf-8')
css=(APP/'styles.css').read_text(encoding='utf-8')
js=(APP/'app.js').read_text(encoding='utf-8')
case=fixture['case_id']
html=f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>DealPME · {case} · Référence interactive</title><style>{css}</style></head><body><div id="app"></div><script>window.__FORCE_DEV__=true;{embed}</script><script>{js}</script></body></html>'''
(APP/'standalone.html').write_text(html,encoding='utf-8')
# keep index title in sync
idx=(APP/'index.html').read_text(encoding='utf-8')
idx=re.sub(r'<title>.*?</title>',f'<title>DealPME · {case} · Référence interactive</title>',idx)
(APP/'index.html').write_text(idx,encoding='utf-8')
print(APP/'standalone.html')
