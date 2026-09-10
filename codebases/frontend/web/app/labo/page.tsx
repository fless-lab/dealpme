import {
  Actions,
  Badge,
  Button,
  Checkbox,
  CoverageRow,
  CriteriaMatrix,
  DealLensAnswer,
  DealRow,
  DecisionGate,
  DocumentRow,
  EvidenceNode,
  EvidenceStrip,
  Field,
  FinancialTable,
  Input,
  IssueRow,
  Metric,
  Metrics,
  MiniDocument,
  Panel,
  PartnerResponsibilityStrip,
  PermissionLens,
  QnAThread,
  ReadinessPanel,
  RiskImpactCard,
  Skeleton,
  StateBanner,
  StatusBadge,
  TransactionRail,
  VDRFolder,
} from "@dealpme/ui";

/**
 * Laboratoire de composants : chaque composant dans toutes ses variantes et tous ses états
 * (COMPONENT_VARIANT_MATRIX de la Tranche 3). Surface de revue du designer et référence des captures de régression.
 * Données synthétiques uniquement.
 */
const STAGES = [
  { id: "INTERESTED", label: "Intérêt" },
  { id: "QUALIFIED", label: "Qualification" },
  { id: "ADMITTED", label: "Admission" },
  { id: "NDA", label: "NDA" },
  { id: "T2", label: "T2" },
  { id: "VDR", label: "Data room" },
  { id: "LOI", label: "LOI" },
  { id: "OUTCOME", label: "Résultat" },
];

