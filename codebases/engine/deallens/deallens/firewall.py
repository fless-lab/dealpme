"""Pare-feu de divulgation de DealLens (V5).

Contrat : la récupération de passages ne voit jamais un document hors de l'ensemble autorisé.
L'ensemble autorisé est calculé AVANT toute requête d'index et son empreinte est journalisée
avec la réponse (AI_QUERY_COMPLETED). Aucun appel réseau ici : fonctions pures, testables.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field


@dataclass(frozen=True)
class AccessContext:
    person_id: str
    authenticated: bool
    qualified: bool
    admitted: bool
    nda_signed: bool
    t2_granted: bool
    revoked: bool
    clean_team: bool
    folder_ids: frozenset[str] = field(default_factory=frozenset)
    ai_allowed: bool = False


@dataclass(frozen=True)
class DocumentRef:
    document_id: str
    version_id: str
    folder_id: str
    clean_team: bool
    status: str  # PUBLISHED | SUPERSEDED | REVOKED | ...


def is_authorized(ctx: AccessContext) -> bool:
    """Profil AUTHORIZED de la matrice d'états d'accès ; la révocation l'emporte sur tout."""
    if ctx.revoked or not ctx.authenticated:
        return False
    return ctx.qualified and ctx.admitted and ctx.nda_signed and ctx.t2_granted and ctx.ai_allowed


def authorized_documents(ctx: AccessContext, documents: list[DocumentRef]) -> list[DocumentRef]:
    """Filtre strict : dossier autorisé, version publiée, Clean Team seulement si le contexte l'accorde."""
    if not is_authorized(ctx):
        return []
    out = []
    for d in documents:
        if d.status != "PUBLISHED":
            continue
        if d.folder_id not in ctx.folder_ids:
            continue
        if d.clean_team and not ctx.clean_team:
            continue
        out.append(d)
    return out


def scope_hash(docs: list[DocumentRef]) -> str:
    """Empreinte de l'ensemble autorisé, journalisée avec chaque réponse (permission_scope_hash)."""
    material = "|".join(sorted(f"{d.document_id}:{d.version_id}" for d in docs))
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def citations_are_authorized(citations: list[tuple[str, str]], docs: list[DocumentRef]) -> bool:
    """Chaque citation (document_id, version_id) doit appartenir à l'ensemble autorisé (test AI-01, AI-03)."""
    allowed = {(d.document_id, d.version_id) for d in docs}
    return all(c in allowed for c in citations)
