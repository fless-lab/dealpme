import { StatusBadge } from "@dealpme/ui";

/**
 * Badge Deal-Ready. Il n'apparaît jamais seul : sa portée et ses limites l'accompagnent, parce qu'un badge
 * sans portée se lit comme une garantie de la plateforme, ce qu'il n'est pas (DP-CCI, v0).
 */
export const DEAL_READY_LIMITS = [
  "La certification ne garantit pas l'exactitude des chiffres déclarés par le cédant.",
  "Elle ne constate ni l'absence de litige, ni l'absence de dette.",
  "Elle ne porte aucun jugement sur le prix ni sur la valeur de l'entreprise.",
  "Elle peut être retirée par la CCI-Togo, notamment si une pièce se révèle inexacte.",
];

export function DealReadyBadge({ granted, controlId }: { granted: boolean; controlId?: string }) {
  return granted ? (
    <StatusBadge status="verified" label="Deal-Ready" {...(controlId ? { controlId } : {})} />
  ) : (
    <StatusBadge status="neutral" label="Non certifié" {...(controlId ? { controlId } : {})} />
  );
}

/** Encart de portée : ce qui est vérifié, puis ce qui ne l'est pas. Le second bloc n'est jamais masquable. */
export function DealReadyScope({ scopeStatement, limits = DEAL_READY_LIMITS }: { scopeStatement?: string | null; limits?: string[] }) {
  return (
    <div className="dp-scope" data-control-id="DEAL_READY_SCOPE">
      <p className="dp-label" style={{ marginTop: 0 }}>Ce que la certification atteste</p>
      <p style={{ marginTop: 0 }}>
        {scopeStatement ??
          "Existence juridique, immatriculation au RCCM et complétude documentaire vérifiées par la CCI-Togo."}
      </p>
      <p className="dp-label">Ce qu'elle n'atteste pas</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {limits.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.8rem" }}>
        La décision appartient à un officier nommé de la CCI-Togo. DealPME ne certifie rien et n'audite rien.
      </p>
    </div>
  );
}
