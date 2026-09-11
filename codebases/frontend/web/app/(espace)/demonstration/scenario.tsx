"use client";

import { useState } from "react";
import { Actions, Button, DecisionGate, Panel, PermissionLens, StateBanner, StatusBadge } from "@dealpme/ui";

interface ScenarioState {
  deal: { id: string; status: string; visibility: string; dealType: string };
  circle: { disclosureCount: number; cap: number; admissionRequired: boolean };
  maxTierWithoutAdmission: string;
  publicView: Record<string, unknown>;
  circleView: Record<string, unknown>;
  withheldAtT1: string[];
  shareDealListingEnabled: boolean;
}

interface JournalEntry {
  id: string;
  action: string;
  outcome: string;
  occurredAt: string;
  metadata: Record<string, unknown> | null;
  actorEmail: string | null;
}

const FIELD_LABEL: Record<string, string> = {
  id: "Identifiant du dossier",
  dealType: "Type de cession",
  sectorCode: "Secteur",
  regionCode: "Région",
  turnoverBand: "Tranche de chiffre d'affaires",
  isDealReady: "Certification Deal-Ready",
  disclosureTier: "Palier de divulgation",
  anonymisedSummary: "Résumé anonymisé",
  employeesBand: "Effectif (tranche)",
  yearsInOperation: "Ancienneté",
  financialProfileBands: "Profil financier (tranches)",
  transferRestrictionsPresent: "Présence de clauses d'agrément",
};

const ACTION_LABEL: Record<string, string> = {
  DEAL_CREATED: "Dossier créé",
  DEAL_TRANSITION: "Changement d'état",
  DEAL_PUBLICATION_BLOCKED: "Publication refusée par le périmètre réglementaire",
  CERTIFICATION_DECIDED: "Décision de certification",
  REGISTRY_VERIFIED: "Vérification au registre",
};

function render(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).join(", ");
  return String(value);
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

/**
 * Déroulé en trois temps : ce que voit un tiers, ce que verrait un membre admis, ce qui se passe quand on
 * tente de publier. La tentative appelle l'endpoint réel de transition : le refus affiché est celui du serveur.
 */
