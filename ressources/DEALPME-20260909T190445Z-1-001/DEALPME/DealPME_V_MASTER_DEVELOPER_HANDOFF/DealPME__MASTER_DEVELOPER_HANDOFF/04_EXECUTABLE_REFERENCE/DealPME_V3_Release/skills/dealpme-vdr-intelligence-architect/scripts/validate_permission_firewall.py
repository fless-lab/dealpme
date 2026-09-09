#!/usr/bin/env python3
import json,sys
p=sys.argv[1]; d=json.load(open(p,encoding='utf-8')); pol=d.get('deallens',{}).get('policy',{}); errs=[]
checks=['permission_filter_before_retrieval','citation_required','read_only','clean_team_isolation','revocation_propagates_to_ai']
for c in checks:
    if pol.get(c) is not True: errs.append('policy '+c+' must be true')
ct=d.get('access',{}).get('clean_team',{})
if ct.get('policy')!='NAMED_USERS_ONLY': errs.append('clean team must be named users only')
print(json.dumps({'status':'PASS' if not errs else 'FAIL','errors':errs},ensure_ascii=False,indent=2)); sys.exit(1 if errs else 0)
