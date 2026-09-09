import type { TaxPartnerPort } from "./port.js";

/**
 * Implémentation factice pour les tests et le développement tant qu'aucun contrat n'est signé.
 * Comportement déterministe, aucun appel réseau. Ne jamais l'activer en production.
 */
export function createFakeTaxPartner(): TaxPartnerPort {
  const notImplemented = (method: string) => () =>
    Promise.reject(new Error(`Faux connecteur tax-partner : méthode ${method} à implémenter dans le faux selon le scénario de test`));
  const port = {} as Record<string, unknown>;
  for (const m of PORT_METHODS) {
    port[m] = notImplemented(m);
  }
  
  
  return port as unknown as TaxPartnerPort;
}

export const PORT_METHODS = ["simulate", "requestCertificate", "health"] as const;
