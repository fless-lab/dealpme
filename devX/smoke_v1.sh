#!/usr/bin/env bash
# Vérification de fumée des endpoints V1 contre une API démarrée en local (jeu de démonstration chargé).
# Usage : devX/smoke_v1.sh [http://localhost:4000/v1]
set -uo pipefail
API="${1:-http://localhost:4000/v1}"
CRED="${DEMO_CREDENTIALS_FILE:-$(dirname "$0")/../.demo-credentials.local.json}"
CORE_CONTAINER="${SMOKE_CORE_CONTAINER:-dealpme-postgres-core-1}"
REDIS_CONTAINER="${SMOKE_REDIS_CONTAINER:-dealpme-redis-1}"
STORAGE="${S3_ENDPOINT:-http://localhost:9000}"
SMOKE_TMP_DIR=$(mktemp -d)
trap 'rm -rf "$SMOKE_TMP_DIR"' EXIT
curl() { command curl --connect-timeout 5 --max-time 30 "$@"; }
[ -s "$CRED" ] || { echo "Comptes de test absents : $CRED" >&2; exit 1; }
curl -fsS "$API/ready" >/dev/null || { echo "API de test indisponible" >&2; exit 1; }
pw() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$CRED" "$1"; }
ok=0; ko=0
RUN_ID=$(date +%s)   # email unique par exécution : aucun nettoyage nécessaire entre deux passages
NEW_EMAIL="nouveau.cedant.${RUN_ID}@demo.dealpme.local"
check() { # nom, code attendu, code obtenu
  if [ "$2" = "$3" ]; then echo "OK   $1 ($3)"; ok=$((ok+1)); else echo "KO   $1 (attendu $2, obtenu $3)"; ko=$((ko+1)); fi
}
login() { curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"$(pw "$1")\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))'; }
# Les codes se lisent dans les boîtes locales ; aucune réponse API ne les expose.
otp() { node "$(dirname "$0")/notification-inbox.mjs" "$1" "$2"; }
login_mfa() { r=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$1\",\"password\":\"$(pw "$1")\"}"); ch=$(echo "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("challengeId",""))'); code=$(otp sms "$ch"); curl -s -X POST "$API/auth/mfa/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$ch\",\"code\":\"$code\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))'; }

# Le scénario provoque volontairement des échecs de connexion pour éprouver l'anti-force-brute. Les compteurs
# et verrous restent ensuite en place quelques minutes : on les efface avant de commencer, faute de quoi une
# seconde exécution rapprochée échouerait sur des 429 sans que rien ne soit cassé. Développement uniquement.
if command -v docker >/dev/null 2>&1 && docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
  docker exec "$REDIS_CONTAINER" sh -c "redis-cli --scan --pattern 'rl:*' | xargs -r redis-cli del; redis-cli --scan --pattern 'fail:*' | xargs -r redis-cli del; redis-cli --scan --pattern 'lock:*' | xargs -r redis-cli del; redis-cli --scan --pattern 'strikes:*' | xargs -r redis-cli del" >/dev/null 2>&1
fi

echo "== Authentification"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d '{"email":"admin@demo.dealpme.local","password":"mauvais"}')
check "login refusé avec mauvais mot de passe" 401 "$code"
SELLER=$(login cedant.froidroute@demo.dealpme.local); INV=$(login investisseur@demo.dealpme.local); TV=$(login cedant.tropicvale@demo.dealpme.local)
mfa=$(curl -s -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"officier@cci-togo.demo.dealpme.local\",\"password\":\"$(pw officier@cci-togo.demo.dealpme.local)\"}" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("mfaRequired", False), "token" in d)')
check "un officier CCI-Togo reçoit un défi de second facteur, sans session" "True False" "$mfa"
OFF=$(login_mfa officier@cci-togo.demo.dealpme.local)
[ -n "$OFF" ] && check "second facteur validé ouvre la session de l'officier" 1 1 || check "second facteur validé ouvre la session de l'officier" 1 0
reg=$(curl -s -X POST "$API/auth/register" -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"MotDePasseSolide-2026\",\"phoneE164\":\"+22890000001\",\"organisationName\":\"Nouvelle entreprise de fumée\",\"role\":\"SELLER\",\"consents\":{\"termsAccepted\":true,\"privacyAccepted\":true,\"marketingOptIn\":false},\"attribution\":{\"channel\":\"SMOKE\"}}")
chal=$(echo "$reg" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("emailChallengeId",""))'); vcode=$(otp email "$chal")
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$NEW_EMAIL\",\"password\":\"MotDePasseSolide-2026\"}")
check "connexion refusée tant que l'email n'est pas vérifié (403)" 403 "$code"
wrongcode=000000; [ "$vcode" = "$wrongcode" ] && wrongcode=111111
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/email/verify" -H 'content-type: application/json' -d "{\"challengeId\":\"$chal\",\"code\":\"$wrongcode\"}")
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
cid=$(curl -s -X POST "$API/companies" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"legalName":"Entreprise de fumée SARL","legalForm":"SARL","rccmNumber":"TG-LOM-2020-B-0001"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("companyId",""))')
[ -n "$cid" ] && check "création d'entreprise" 1 1 || check "création d'entreprise" 1 0
did=$(curl -s -X POST "$API/deals" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"dealType\":\"ASSET_DEAL\",\"sectorCode\":\"AGRO\",\"regionCode\":\"KARA\",\"turnoverBand\":\"LT_50M\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("dealId",""))')
[ -n "$did" ] && check "création d'un dossier actifs" 1 1 || check "création d'un dossier actifs" 1 0
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$did/transitions" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"to":"CLOSED_REPORTED"}')
check "transition invalide refusée (409)" 409 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$did/transitions" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"to":"PENDING_VERIFICATION"}')
check "un investisseur ne peut pas faire transiter un dossier (403)" 403 "$code"

echo "== Démonstration du blocage RPS"
tvdeal=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'TropicVale%' limit 1")
resp=$(curl -s -X POST "$API/deals/$tvdeal/transitions" -H "authorization: Bearer $TV" -H 'content-type: application/json' -d '{"to":"LISTED_OPEN"}')
codeval=$(echo "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin)["error"]["code"])' 2>/dev/null)
check "publication d'une cession de titres bloquée par PERIMETER_BLOCKED" PERIMETER_BLOCKED "$codeval"

echo "== Sécurité : RLS effective"
tvdeal=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'TropicVale%' limit 1")
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/deals/$tvdeal" -H "authorization: Bearer $SELLER")
check "un cédant ne lit pas le dossier non publié d'un autre cédant (404 par RLS)" 404 "$code"
own=$(curl -s "$API/deals/$tvdeal" -H "authorization: Bearer $TV" | grep -c askingPriceXof)
check "le propriétaire lit son dossier complet, prix inclus" 1 "$own"
frdeal=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select d.id from deal d join company c on c.id=d.company_id where c.legal_name like 'FroidRoute%' limit 1")
invview=$(curl -s "$API/deals/$frdeal" -H "authorization: Bearer $INV")
check "un investisseur lit un dossier publié en projection T0, sans prix" 0 "$(echo "$invview" | grep -c askingPriceXof)"
check "la projection T0 contient bien le secteur" 1 "$(echo "$invview" | grep -c sectorCode)"
role=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select rolbypassrls from pg_roles where rolname='dealpme_api'")
check "le rôle applicatif ne contourne pas la RLS" f "$role"
clear=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select count(*) from deal where asking_price_enc like '%2850000000%' or asking_price_enc not like 'v1:%'")
check "le prix n'est jamais en clair en base (chiffrement applicatif)" 0 "$clear"
price=$(curl -s "$API/deals/$tvdeal" -H "authorization: Bearer $TV" | python3 -c 'import sys,json;print(json.load(sys.stdin)["askingPriceXof"])')
check "le propriétaire obtient le prix déchiffré" 2850000000 "$price"

echo "== Supervision"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health")
check "sonde de vie accessible sans authentification" 200 "$code"
ready=$(curl -s "$API/ready" | python3 -c 'import sys,json;print(json.load(sys.stdin)["ready"])')
check "sonde de disponibilité : bases et Redis joignables" True "$ready"
n=$(curl -s "$API/ready" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["checks"]))')
check "trois dépendances contrôlées" 3 "$n"

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
WEBHOOK_SECRET="${CONNECTOR_REMO_WEBHOOK_SECRET:-$(grep -E "^CONNECTOR_REMO_WEBHOOK_SECRET=" "$(dirname "$0")/../.env" | cut -d= -f2-)}"
sig=$(printf '%s' "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H 'idempotency-key: smoke-remo-1' -H 'x-remo-signature: deadbeef' --data-binary "$payload")
check "webhook Remo avec signature invalide refusé (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "x-remo-signature: $sig" --data-binary "$payload")
check "webhook sans Idempotency-Key refusé (400)" 400 "$code"
before=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select count(*) from audit_event where subject_type='remo_event' and subject_id='evt-1'")
r1=$(curl -s -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "idempotency-key: smoke-remo-replay-$RUN_ID" -H "x-remo-signature: $sig" --data-binary "$payload")
r2=$(curl -s -X POST "$API/webhooks/remo/attendance" -H 'content-type: application/json' -H "idempotency-key: smoke-remo-replay-$RUN_ID" -H "x-remo-signature: $sig" --data-binary "$payload")
check "webhook signé accepté et rejoué à l'identique (idempotence)" "$r1" "$r2"
after=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select count(*) from audit_event where subject_type='remo_event' and subject_id='evt-1'")
check "le rejeu ne produit pas de double effet (un seul événement d'audit en plus)" 1 "$((after - before))"

echo "== Intérêt et évaluation"
first=$(echo "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$first/interests" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"message":"Intéressé par cette opportunité"}')
check "manifestation d'intérêt" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/valuations/indicative" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"dealId\":\"$did\",\"ebitdaXof\":100000000,\"netDebtXof\":20000000}")
check "évaluation indicative" 201 "$code"

echo "== Dossier cédant"
dossier_deal=$(curl -s -X POST "$API/deals" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"dealType\":\"ASSET_DEAL\",\"sectorCode\":\"MANUF\",\"regionCode\":\"KARA\",\"turnoverBand\":\"LT_50M\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["dealId"])')
n=$(curl -s "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["completeness"]["missing"]))')
check "liste des manques d'un dossier vide" 13 "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"to":"PENDING_VERIFICATION"}')
check "un dossier incomplet reste en préparation (409)" 409 "$code"
curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/dossier/facts" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"fieldKey":"TURNOVER","periodLabel":"2025","valueAmountXof":41000000}'
curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/dossier/facts" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"fieldKey":"TURNOVER","periodLabel":"2025","valueAmountXof":43500000,"source":"SUPPORTING_DOCUMENT","note":"Corrigé après liasse fiscale"}'
n=$(curl -s "$API/deals/$dossier_deal/dossier/facts/history?fieldKey=TURNOVER" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["items"]))')
check "une correction crée une version, l'ancienne est conservée" 2 "$n"
printf '%%PDF-1.4\nPiece de fumee.\n%%%%EOF\n' > "$SMOKE_TMP_DIR/piece.pdf"
doc=$(curl -s -X POST "$API/deals/$dossier_deal/dossier/documents" -H "authorization: Bearer $SELLER" -F "category=STATUTS" -F "title=Statuts" -F "file=@$SMOKE_TMP_DIR/piece.pdf;type=application/pdf" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("documentId",""))')
[ -n "$doc" ] && check "dépôt d'une pièce saine" 1 1 || check "dépôt d'une pièce saine" 1 0
python3 -c "import sys;sys.stdout.buffer.write(b'X5O!P%@AP[4\\\\PZX54(P^)7CC)7}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H+H*')" > "$SMOKE_TMP_DIR/eicar.pdf"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/dossier/documents" -H "authorization: Bearer $SELLER" -F "category=RCCM" -F "title=Extrait" -F "file=@$SMOKE_TMP_DIR/eicar.pdf;type=application/pdf")
check "fichier reconnu par l'antivirus refusé (400)" 400 "$code"
rm -f "$SMOKE_TMP_DIR/eicar.pdf"
n=$(curl -s "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["documents"]))')
check "la pièce refusée n'est pas enregistrée" 1 "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/dossier/documents" -H "authorization: Bearer $SELLER" -F "category=RCCM" -F "title=Script" -F "file=@$SMOKE_TMP_DIR/piece.pdf;type=application/x-sh")
check "type de fichier hors liste refusé (400)" 400 "$code"
key=$(docker exec "$CORE_CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select storage_key from deal_document where id='$doc'")
code=$(curl -s -o /dev/null -w '%{http_code}' "$STORAGE/dealpme-dossier/$key")
check "aucun accès public au stockage des pièces (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $INV")
check "un investisseur n'accède pas au dossier d'un cédant (403)" 403 "$code"
for f in ACTIVITY_DESCRIPTION:Menuiserie EMPLOYEE_COUNT:24 TRANSFER_REASON:Retraite ASSETS_DESCRIPTION:Fonds INCLUDES_GOODWILL:Oui; do
  key=${f%%:*}; val=${f##*:}
  curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/dossier/facts" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"fieldKey\":\"$key\",\"valueText\":\"$val\"}"
done
for f in EBITDA:8000000 NET_DEBT:2000000; do
  key=${f%%:*}; val=${f##*:}
  curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/dossier/facts" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d "{\"fieldKey\":\"$key\",\"periodLabel\":\"2025\",\"valueAmountXof\":$val}"
done
for cat in RCCM ETATS_FINANCIERS ATTESTATION_FISCALE INVENTAIRE_ACTIFS; do
  curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/dossier/documents" -H "authorization: Bearer $SELLER" -F "category=$cat" -F "title=Piece $cat" -F "file=@$SMOKE_TMP_DIR/piece.pdf;type=application/pdf"
done
n=$(curl -s "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["completeness"]["missing"]))')
check "dossier complété : plus aucun manque" 0 "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"to":"PENDING_VERIFICATION"}')
check "un dossier complet est soumis à vérification" 200 "$code"
rm -f "$SMOKE_TMP_DIR/piece.pdf"

echo "== Espace CCI-Togo"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{}')
check "un cédant ne peut pas certifier (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Existence, immatriculation et complétude documentaire vérifiées. Ni exactitude financière ni absence de litige.\",\"conflictOfInterestDeclared\":false}")
check "certification refusée sans vérification RCCM préalable (409)" 409 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/registry-verifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"rccmNumber\":\"TG-LOM-2020-B-0001\",\"legalForm\":\"SARL\",\"manualResult\":{\"legalName\":\"Entreprise de fumée SARL\",\"legalForm\":\"SARL\",\"status\":\"ACTIVE\",\"sourceRef\":\"CONSULTATION-DE-FUMEE\"}}")
check "vérification RCCM en mode manuel, source tracée" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Existence, immatriculation et complétude documentaire vérifiées. Ni exactitude financière ni absence de litige.\",\"conflictOfInterestDeclared\":false}")
check "décision de certification nominative par un officier" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Portée de démonstration suffisamment longue.\",\"conflictOfInterestDeclared\":true}")
check "conflit d'intérêts déclaré bloque la décision (400)" 400 "$code"
ready=$(curl -s "$API/institution/certifications/$cid" | python3 -c 'import sys,json;print(json.load(sys.stdin)["isDealReady"])')
check "badge Deal-Ready visible" True "$ready"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/institution/overview" -H "authorization: Bearer $SELLER")
check "un cédant ne voit pas le tableau de bord institutionnel (403)" 403 "$code"
n=$(curl -s "$API/institution/companies" -H "authorization: Bearer $OFF" | python3 -c "import sys,json;d=json.load(sys.stdin);print(sum(1 for i in d['items'] if i['id']=='$cid' and i['registry'] and i['certification']['isDealReady']))")
check "console CCI : déclaré et vérifié présentés séparément" 1 "$n"
n=$(curl -s "$API/institution/companies/$cid" -H "authorization: Bearer $OFF" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["history"]))')
check "historique nominatif des décisions" 1 "$n"
line=$(curl -s "$API/institution/certifications.csv" -H "authorization: Bearer $OFF" | grep -c "$cid" || true)
check "export CSV du journal des certifications" 1 "$line"

