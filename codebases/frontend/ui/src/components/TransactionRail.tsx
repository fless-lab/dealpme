import { colors } from "../tokens.js";

export const TRANSACTION_STAGES = ["Intérêt", "Qualification", "Admission", "NDA", "T2", "Data room", "LOI", "Audit confirmatoire", "Documentation", "Résultat"] as const;
export type TransactionStage = (typeof TRANSACTION_STAGES)[number];

/**
 * TransactionRail : progression d'une transaction. Aucune étape ne peut être sautée sans règle documentée ;
 * le composant affiche, il ne décide pas.
 */
export function TransactionRail({ current, controlId = "TRANSACTION_RAIL" }: { current: TransactionStage; controlId?: string }) {
  const idx = TRANSACTION_STAGES.indexOf(current);
  return (
    <ol data-control-id={controlId} style={{ display: "flex", gap: 6, listStyle: "none", padding: 0, margin: 0, flexWrap: "wrap" }}>
      {TRANSACTION_STAGES.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li
            key={s}
            aria-current={active ? "step" : undefined}
            style={{
              padding: "0.3rem 0.65rem",
              borderRadius: 6,
              fontSize: "0.78rem",
              fontWeight: active ? 700 : 500,
              background: active ? colors.marineEncre : done ? "#E9F2EC" : "#E7E8EC",
              color: active ? colors.blanc : done ? colors.verifie : colors.acier,
            }}
          >
            {s}
          </li>
        );
      })}
    </ol>
  );
}
