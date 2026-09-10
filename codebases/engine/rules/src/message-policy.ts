/**
 * Politique des échanges avant accord de confidentialité (v0, P09).
 * La messagerie de mise en relation sert à convenir d'un rendez-vous, pas à contourner les paliers de
 * divulgation : tant que le NDA n'est pas exécuté, les coordonnées directes ne circulent pas par la plateforme.
 *
 * Le refus nomme ce qui bloque plutôt que de caviarder en silence : un message tronqué sans explication
 * fait croire à l'expéditeur qu'il a été transmis en entier.
 */
export type ContactKind = "EMAIL" | "PHONE" | "LINK";

export interface ContactFinding {
  kind: ContactKind;
  /** Libellé de ce qui a été reconnu, pour le message d'erreur. */
  reason: string;
  /** Formulation prête à insérer après "Retirez ". */
  remove: string;
}

const RULES: { kind: ContactKind; pattern: RegExp; reason: string; remove: string }[] = [
  { kind: "EMAIL", pattern: /[\w.+-]+@[\w-]+\.[\w.]{2,}/, reason: "adresse email", remove: "l'adresse email" },
  // Numéros togolais et internationaux : huit chiffres groupés, ou indicatif suivi d'au moins six chiffres.
  { kind: "PHONE", pattern: /(?:\+\d{6,}|\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b)/, reason: "numéro de téléphone", remove: "le numéro de téléphone" },
  { kind: "LINK", pattern: /https?:\/\/\S+/i, reason: "lien externe", remove: "le lien" },
];

/** Première coordonnée reconnue dans un message, ou null si le message peut circuler. */
export function findContactDetails(body: string): ContactFinding | null {
  const found = RULES.find((r) => r.pattern.test(body));
  return found ? { kind: found.kind, reason: found.reason, remove: found.remove } : null;
}

export function contactRefusalMessage(finding: ContactFinding): string {
  return `Les échanges de coordonnées directes attendent la signature d'un accord de confidentialité. Retirez ${finding.remove} du message.`;
}