echo "== Renvoi en préparation par la CCI-Togo"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"to":"DRAFT"}')
check "renvoi sans motif refusé (400)" 400 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"to":"DRAFT","reason":"Attestation fiscale a reprendre"}')
check "renvoi motivé par un officier" 200 "$code"
st=$(curl -s "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
check "le dossier est effectivement revenu en préparation" DRAFT "$st"
motif=$(curl -s "$API/deals/$dossier_deal/dossier" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("oui" if (d["lastReturn"] or {}).get("reason") else "non")')
check "le cédant lit le motif du renvoi" oui "$motif"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"to":"LISTED_OPEN","reason":"tentative"}')
check "un officier ne fait aucune autre transition (403)" 403 "$code"
curl -s -o /dev/null -X POST "$API/deals/$dossier_deal/transitions" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"to":"PENDING_VERIFICATION"}'

echo "== Place de marché"
teaser=$(curl -s "$API/opportunities/$first")
n=$(echo "$teaser" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len([k for k in d if k in ('askingPriceXof','valuationBasis','companyId','sellerOrganisationId','legalName')]))")
check "fiche T0 en visiteur : aucun champ au-delà de T0" 0 "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/opportunities/$did")
check "un dossier non publié est introuvable en fiche publique (404)" 404 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$first/messages" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"body":"Rappelez-moi au 90 11 22 33"}')
check "message contenant un téléphone refusé (400)" 400 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$first/messages" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"body":"Ecrivez a contact@exemple.tg"}')
check "message contenant un email refusé (400)" 400 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/deals/$first/messages" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"body":"Bonjour, seriez-vous disponible pour un echange la semaine prochaine ?"}')
check "message sans coordonnées accepté" 201 "$code"
n=$(curl -s "$API/deals/$first/messages" -H "authorization: Bearer $TV" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["items"]))')
check "un cédant tiers ne voit aucun message du fil" 0 "$n"
alert=$(curl -s -X POST "$API/alerts" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"label":"Alerte de fumee","sectorCode":"LOGIST"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("alertId",""))')
opt=$(curl -s "$API/alerts" -H "authorization: Bearer $INV" | python3 -c "import sys,json;d=[a for a in json.load(sys.stdin)['items'] if a['id']=='$alert'][0];print(d['notifyOptIn'])")
check "alerte créée sans consentement de notification" False "$opt"
curl -s -o /dev/null -X POST "$API/alerts/$alert/opt-in" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"notifyOptIn":true}'
opt=$(curl -s "$API/alerts" -H "authorization: Bearer $INV" | python3 -c "import sys,json;d=[a for a in json.load(sys.stdin)['items'] if a['id']=='$alert'][0];print(d['notifyOptIn'])")
check "consentement explicite enregistré et daté" True "$opt"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/alerts" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"label":"tentative"}')
check "un cédant ne crée pas d'alerte de repreneur (403)" 403 "$code"
before=$(curl -s "$API/seller/dashboard" -H "authorization: Bearer $SELLER" | python3 -c "import sys,json;d=[x for x in json.load(sys.stdin)['items'] if x['id']=='$first'];print(d[0]['views'] if d else 0)")
curl -s -o /dev/null "$API/opportunities/$first"
after=$(curl -s "$API/seller/dashboard" -H "authorization: Bearer $SELLER" | python3 -c "import sys,json;d=[x for x in json.load(sys.stdin)['items'] if x['id']=='$first'];print(d[0]['views'] if d else 0)")
check "une consultation incrémente le compteur du cédant" 1 "$((after - before))"