export function Scenario({ state }: { state: ScenarioState }) {
  const [attempt, setAttempt] = useState<{ code: string; message: string; details?: Record<string, unknown> } | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  async function tryPublish() {
    setBusy(true);
    const res = await fetch(`/api/marketplace/deals/${state.deal.id}/publish`, { method: "POST" });
    const data = (await res.json()) as { ok: boolean; code?: string; message?: string; details?: Record<string, unknown> };
    setBusy(false);
    setAttempt(
      data.ok
        ? { code: "ACCEPTÉ", message: "La publication a été acceptée : le drapeau de publication des cessions de titres est ouvert, ce qui ne devrait pas être le cas en V1." }
        : { code: data.code ?? "INTERNAL", message: data.message ?? "Refus sans message", ...(data.details ? { details: data.details } : {}) },
    );
    await loadJournal();
  }

  async function loadJournal() {
    const res = await fetch(`/api/demonstration/${state.deal.id}/journal`);
    if (!res.ok) return;
    const data = (await res.json()) as { audit?: JournalEntry[] };
    setJournal(data.audit ?? []);
    setJournalOpen(true);
  }

  return (
    <>
      <Panel title="1. Ce que voit un compte non admis" controlId="DEMO_STEP_1">
        <p className="dp-muted" style={{ marginTop: 0 }}>
          Palier {String(state.publicView["disclosureTier"] ?? "T0")}, le maximum autorisé sans admission pour une
          cession de titres. Ces champs sont choisis par le serveur, pas par l'écran.
        </p>
        <div className="dp-tablewrap">
          <table className="dp-table">
            <tbody>
              {Object.entries(state.publicView).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ width: "40%" }}>{FIELD_LABEL[k] ?? k}</td>
                  <td>{render(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="2. Ce que verrait un repreneur admis au cercle" controlId="DEMO_STEP_2">
        <p className="dp-muted" style={{ marginTop: 0 }}>
          Palier T1, anonymisé. Il faut une admission nominative prononcée par le service de conformité, et le cercle
          est plafonné : {state.circle.disclosureCount} personne(s) sur {state.circle.cap}.
        </p>
        <div className="dp-tablewrap">
          <table className="dp-table">
            <tbody>
              {Object.entries(state.circleView).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ width: "40%" }}>{FIELD_LABEL[k] ?? k}</td>
                  <td>{render(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dp-label" style={{ marginTop: 16 }}>Reste fermé même à ce palier</p>
        <div className="dp-actions" style={{ gap: 8 }}>
          {state.withheldAtT1.map((w) => (
            <StatusBadge key={w} status="restricted" label={w} />
          ))}
        </div>
      </Panel>

      <DecisionGate kind="offer" title="3. Tentative de publication ouverte" state={attempt ? "decided" : "ready"} controlId="DEMO_STEP_3">
        <p style={{ marginTop: 0 }}>
          Le cédant tente de publier ce dossier de titres sur la place de marché, comme il le ferait pour une cession
          d'actifs. L'appel part vers l'endpoint réel de transition, sans traitement particulier.
        </p>
        <Actions>
          <Button controlId="DEMO_ATTEMPT" state={busy ? "loading" : "default"} onClick={tryPublish}>
            Publier sur la place de marché
          </Button>
          {attempt ? (
            <Button controlId="DEMO_RESET" variant="ghost" onClick={() => setAttempt(null)}>
              Rejouer
            </Button>
          ) : null}
        </Actions>

        {attempt ? (
          <div style={{ marginTop: 16 }}>
            <StateBanner
              tone={attempt.code === "PERIMETER_BLOCKED" ? "danger" : attempt.code === "ACCEPTÉ" ? "warning" : "danger"}
              title={attempt.code === "PERIMETER_BLOCKED" ? "Publication bloquée par le périmètre réglementaire" : attempt.code}
              controlId="DEMO_RESULT"
            >
              <p style={{ marginTop: 4 }}>{attempt.message}</p>
              {attempt.details ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                  <li>Palier maximal sans admission : {String(attempt.details["maxTierWithoutAdmission"] ?? state.maxTierWithoutAdmission)}</li>
                  <li>Étape suivante : {String(attempt.details["nextStep"] ?? "Admission humaine par le service de conformité")}</li>
                </ul>
              ) : null}
            </StateBanner>
            <div style={{ height: 12 }} />
            <PermissionLens
              model={{
                tier: "T0",
                state: "regulatory",
                reason:
                  "Une cession de titres ne peut pas être proposée au public. La diffusion se limite à un cercle restreint dont chaque membre est admis nominativement, et le dépassement de ce cercle expose l'opération à la nullité.",
                missing: ["Admission nominative par le service de conformité", "Cercle restreint sous son plafond"],
              }}
              controlId="DEMO_LENS"
            />
          </div>
        ) : null}
      </DecisionGate>

      <Panel title="4. Ce que la plateforme a enregistré" controlId="DEMO_STEP_4">
        <p className="dp-muted" style={{ marginTop: 0 }}>
          Le refus n'est pas seulement affiché : il est écrit dans le journal d'audit, une table où l'on ajoute mais où
          l'on ne modifie ni ne supprime. C'est ce qui rend la règle opposable plutôt que déclarative.
        </p>
        <Actions>
          <Button controlId="DEMO_JOURNAL" variant="secondary" onClick={loadJournal}>
            {journalOpen ? "Rafraîchir le journal" : "Afficher le journal"}
          </Button>
        </Actions>
        {journalOpen ? (
          journal.length === 0 ? (
            <StateBanner tone="info" title="Aucun événement enregistré pour ce dossier" controlId="DEMO_JOURNAL_EMPTY" />
          ) : (
            <div className="dp-tablewrap" style={{ marginTop: 12 }}>
              <table className="dp-table">
                <thead>
                  <tr>
                    <th scope="col">Horodatage</th>
                    <th scope="col">Événement</th>
                    <th scope="col">Issue</th>
                    <th scope="col">Compte</th>
                    <th scope="col">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.map((e) => (
                    <tr key={e.id} data-control-id="DEMO_JOURNAL_ROW">
                      <td>{fmt(e.occurredAt)}</td>
                      <td>{ACTION_LABEL[e.action] ?? e.action}</td>
                      <td>
                        <StatusBadge status={e.outcome === "BLOCKED" ? "revoked" : e.outcome === "OK" ? "verified" : "pending"} label={e.outcome === "BLOCKED" ? "Refusé" : e.outcome === "OK" ? "Effectué" : e.outcome} />
                      </td>
                      <td>{e.actorEmail ?? "-"}</td>
                      <td>{e.metadata ? Object.entries(e.metadata).map(([k, v]) => `${k} : ${String(v)}`).join(", ") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </Panel>
    </>
  );
}
