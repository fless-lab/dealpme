#!/usr/bin/env bash
# Éprouve une sauvegarde : restaure la base core dans une base jetable et compare les décomptes.
# Ne touche jamais la base de travail. C'est le contrôle qui distingue une sauvegarde d'un fichier.
#
#   bash devX/restore-test.sh backups/20261002-120000
set -euo pipefail

SRC="${1:?Indiquez le dossier de sauvegarde, par exemple backups/20261002-120000}"
DUMP="$SRC/core.dump"
[ -f "$DUMP" ] || { echo "Sauvegarde introuvable : $DUMP" >&2; exit 1; }

CONTAINER=dealpme-postgres-core-1
SCRATCH="restore_test_$(date +%s)"

echo "Vérification des empreintes"
( cd "$SRC" && sha256sum --quiet -c SHA256SUMS ) && echo "  empreintes conformes"

echo "Restauration dans la base jetable $SCRATCH"
docker exec "$CONTAINER" psql -U dealpme_core -d postgres -q -c "CREATE DATABASE $SCRATCH" >/dev/null
trap 'docker exec "$CONTAINER" psql -U dealpme_core -d postgres -q -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null' EXIT
docker exec -i "$CONTAINER" pg_restore -U dealpme_core -d "$SCRATCH" --no-owner --no-privileges < "$DUMP" 2>/dev/null || true

status=0
for table in organisation app_user company deal deal_document declared_fact certification audit_event; do
  live=$(docker exec "$CONTAINER" psql -U dealpme_core -d dealpme_core -tAc "select count(*) from $table" 2>/dev/null || echo "-")
  back=$(docker exec "$CONTAINER" psql -U dealpme_core -d "$SCRATCH" -tAc "select count(*) from $table" 2>/dev/null || echo "-")
  if [ "$live" = "$back" ]; then
    printf "  OK   %-18s %s lignes\n" "$table" "$back"
  else
    printf "  ECART %-17s base %s, sauvegarde %s\n" "$table" "$live" "$back"
    status=1
  fi
done

if [ $status -eq 0 ]; then
  echo "Restauration conforme : la sauvegarde est exploitable."
else
  echo "Restauration non conforme : la sauvegarde ne reflète pas la base." >&2
fi
exit $status
