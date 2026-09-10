#!/usr/bin/env bash
# Vérification de fumée des endpoints V1 contre une API démarrée en local (jeu de démonstration chargé).
# Usage : devX/smoke_v1.sh [http://localhost:4000/v1]
set -u
API="${1:-http://localhost:4000/v1}"
CRED="$(dirname "$0")/../.demo-credentials.local.json"
pw() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$CRED" "$1"; }
ok=0; ko=0
RUN_ID=$(date +%s)   # email unique par exécution : aucun nettoyage nécessaire entre deux passages
NEW_EMAIL="nouveau.cedant.${RUN_ID}@demo.dealpme.local"
check() { # nom, code attendu, code obtenu
  if [ "$2" = "$3" ]; then echo "OK   $1 ($3)"; ok=$((ok+1)); else echo "KO   $1 (attendu $2, obtenu $3)"; ko=$((ko+1)); fi
}
login() { curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"$(pw "$1")\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))'; }
# Connexion d'un rôle à second facteur obligatoire : le code n'est renvoyé (devCode) qu'en développement.
login_mfa() { r=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"$(pw "$1")\"}"); ch=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("challengeId",""))'); code=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("devCode",""))'); curl -s -X POST "$API/auth/mfa/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$ch\",\"code\":\"$code\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))'; }

echo "== Authentification"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"admin@demo.dealpme.local","password":"mauvais"}')
check "login refusé avec mauvais mot de passe" 401 "$code"
SELLER=$(login cedant.froidroute@demo.dealpme.local); INV=$(login investisseur@demo.dealpme.local); TV=$(login cedant.tropicvale@demo.dealpme.local)
mfa=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"officier@cci-togo.demo.dealpme.local\",\"password\":\"$(pw officier@cci-togo.demo.dealpme.local)\"}" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("mfaRequired", False), "token" in d)')
check "un officier CCI-Togo reçoit un défi de second facteur, sans session" "True False" "$mfa"
OFF=$(login_mfa officier@cci-togo.demo.dealpme.local)
[ -n "$OFF" ] && check "second facteur validé ouvre la session de l'officier" 1 1 || check "second facteur validé ouvre la session de l'officier" 1 0
reg=$(curl -s -X POST "$API/auth/register" -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"MotDePasseSolide-2026\",\"phoneE164\":\"+22890000001\",\"organisationName\":\"Nouvelle entreprise de fumée\",\"role\":\"SELLER\",\"consents\":{\"termsAccepted\":true,\"privacyAccepted\":true,\"marketingOptIn\":false},\"attribution\":{\"channel\":\"SMOKE\"}}")
chal=$(echo "$reg" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("emailChallengeId",""))'); vcode=$(echo "$reg" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("devCode",""))')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"MotDePasseSolide-2026\"}")
check "connexion refusée tant que l'email n'est pas vérifié (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/email/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$chal\",\"code\":\"000000\"}")
check "code de vérification faux refusé (401)" 401 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/email/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$chal\",\"code\":\"$vcode\"}")
check "vérification d'email avec le bon code" 200 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/email/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$chal\",\"code\":\"$vcode\"}")
check "un code déjà consommé est refusé (401)" 401 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"MotDePasseSolide-2026\"}")
check "connexion possible après vérification de l'email" 200 "$code"
[ -n "$SELLER" ] && check "login cédant" 1 1 || check "login cédant" 1 0

echo "== Sessions et profil"
me=$(curl -s "$API/me" -H "authorization: Bearer $INV" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("email",""))')
check "profil du compte connecté" investisseur@demo.dealpme.local "$me"
ns=$(curl -s "$API/auth/sessions" -H "authorization: Bearer $INV" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(sum(1 for s in d["items"] if s["current"]))')
check "la session courante figure dans la liste des appareils" 1 "$ns"
TMP=$(login investisseur@demo.dealpme.local)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/sessions/logout" -H "authorization: Bearer $TMP")
check "déconnexion" 204 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/me" -H "authorization: Bearer $TMP")
check "un jeton déconnecté est refusé (401)" 401 "$code"

echo "== Marketplace (T0 uniquement)"
body=$(curl -s "$API/opportunities?limit=10"); code=$?
n=$(echo "$body" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))')
check "liste des opportunités renvoie des cessions d'actifs" 3 "$n"
leak=$(echo "$body" | grep -c 'askingPrice\|companyLegalName\|valuationBasis')
check "aucun champ T2 dans la liste (DISCLOSURE_LEAK)" 0 "$leak"