echo "== Deal-Ready : liste de contrôle et demande"
n=$(curl -s "$API/companies/$cid/certification" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["checklist"]["criteria"]))')
check "liste de contrôle servie à l'entreprise" 7 "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/companies/$cid/certification" -H "authorization: Bearer $INV")
check "un investisseur n'accède pas à la certification (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/companies/$cid/certification" -H "authorization: Bearer $TV")
check "un autre cédant ne lit pas l'entreprise d'un concurrent (404 par RLS)" 404 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/institution/companies/$cid" -H "authorization: Bearer $TV")
check "la console institutionnelle reste fermée à un cédant (403)" 403 "$code"
req=$(curl -s -X POST "$API/companies/$cid/certification-requests" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"message":"Demande de fumee"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("requestId",""))')
[ -n "$req" ] && check "dépôt d'une demande de certification" 1 1 || check "dépôt d'une demande de certification" 1 0
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/companies/$cid/certification-requests" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{}')
check "demande en double refusée (409)" 409 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certification-requests/$req/remediation" -H "authorization: Bearer $SELLER" -H 'content-type: application/json' -d '{"items":[{"label":"tentative"}]}')
check "un cédant ne demande pas de remédiation (403)" 403 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/institution/certification-requests/$req/remediation" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"items":[{"label":"Attestation fiscale expiree","detail":"Fournir une piece de moins de trois mois"}]}')
check "remédiation nommée par un officier" 200 "$code"
state=$(curl -s "$API/companies/$cid/certification" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["open"]["state"] if d["open"] else "aucune")')
check "l'entreprise voit les compléments demandés" REMEDIATION_REQUIRED "$state"
curl -s -o /dev/null -X POST "$API/institution/certifications" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d "{\"companyId\":\"$cid\",\"decision\":\"GRANTED\",\"scopeStatement\":\"Existence, immatriculation et complétude documentaire vérifiées. Ni exactitude financière ni absence de litige.\",\"conflictOfInterestDeclared\":false}"
open_after=$(curl -s "$API/companies/$cid/certification" -H "authorization: Bearer $SELLER" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("aucune" if d["open"] is None else d["open"]["state"])')
check "la décision clôt la demande en cours" aucune "$open_after"

echo "== Démonstration du scénario RPS"
demo=$(curl -s "$API/demonstration/rps" -H "authorization: Bearer $TV")
n=$(echo "$demo" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len([k for k in d['circleView'] if k in ('companyLegalName','rccmNumber','askingPrice','stakePercent','valuationBasis')]))")
check "la vue T1 du scénario ne contient aucun champ réservé à T2" 0 "$n"
tier=$(echo "$demo" | python3 -c 'import sys,json;print(json.load(sys.stdin)["maxTierWithoutAdmission"])')
check "palier maximal sans admission pour une cession de titres" T0 "$tier"
flag=$(echo "$demo" | python3 -c 'import sys,json;print(json.load(sys.stdin)["shareDealListingEnabled"])')
check "le drapeau de publication des cessions de titres reste fermé" False "$flag"
demo_deal=$(echo "$demo" | python3 -c 'import sys,json;print(json.load(sys.stdin)["deal"]["id"])')
before=$(curl -s "$API/demonstration/rps/$demo_deal/journal" -H "authorization: Bearer $TV" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["audit"]))')
curl -s -o /dev/null -X POST "$API/deals/$demo_deal/transitions" -H "authorization: Bearer $TV" -H 'content-type: application/json' -d '{"to":"LISTED_OPEN"}'
after=$(curl -s "$API/demonstration/rps/$demo_deal/journal" -H "authorization: Bearer $TV" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["audit"]))')
check "le refus laisse une trace dans le journal" 1 "$((after - before))"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/demonstration/rps" -H "authorization: Bearer $INV")
check "un investisseur n'accède pas à la surface de démonstration (403)" 403 "$code"

