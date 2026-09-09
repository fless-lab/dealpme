#!/usr/bin/env python3
import json,sys
p=sys.argv[1]; d=json.load(open(p,encoding='utf-8')); errs=[]
ids={x.get('document_id') for x in d.get('documents',[])}
for i in d.get('intelligence',[]):
    for e in i.get('evidence',[]):
        if e.get('document_id') not in ids: errs.append(f"bad citation {i.get('document_id')}->{e.get('document_id')}")
        if not e.get('page') or not e.get('anchor'): errs.append('citation missing page/anchor '+str(i.get('document_id')))
print(json.dumps({'status':'PASS' if not errs else 'FAIL','errors':errs},ensure_ascii=False,indent=2)); sys.exit(1 if errs else 0)
