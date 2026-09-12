#!/usr/bin/env bash
# Remet la pile locale à zéro et la recharge : conteneurs, migrations, politiques de sécurité, jeu de démonstration.
# Efface toutes les données locales, y compris les pièces déposées. Destiné au développement uniquement.
#
#   bash devX/reset.sh
#
# À la fin, l'API et le service RPS ne sont pas démarrés : voir les commandes affichées.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Fichier .env absent : copiez .env.example puis renseignez les secrets." >&2; exit 1; }
grep -q "^NODE_ENV=production" .env && { echo "Refus : NODE_ENV=production dans .env." >&2; exit 1; }

echo "1/6  Compilation (avant toute réinitialisation des données)"
npm run build:libs
npm run build -w codebases/backend/api -w codebases/engine/rps -w codebases/devtools/sms-inbox
node --env-file=.env -e 'require("./codebases/backend/api/dist/config/env.js").loadEnv()'

echo "2/6  Arrêt et effacement des volumes"
docker compose -f infra/docker-compose.yml --profile local down -v

echo "3/6  Démarrage de la pile"
docker compose -f infra/docker-compose.yml --profile local up -d --build >/dev/null
for c in core vdr rps; do
  printf "      base %s" "$c"
   for _ in $(seq 1 60); do docker exec "dealpme-postgres-$c-1" pg_isready -U "dealpme_$c" >/dev/null 2>&1 && break; printf "."; sleep 1; done
   docker exec "dealpme-postgres-$c-1" pg_isready -U "dealpme_$c" >/dev/null
  echo " prête"
done
printf "      antivirus"
for _ in $(seq 1 60); do docker exec dealpme-clamav-1 clamdcheck.sh >/dev/null 2>&1 && break; printf "."; sleep 5; done
docker exec dealpme-clamav-1 clamdcheck.sh
echo " prêt"

set -a; . ./.env; set +a

echo "4/6  Migrations"
npm run db:migrate -w codebases/backend/api >/dev/null
(cd codebases/backend/api && npx drizzle-kit migrate --config drizzle.vdr.config.ts >/dev/null)
npm run db:migrate -w codebases/engine/rps >/dev/null

echo "5/6  Politiques de sécurité au niveau des lignes"
docker exec -i dealpme-postgres-core-1 psql -U dealpme_core -d dealpme_core -q -v ON_ERROR_STOP=1 < codebases/backend/api/drizzle/core/rls.sql >/dev/null

echo "6/6  Jeu de démonstration"
npm run db:seed -w codebases/backend/api

echo
echo "Pile prête. Démarrage :"
echo "  (cd codebases/backend/api && node --env-file=../../../.env dist/main.js)"
echo "  (cd codebases/engine/rps && node --env-file=../../../.env dist/main.js)"
echo "  npm run dev -w codebases/frontend/web"
echo "Comptes et mots de passe : .demo-credentials.local.json"
