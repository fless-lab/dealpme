from deallens.firewall import AccessContext, DocumentRef, authorized_documents, citations_are_authorized, is_authorized


def ctx(**kw):
    base = dict(person_id="p1", authenticated=True, qualified=True, admitted=True, nda_signed=True, t2_granted=True, revoked=False, clean_team=False, folder_ids=frozenset({"f1"}), ai_allowed=True)
    base.update(kw)
    return AccessContext(**base)


DOCS = [
    DocumentRef("d1", "v1", "f1", False, "PUBLISHED"),
    DocumentRef("d2", "v1", "f1", True, "PUBLISHED"),   # Clean Team
    DocumentRef("d3", "v1", "f2", False, "PUBLISHED"),  # autre dossier
    DocumentRef("d4", "v1", "f1", False, "REVOKED"),
]


def test_revocation_wins():
    assert not is_authorized(ctx(revoked=True))
    assert authorized_documents(ctx(revoked=True), DOCS) == []


def test_clean_team_and_folder_isolation():
    ids = [d.document_id for d in authorized_documents(ctx(), DOCS)]
    assert ids == ["d1"]
    ids_ct = [d.document_id for d in authorized_documents(ctx(clean_team=True), DOCS)]
    assert ids_ct == ["d1", "d2"]


def test_citations_must_be_in_scope():
    docs = authorized_documents(ctx(), DOCS)
    assert citations_are_authorized([("d1", "v1")], docs)
    assert not citations_are_authorized([("d2", "v1")], docs)
