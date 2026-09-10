#!/usr/bin/env bash
# Décompresse les références de design (Tranche 3, design system v1.0, cas d'or PT-001) dans design/ (ignoré par git)
# et affiche le portail de revue à ouvrir dans un navigateur.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/ressources/DEALPME-20260909T190445Z-1-001/DEALPME/DealPME_V_MASTER_DEVELOPER_HANDOFF"
DST="$ROOT/design"
mkdir -p "$DST"
unzip -q -o "$SRC/DealPME_Production_Tranche_3_Component_Responsive_Prototype_System.zip" -d "$DST/tranche3"
unzip -q -o "$SRC/Dealpme Design/DealPME_Enterprise_Design_System_v1_0_COMPLETE.zip" -d "$DST/system-v1"
unzip -q -o "$SRC/Dealpme Design/DealPME_PT001_Gold_Journey_Refined_V2.zip" -d "$DST/pt001-gold"
unzip -q -o "$SRC/DealPME_7_Services_Enterprise_Redesign.zip" -d "$DST/site-public"
echo "Références extraites dans $DST"
find "$DST" -maxdepth 3 -iname "*PORTAL*.html" -o -maxdepth 3 -iname "PROTOTYPE_HUB.html" | sed "s|^|  ouvrir : |"
