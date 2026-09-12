#!/usr/bin/env bash
set -euo pipefail
exec node "$(dirname "${BASH_SOURCE[0]}")/backup.mjs" restore "${1:?Dossier de sauvegarde requis}"