echo "== Deal-Connect (Remo)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/events")
check "liste des événements publiés" 200 "$code"
eid=$(curl -s -X POST "$API/events" -H "authorization: Bearer $OFF" -H 'content-type: application/json' -d '{"title":"Rencontre B2B de fumée","startsAt":"2026-10-22T09:00:00Z","endsAt":"2026-10-22T12:00:00Z","capacity":50}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("eventId",""))')
[ -n "$eid" ] && check "création d'événement par un officier" 1 1 || check "création d'événement" 1 0
curl -s -o /dev/null -X POST "$API/events/$eid/publish" -H "authorization: Bearer $OFF"
n=$(curl -s "$API/events/managed/$eid" -H "authorization: Bearer $OFF" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(int(d.get("status")=="PUBLISHED" and bool(d.get("remoEventId"))))')
check "publication : la salle du partenaire est créée" 1 "$n"
n=$(curl -s "$API/events" | python3 -c "import sys,json,datetime;d=[e for e in json.load(sys.stdin)['items'] if e['id']=='$eid'][0];now=datetime.datetime.now(datetime.timezone.utc);start=datetime.datetime.fromisoformat(d['startsAt'].replace('Z','+00:00'));end=datetime.datetime.fromisoformat(d['endsAt'].replace('Z','+00:00'));print(d['liveReady']==(start-datetime.timedelta(minutes=15)<=now<end))")
check "accès proposé uniquement dans la fenêtre d'ouverture" True "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/events/$eid/registrations" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"displayName":"Repreneur de fumee","consentContact":false}')
check "inscription à un événement publié" 201 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/events/$eid/registrations" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"displayName":"Repreneur de fumee","consentContact":false}')
check "inscription en double refusée (409)" 409 "$code"
consent=$(curl -s "$API/events" -H "authorization: Bearer $INV" | python3 -c "import sys,json;d=[e for e in json.load(sys.stdin)['items'] if e['id']=='$eid'][0];print(d['myRegistration']['consentContact'])")
check "inscription sans consentement d'échange de contacts" False "$consent"
curl -s -o /dev/null -X POST "$API/events/$eid/contact-consent" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"consentContact":true}'
consent=$(curl -s "$API/events" -H "authorization: Bearer $INV" | python3 -c "import sys,json;d=[e for e in json.load(sys.stdin)['items'] if e['id']=='$eid'][0];print(d['myRegistration']['consentContact'])")
check "consentement donné explicitement" True "$consent"
curl -s -o /dev/null -X POST "$API/events/$eid/contact-consent" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"consentContact":false}'
consent=$(curl -s "$API/events" -H "authorization: Bearer $INV" | python3 -c "import sys,json;d=[e for e in json.load(sys.stdin)['items'] if e['id']=='$eid'][0];print(d['myRegistration']['consentContact'])")
check "consentement retiré aussi simplement qu'il est donné" False "$consent"
n=$(curl -s "$API/events" | python3 -c "import sys,json;d=[e for e in json.load(sys.stdin)['items'] if e['id']=='$eid'][0];print('myRegistration' in d and d['myRegistration'] is None)")
check "un visiteur ne voit aucune inscription nominative" True "$n"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/events/diaspora/appointments" -H "authorization: Bearer $INV" -H 'content-type: application/json' -d '{"requestedSlot":"2026-10-01T10:00:00Z","crossBorderNoticeAcknowledged":false}')
check "rendez-vous diaspora refusé sans avis transfrontalier (400)" 400 "$code"

echo; echo "Résultat : $ok OK, $ko KO"
[ "$ko" -eq 0 ]
