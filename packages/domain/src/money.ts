/**
 * Montants en francs CFA (XOF) : entiers, jamais de flottant, pas de sous-unité.
 * Piège documenté dans le v0 : les bibliothèques de paiement supposent souvent des "minor units" ;
 * le XOF n'en a pas. Un montant de 1 500 000 FCFA se stocke tel quel : 1500000.
 */
export type Xof = number & { readonly __brand: "Xof" };

export function xof(value: number): Xof {
  if (!Number.isInteger(value) || value < 0 || !Number.isSafeInteger(value)) {
    throw new RangeError(`Montant XOF invalide : ${value}. Un montant doit être un entier positif.`);
  }
  return value as Xof;
}

export function addXof(a: Xof, b: Xof): Xof {
  return xof(a + b);
}

export function subXof(a: Xof, b: Xof): Xof {
  return xof(a - b);
}

/** Pourcentage appliqué à un montant, arrondi à l'entier inférieur (jamais de centime fantôme). */
export function applyRate(amount: Xof, ratePercent: number): Xof {
  return xof(Math.floor((amount * ratePercent) / 100));
}

/** Parité fixe FCFA / EUR (UEMOA), affichable à titre indicatif seulement. */
export const XOF_PER_EUR = 655.957;