echo "== Dossier cédant"
cid=$(curl -s -X POST "$API/companies" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"legalName":"Entreprise de fumée SARL","legalForm":"SARL"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("companyId",""))')
[ -n "$cid" ] && check "création d'entreprise" 1 1 || check "création d'entreprise" 1 0
did=$(curl -s -X POST "$API/deals" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"dealType\":\"ASSET_DEAL\",\"sectorCode\":\"AGRO\",\"regionCode\":\"KARA\",\"turnoverBand\":\"LT_50M\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("dealId",""))')
[ -n "$did" ] && check "création d'un dossier actifs" 1 1 || check "création d'un dossier actifs" 1 0
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$did/transitions" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"to":"CLOSED_REPORTED"}')
check "transition invalide refusée (409)" 409 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$did/transitions" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"to":"PENDING_VERIFICATION"}')
check "un investisseur ne peut pas faire transiter un dossier (403)" 403 "$code"

echo "== Démonstration du blocage RPS"
tvdeal=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'TropicVale%' limit 1")
resp=$(curl -s -X POST "$API/deals/$tvdeal/transitions" -H "authorization: Bearer $TV" -H 'content-type: application/json' -d '{"to":"LISTED_OPEN"}')
codeval=$(echo "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["error"]["code"])' 2>/dev/null)
check "publication d'une cession de titres bloquée par PERIMETER_BLOCKED" PERIMETER_BLOCKED "$codeval"

echo "== Sécurité : RLS effective"
tvdeal=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'TropicVale%' limit 1")
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/deals/$tvdeal" -H "authorization: Bearer $SELLER")
check "un cédant ne lit pas le dossier non publié d'un autre cédant (404 par RLS)" 404 "$code"
own=$(curl -s "$API/deals/$tvdeal" -H "authorization: Bearer $TV" | grep -c askingPriceXof)
check "le propriétaire lit son dossier complet, prix inclus" 1 "$own"
frdeal=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'FroidRoute%' limit 1")
invview=$(curl -s "$API/deals/$frdeal" -H "authorization: Bearer $INV")
check "un investisseur lit un dossier publié en projection T0, sans prix" 0 "$(echo "$invview" | grep -c askingPriceXof)"
check "la projection T0 contient bien le secteur" 1 "$(echo "$invview" | grep -c sectorCode)"
role=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select rolbypassrls from pg_roles where rolname='dealpme_api'")
check "le rôle applicatif ne contourne pas la RLS" f "$role"
clear=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select count(*) from deal where asking_price_enc like '%2850000000%' or asking_price_enc not like 'v1:%'")
check "le prix n'est jamais en clair en base (chiffrement applicatif)" 0 "$clear"
price=$(curl -s "$API/deals/$tvdeal" -H "authorization: Bearer $TV" | python3 -c 'import sys,json;print(json.load(sys.stdin)["askingPriceXof"])')
check "le propriétaire obtient le prix déchiffré" 2850000000 "$price"

echo "== Sécurité : force brute, en-têtes, CORS, webhooks"
for i in 1 2 3 4 5 6; do last=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"force@demo.dealpme.local","password":"mauvais"}'); done
check "sixième échec de connexion sur un compte renvoie 429" 429 "$last"
hdr=$(curl -s -D - -o /dev/null "$API/events" | grep -ciE "content-security-policy|x-content-type-options|referrer-policy")
check "en-têtes de sécurité présents (CSP, nosniff, referrer)" 3 "$hdr"
cors=$(curl -s -D - -o /dev/null "$API/events" -H "Origin: https://site-inconnu.example" | grep -ci "access-control-allow-origin")
check "origine inconnue sans en-tête CORS" 0 "$cors"
big=$(python3 -c 'print("{\"x\":\"" + "a"*1100000 + "\"}")' | curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' --data-binary @-)
check "corps de requête au-delà de 1 Mo refusé" 413 "$big"
payload='{"events":[{"remoEventId":"evt-1","externalUserId":"u-1","joinedAt":"2026-10-22T09:05:00Z"}]}'
WEBHOOK_SECRET=$(grep -E "^CONNECTOR_REMO_WEBHOOK_SECRET=" "$(dirname "$0")/../.env" | cut -d= -f2-)
sig=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H 'idempotency-key: smoke-remo-1' -H 'x-remo-signature: deadbeef' --data-binary "$payload")
check "webhook Remo avec signature invalide refusé (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "x-remo-signature: $sig" --data-binary "$payload")
check "webhook sans Idempotency-Key refusé (400)" 400 "$code"
before=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select count(*) from audit_event where subject_type='remo_event' and subject_id='evt-1'")
r1=$(curl -s -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "idempotency-key: smoke-remo-replay-$RUN_ID" -H "x-remo-signature: $sig" --data-binary "$payload")
r2=$(curl -s -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "idempotency-key: smoke-remo-replay-$RUN_ID" -H "x-remo-signature: $sig" --data-binary "$payload")
check "webhook signé accepté et rejoué à l'identique (idempotence)" "$r1" "$r2"
after=$(docker exec dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -tAc "select count(*) from audit_event where subject_type='remo_event' and subject_id='evt-1'")
check "le rejeu ne produit pas de double effet (un seul événement d'audit en plus)" 1 "$((after - before))"

echo "== Intérêt et évaluation"
first=$(echo "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$first/interests" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"message":"Intéressé par cette opportunité"}')
check "manifestation d'intérêt" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/valuations/indicative" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"dealId\":\"$did\",\"ebitdaXof\":100000000,\"netDebtXof\":20000000}")
check "évaluation indicative" 201 "$code"

echo "== Espace CCI-Togo"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{}')
check "un cédant ne peut pas certifier (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Existence, immatriculation et complétude documentaire vérifiées. Ni exactitude financière ni absence de litige.\",\"conflictOfInterestDeclared\":false}")
check "décision de certification nominative par un officier" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Portée de démonstration suffisamment longue.\",\"conflictOfInterestDeclared\":true}")
check "conflit d'intérêts déclaré bloque la décision (400)" 400 "$code"
ready=$(curl -s "$API/institution/certifications/$cid" | python3 -c 'import sys,json;print(json.load(sys.stdin)["isDealReady"])')
check "badge Deal-Ready visible" True "$ready"

echo "== Deal-Connect (Remo)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/events")
check "liste des événements publiés" 200 "$code"
eid=$(curl -s -X POST "$API/events" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"title":"Rencontre B2B de fumée","startsAt":"2026-10-22T09:00:00Z","endsAt":"2026-10-22T12:00:00Z","capacity":50}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("eventId",""))')
[ -n "$eid" ] && check "création d'événement par un officier" 1 1 || check "création d'événement" 1 0
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/events/diaspora/appointments" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"requestedSlot":"2026-10-01T10:00:00Z","crossBorderNoticeAcknowledged":false}')
check "rendez-vous diaspora refusé sans avis transfrontalier (400)" 400 "$code"

echo; echo "Résultat : $ok OK, $ko KO"
[ "$ko" -eq 0 ]
