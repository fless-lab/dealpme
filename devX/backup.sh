#!/usr/bin/env bash
# Sauvegarde des trois bases et des objets stockés. Une exécution produit un dossier horodaté et complet :
# les bases en format personnalisé (restauration sélective possible), les objets en copie miroir.
#
#   bash devX/backup.sh [destination]        destination par défaut : ./backups
#
# La restauration se vérifie avec devX/restore-test.sh, qui rejoue la sauvegarde dans une base jetable
# et compare les décomptes. Une sauvegarde jamais restaurée n'est pas une sauvegarde.
set -euo pipefail

DEST="${1:-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/$STAMP"
mkdir -p "$OUT"

echo "Sauvegarde dans $OUT"

# --- bases de données. Chaque base a son conteneur et son rôle propriétaire.
for entry in "core:dealpme-postgres-core-1:dealpme_core" "vdr:dealpme-postgres-vdr-1:dealpme_vdr" "rps:dealpme-postgres-rps-1:dealpme_rps"; do
  name="${entry%%:*}"; rest="${entry#*:}"; container="${rest%%:*}"; role="${rest##*:}"
  if docker exec "$container" pg_isready -U "$role" >/dev/null 2>&1; then
    docker exec "$container" pg_dump -U "$role" -d "$role" -Fc > "$OUT/$name.dump"
    printf "  base %-5s %s\n" "$name" "$(du -h "$OUT/$name.dump" | cut -f1)"
  else
    echo "  base $name : conteneur indisponible, sauvegarde ignorée" >&2
  fi
done

# --- objets stockés (pièces des dossiers, data room, identité).
if docker ps --format '{{.Names}}' | grep -q '^dealpme-minio-1$'; then
  mkdir -p "$OUT/objets"
  docker run --rm --network host -v "$(cd "$OUT/objets" && pwd):/sortie" --entrypoint /bin/sh minio/mc:latest -c "
    mc alias set local http://localhost:9000 \${MINIO_USER:-dealpme} \${MINIO_PASSWORD:-dealpme-secret} >/dev/null &&
    for b in dealpme-dossier dealpme-vdr dealpme-identity; do mc mirror --quiet --overwrite local/\$b /sortie/\$b || true; done" >/dev/null
  printf "  objets      %s\n" "$(du -sh "$OUT/objets" | cut -f1)"
fi

# --- empreintes : une sauvegarde altérée doit se voir.
( cd "$OUT" && find . -type f ! -name SHA256SUMS -exec sha256sum {} + > SHA256SUMS )
echo "Terminé. Empreintes dans $OUT/SHA256SUMS"
echo "Restauration à éprouver : bash devX/restore-test.sh $OUT"