export default function LabPage() {
  return (
    <div className="dp-lab">
      <h1>Laboratoire de composants</h1>
      <p className="dp-muted">Variantes et états du design system produit. Données synthétiques.</p>

      <section>
        <h2>Button : primary, secondary, danger, ghost ; loading, disabled, blocked</h2>
        <div className="dp-variants">
          <Button controlId="LAB_BTN_PRIMARY">Primaire</Button>
          <Button controlId="LAB_BTN_SECONDARY" variant="secondary">Secondaire</Button>
          <Button controlId="LAB_BTN_DANGER" variant="danger">Danger</Button>
          <Button controlId="LAB_BTN_GHOST" variant="ghost">Discret</Button>
          <Button controlId="LAB_BTN_LOADING" state="loading">Chargement</Button>
          <Button controlId="LAB_BTN_DISABLED" disabled>Désactivé</Button>
          <Button controlId="LAB_BTN_BLOCKED" state="blocked">Bloqué</Button>
        </div>
      </section>

      <section>
        <h2>StatusBadge et Badge</h2>
        <div className="dp-variants">
          <StatusBadge status="verified" label="Vérifié" />
          <StatusBadge status="pending" label="En cours" />
          <StatusBadge status="restricted" label="Restreint" />
          <StatusBadge status="revoked" label="Révoqué" />
          <Badge tone="neutral">Neutre</Badge>
          <Badge tone="info">Info</Badge>
        </div>
      </section>

      <section>
        <h2>StateBanner : info, success, warning, danger</h2>
        <div className="dp-stack">
          <StateBanner tone="info" title="Chargement" controlId="LAB_BANNER_INFO">Les données arrivent.</StateBanner>
          <StateBanner tone="success" title="Enregistré" controlId="LAB_BANNER_SUCCESS" />
          <StateBanner tone="warning" title="Hors ligne" controlId="LAB_BANNER_WARNING">Les modifications seront envoyées au retour du réseau.</StateBanner>
          <StateBanner tone="danger" title="Accès révoqué" controlId="LAB_BANNER_DANGER">Votre accès à ce dossier a été retiré par le cédant.</StateBanner>
        </div>
      </section>

      <section>
        <h2>PermissionLens : granted, pending, denied, regulatory</h2>
        <div className="dp-grid">
          <PermissionLens model={{ tier: "T0", state: "granted", reason: "Compte authentifié : existence de l'opportunité visible." }} controlId="LAB_LENS_GRANTED" />
          <PermissionLens model={{ tier: "T1", state: "pending", reason: "Admission au cercle en attente d'une décision humaine.", missing: ["Décision de conformité"] }} controlId="LAB_LENS_PENDING" />
          <PermissionLens model={{ tier: "T2", state: "denied", reason: "NDA non exécuté.", nextAction: { label: "Signer le NDA", href: "#", controlId: "LAB_LENS_NDA" } }} controlId="LAB_LENS_DENIED" />
          <PermissionLens model={{ tier: "T1", state: "regulatory", reason: "Cession de titres : diffusion au-delà du cercle interdite (risque de nullité)." }} controlId="LAB_LENS_REG" />
        </div>
      </section>

      <section>
        <h2>TransactionRail : done, current, future, terminal</h2>
        <TransactionRail stages={STAGES} current="NDA" controlId="LAB_RAIL" />
        <div style={{ height: 12 }} />
        <TransactionRail stages={STAGES} current="OUTCOME" terminal="OUTCOME" controlId="LAB_RAIL_TERMINAL" />
      </section>

      <section>
        <h2>EvidenceStrip : 4 cellules et compact ; declared, documented, reviewed</h2>
        <div className="dp-stack">
          <EvidenceStrip evidence={{ source: "Déclaration du cédant", quality: "declared", confidence: "LOW", reviewedAt: "10/09/2026" }} />
          <EvidenceStrip evidence={{ source: "États financiers 2025", quality: "documented", confidence: "MEDIUM", reviewedAt: "10/09/2026" }} variant="compact" />
          <EvidenceStrip evidence={{ source: "Rapport d'expert indépendant", quality: "reviewed", confidence: "HIGH", reviewedAt: "10/09/2026" }} />
        </div>
      </section>

      <section>
        <h2>Metric : neutral, warning, delta</h2>
        <Metrics>
          <Metric label="Chiffre d'affaires 2025" value="2 120 M FCFA" note="Déclaré, non audité" />
          <Metric label="EBITDA" value="377 M FCFA" delta={{ dir: "up", text: "+19 % vs 2024" }} />
          <Metric label="Dette nette" value="293 M FCFA" tone="warning" delta={{ dir: "down", text: "0,8x EBITDA" }} />
          <Metric label="Concentration top 5" value="46 %" tone="warning" />
          <Metric label="Effectif" value="62" />
        </Metrics>
      </section>

      <section>
        <h2>FinancialTable</h2>
        <FinancialTable caption="Compte de résultat synthétique (M FCFA, déclaré, non audité)" columns={["Année", "Chiffre d'affaires", "EBITDA", "Résultat net"]} rows={[["2023", "1 640", "271", "148"], ["2024", "1 828", "317", "184"], ["2025", "2 120", "377", "217"]]} numeric={[1, 2, 3]} />
      </section>

      <section>
        <h2>DealRow : T0, T1, T2, Deal-Ready</h2>
        <div style={{ border: "1px solid var(--dp-line)", borderRadius: 8, overflow: "hidden" }}>
          <DealRow href="#" title="Agroalimentaire" sector="AGRO" region="Grand Lomé" band="250 M à 1 Md FCFA" dealTypeLabel="Cession de titres" dealReady tier="T0" controlId="LAB_ROW_READY" />
          <DealRow href="#" title="Logistique du froid" sector="LOGI" region="Maritime" band="250 M à 1 Md FCFA" dealTypeLabel="Cession d'actifs" dealReady={false} tier="T0" controlId="LAB_ROW_T0" />
          <DealRow href="#" title="Transporteur en redressement" sector="TRSP" region="Grand Lomé" band="250 M à 1 Md FCFA" dealTypeLabel="Cession d'actifs" dealReady={false} tier="T1" controlId="LAB_ROW_T1" />
        </div>
      </section>

      <section>
        <h2>DecisionGate : ready, blocked, decided (admission, certification, offer)</h2>
        <div className="dp-grid">
          <DecisionGate kind="admission" title="Admission au cercle" state="ready" controlId="LAB_GATE_READY">
            <Actions>
              <Button controlId="LAB_GATE_ADMIT">Admettre</Button>
              <Button controlId="LAB_GATE_REFUSE" variant="secondary">Refuser</Button>
            </Actions>
          </DecisionGate>
          <DecisionGate kind="admission" title="Admission au cercle" state="blocked" controlId="LAB_GATE_BLOCKED">
            <StateBanner tone="danger" title="Plafond atteint" controlId="LAB_GATE_BLOCKED_BANNER">50 personnes admises : aucune admission tant qu'une personne n'est pas retirée.</StateBanner>
          </DecisionGate>
          <DecisionGate kind="certification" title="Certification Deal-Ready" state="decided" decidedBy="Officier CCI-Togo (démonstration)" decidedAt="18/12/2025" controlId="LAB_GATE_DECIDED">
            <StatusBadge status="verified" label="Accordée" />
          </DecisionGate>
        </div>
      </section>

      <section>
        <h2>CriteriaMatrix et ReadinessPanel</h2>
        <ReadinessPanel
          domains={[
            { name: "Comptes annuels (36 mois)", state: "reviewed" },
            { name: "Propriété et capital", state: "declared", detail: "Registre des actionnaires à produire" },
            { name: "Situation fiscale", state: "missing", detail: "Attestation de régularité absente" },
            { name: "Contrats clés", state: "certified" },
          ]}
          certification={{ isDealReady: true, scopeStatement: "Existence, immatriculation et complétude documentaire. Ni exactitude financière ni absence de litige.", decidedBy: "Officier CCI-Togo", decidedAt: "18/12/2025" }}
        />
        <div style={{ height: 12 }} />
        <CriteriaMatrix rows={[{ label: "Type de cession déclaré", state: "ok" }, { label: "Pouvoir du représentant", state: "ko", detail: "Pièce à fournir" }]} controlId="LAB_CRITERIA" />
      </section>

      <section>
        <h2>IssueRow, RiskImpactCard, CoverageRow</h2>
        <div style={{ border: "1px solid var(--dp-line)", borderRadius: 8, overflow: "hidden", background: "var(--dp-paper)" }}>
          <IssueRow risk={{ id: "r1", title: "Concentration clients (top 5 = 46 %)", severity: "HIGH", category: "risk", impact: ["prix", "SPA"], status: "open", evidenceIds: [] }} href="#" controlId="LAB_ISSUE_1" />
          <IssueRow risk={{ id: "r2", title: "Attestation fiscale manquante", severity: "MEDIUM", category: "compliance", impact: ["condition suspensive"], status: "investigating", evidenceIds: [] }} controlId="LAB_ISSUE_2" />
          <IssueRow risk={{ id: "r3", title: "Litige social clos", severity: "LOW", category: "financial", impact: ["information"], status: "closed", evidenceIds: [] }} controlId="LAB_ISSUE_3" />
        </div>
        <div style={{ height: 12 }} />
        <RiskImpactCard risk={{ id: "r1", title: "Concentration clients", severity: "CRITICAL", category: "risk", impact: ["prix", "financement"], status: "open", evidenceIds: ["d1", "d2"] }} evidenceCount={2} />
        <Panel title="Couverture de diligence">
          <CoverageRow domain="Financier" ratio={0.8} gaps={2} />
          <CoverageRow domain="Fiscal" ratio={0.4} gaps={5} />
          <CoverageRow domain="Social" ratio={1} gaps={0} />
        </Panel>
      </section>

      <section>
        <h2>Data room : VDRFolder, DocumentRow, DealLensAnswer, QnAThread, EvidenceNode, MiniDocument</h2>
        <div className="dp-grid">
          <Panel title="Dossiers">
            <VDRFolder name="Corporate" count={6} current />
            <VDRFolder name="Financier" count={9} />
            <VDRFolder name="Clean Team" count={2} cleanTeam />
          </Panel>
          <Panel title="Documents">
            <DocumentRow doc={{ id: "d1", title: "Statuts coordonnés", folder: "Corporate", version: 2, updatedAt: "08/09/2026", state: "view" }} />
            <DocumentRow doc={{ id: "d2", title: "Contrat cadre client A", folder: "Contrats", version: 1, updatedAt: "01/09/2026", state: "blocked", cleanTeam: true }} />
            <DocumentRow doc={{ id: "d3", title: "Liasse fiscale 2023", folder: "Fiscal", version: 1, updatedAt: "12/08/2026", state: "superseded" }} />
            <DocumentRow doc={{ id: "d4", title: "Bail commercial", folder: "Actifs", version: 1, updatedAt: "12/08/2026", state: "revoked" }} />
          </Panel>
        </div>
        <div style={{ height: 12 }} />
        <div className="dp-grid">
          <DealLensAnswer model={{ scope: "document", answer: "Le contrat cadre prévoit une clause de changement de contrôle avec préavis de 90 jours.", confidence: "HIGH", citations: [{ documentId: "d2", documentTitle: "Contrat cadre client A", page: 4 }] }} controlId="LAB_ANSWER_HIGH" />
          <DealLensAnswer model={{ scope: "room", answer: "Les documents auxquels vous avez accès ne permettent pas de conclure sur l'exposition fiscale 2024.", confidence: "INSUFFICIENT", citations: [], openQuestions: ["Liasse fiscale 2024 non versée"] }} controlId="LAB_ANSWER_INSUFFICIENT" />
        </div>
        <div style={{ height: 12 }} />
        <QnAThread thread={{ id: "q1", question: "Le bail commercial est-il cessible sans accord du bailleur ?", category: "Juridique", author: "Investisseur A", askedAt: "09/09/2026", status: "ANSWERED", documentTitle: "Bail commercial", answer: { text: "Oui, sous réserve d'une notification par acte extrajudiciaire.", by: "Conseil du cédant", at: "10/09/2026" } }} controlId="LAB_QNA" />
        <div style={{ height: 12 }} />
        <div className="dp-variants">
          <EvidenceNode kind="Document" label="Statuts coordonnés" href="#" />
          <EvidenceNode kind="Fact" label="Capital : 500 M FCFA" />
          <EvidenceNode kind="Risk" label="Clause d'agrément" />
          <MiniDocument doc={{ title: "Procès-verbal AG 2025", folder: "Corporate", version: 1 }} />
        </div>
      </section>

      <section>
        <h2>Formulaire, PartnerResponsibilityStrip, Skeleton</h2>
        <div className="dp-grid">
          <div>
            <Field id="lab-input" label="Champ texte" hint="Aide contextuelle">
              <Input id="lab-input" placeholder="Saisie" />
            </Field>
            <Field id="lab-input-err" label="Champ en erreur" error="Renseignez un numéro au format +228XXXXXXXX pour recevoir le code.">
              <Input id="lab-input-err" invalid defaultValue="90 00" />
            </Field>
            <Checkbox id="lab-check" label="Consentement séparé, jamais pré-coché" />
          </div>
          <div className="dp-stack">
            <PartnerResponsibilityStrip partner="Partenaire fiscal" text="Le contenu de la simulation relève de la responsabilité du partenaire ; DealPME assure l'intégration." />
            <Skeleton lines={4} />
          </div>
        </div>
      </section>
    </div>
  );
}
