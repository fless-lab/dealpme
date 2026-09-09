#!/usr/bin/env python3
import argparse, json, re
from pathlib import Path

ARCH_BY_SUFFIX={'01':'NORMAL','02':'REMEDIATION','03':'CONTROL_FAILURE'}
CAP_STATUS={
 'deal-ready':'GOVERNED_V0','deal-experts':'FUTURE_TARGET','vdr-qa':'GOVERNED_V0','alerte-rebond':'GOVERNED_V0',
 'legaltech-ohada':'GOVERNED_V0','conformite-fiscalite':'PARTNER_DEPENDENT','deal-connect':'GOVERNED_V0','guichet-diaspora':'GOVERNED_V0'
}

def slug(v): return str(v or '').strip().lower().replace('_','-').replace(' ','-')

def infer_arch(sid,title,status):
    m=re.search(r'(\d\d)$',str(sid or ''))
    if m and m.group(1) in ARCH_BY_SUFFIX: return ARCH_BY_SUFFIX[m.group(1)]
    t=(str(title)+' '+str(status)).lower()
    if any(x in t for x in ('fail','block','refus','outage','conflict','incident','hold')): return 'CONTROL_FAILURE'
    if any(x in t for x in ('remedi','manquant','missing','pause','rework','corrig')): return 'REMEDIATION'
    return 'NORMAL'

def human_decision(service, arch):
    if service=='deal-ready':
        decision='CERTIFIED' if arch=='NORMAL' else ('DEFERRED' if arch=='REMEDIATION' else 'REFUSED_PENDING_RESOLUTION')
        return {'required':True,'owner':'CCI / officier nommé','decision':decision,'evidence':'Décision humaine institutionnelle synthétique'}
    return {'required':False,'owner':'N/A','decision':'N/A','evidence':'Aucune décision humaine institutionnelle requise par ce scénario'}

def prohibited(service,arch):
    if arch!='CONTROL_FAILURE': return []
    if service=='deal-ready': return ['CERTIFIED','AUTO_CERTIFIED']
    if service=='conformite-fiscalite': return ['SUCCESS','FILED','CERTIFICATE_ISSUED']
    if service=='vdr-qa': return ['ACCESS_ACTIVE']
    if service=='deal-experts': return ['EXPERT_ACCESS_ACTIVE']
    return ['SUCCESS','COMPLETED']

def dependencies(service,arch):
    if service=='conformite-fiscalite': return [{'name':'Partenaire fiscal/API','status':'UNAVAILABLE' if arch=='CONTROL_FAILURE' else 'AVAILABLE','required':True,'partner_dependent':True,'fallback':'Procédure partenaire supervisée / état PENDING'}]
    if service=='guichet-diaspora': return [{'name':'Banque/conseil transfrontalier','status':'REVIEW_REQUIRED' if arch=='CONTROL_FAILURE' else 'AVAILABLE','required':arch=='CONTROL_FAILURE','partner_dependent':True,'fallback':'Mise en attente et orientation'}]
    return []

def migrate(d):
    if d.get('schema_version')=='2.0' and d.get('fixture_kind')=='SERVICE_SCENARIO': return d
    service=slug(d.get('service'))
    arch=infer_arch(d.get('scenario_id'),d.get('title'),d.get('status'))
    actors=[]
    for a in d.get('actors',[]): actors.append({'role':str(a),'responsibility':'Intervenir dans le périmètre du scénario','access_scope':'Périmètre minimal nécessaire'})
    inputs=[]
    for x in d.get('inputs',[]): inputs.append({'name':str(x),'status':'AVAILABLE','evidence_status':'SYNTHETIC'})
    controls=[]
    for i,c in enumerate(d.get('controls',[]),1): controls.append({'id':f'CTRL-{i:02d}','severity':'P0' if i==1 else 'P1','rule':str(c),'owner':'Rôle responsable du contrôle','expected_evidence':'Trace d’exécution / décision','blocking':i==1})
    events=[]
    for i,e in enumerate(d.get('expected_events',[]),1): events.append({'seq':i,'type':str(e),'actor':'SYSTEM_OR_ROLE','result':'RECORDED','audit_event':str(e)})
    state_out=str(d.get('status') or d.get('expected_outcome') or 'RECORDED').upper().replace(' ','_')
    if arch=='REMEDIATION' and state_out in ('CERTIFIED','SUCCESS','COMPLETED'): state_out='REMEDIATION_REQUIRED'
    if arch=='CONTROL_FAILURE' and state_out in ('CERTIFIED','SUCCESS','COMPLETED'): state_out='BLOCKED'
    neg=['Ne jamais produire une fausse réussite lorsque le contrôle ou la dépendance bloque le scénario.']
    if service=='deal-ready': neg.append('La certification ne peut pas être automatique.')
    if service=='vdr-qa': neg.append('Aucun accès détaillé sans NDA et autorisation applicables.')
    if service=='legaltech-ohada': neg.append('Le document reste une aide à la rédaction nécessitant revue professionnelle.')
    out={
      'schema_version':'2.0','fixture_kind':'SERVICE_SCENARIO','synthetic':True,
      'scenario_id':d.get('scenario_id'),'service':service,'archetype':arch,'capability_status':CAP_STATUS.get(service,'GOVERNED_V0'),
      'state_in':'REQUEST_CREATED','trigger':d.get('trigger') or d.get('title'),
      'actors':actors,'inputs':inputs,'controls':controls,'dependencies':dependencies(service,arch),'events':events,
      'human_decision':human_decision(service,arch),'state_out':state_out,'prohibited_states':prohibited(service,arch),
      'expected_user_message':d.get('expected_outcome') or d.get('title') or 'État du scénario enregistré.',
      'audit_events':[str(x) for x in d.get('expected_events',[])],
      'negative_assertions':neg,'qa_assertions':d.get('qa_assertions',[]),
      'provenance':{'type':'SYNTHETIC_TEST_DATA','generated_for':'DealPME service fixture migration v2','not_real_case':True,'migration_from':'1.0'}
    }
    # Service-specific control enrichment
    text=(out['trigger']+' '+out['expected_user_message']).lower()
    if service=='deal-experts':
        for a in out['actors']:
            if 'expert' in a['role'].lower(): a['access_scope']='Mandat/dossier/dossiers VDR autorisés uniquement; accès temporaire et expirant'
        out['negative_assertions'].append('Un conflit d’intérêts bloque ou révoque l’accès expert.')
    if service=='vdr-qa':
        out['controls'].append({'id':'VDR-GATE','severity':'P0','rule':'NDA et autorisation avant accès','owner':'Plateforme / cédant','expected_evidence':'NDA + grant journalisés','blocking':True})
    if service=='legaltech-ohada':
        out['controls'].append({'id':'LEG-REVIEW','severity':'P0','rule':'Aide à la rédaction nécessitant revue professionnelle','owner':'Utilisateur / conseil qualifié','expected_evidence':'Version modèle + référence de revue','blocking':False})
    if service=='deal-connect':
        out['controls'].append({'id':'CNX-CONSENT','severity':'P1','rule':'Consentement avant échange de contact','owner':'Participants / plateforme','expected_evidence':'Consentement horodaté','blocking':True})
    return out

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('output')
    a=ap.parse_args(); d=json.loads(Path(a.input).read_text(encoding='utf-8')); out=migrate(d)
    Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print(a.output)
if __name__=='__main__': main()
