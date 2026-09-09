#!/usr/bin/env python3
import json,sys
p=sys.argv[1]; d=json.load(open(p,encoding='utf-8')); errs=[]
req=['documents','risks','qa','intelligence','coverage','evidence','access','deallens']
for k in req:
    if k not in d: errs.append(f'missing {k}')
if d.get('synthetic') is False: errs.append('reference fixture must be synthetic')
ids={x.get('document_id') for x in d.get('documents',[])}
for i in d.get('intelligence',[]):
    if i.get('document_id') not in ids: errs.append('orphan intelligence '+str(i.get('document_id')))
    if not i.get('evidence'): errs.append('missing AI evidence '+str(i.get('document_id')))
if not d.get('access',{}).get('clean_team',{}).get('ai_inherits_scope',False): errs.append('clean team AI scope not enforced')
if not d.get('deallens',{}).get('policy',{}).get('permission_filter_before_retrieval',False): errs.append('permission filter before retrieval not enforced')
print(json.dumps({'status':'PASS' if not errs else 'FAIL','errors':errs},ensure_ascii=False,indent=2)); sys.exit(1 if errs else 0)
