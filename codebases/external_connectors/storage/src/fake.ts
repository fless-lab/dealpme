import type { StoragePort } from "./port.js";

/**
 * Implémentation factice pour les tests et le développement tant qu'aucun contrat n'est signé.
 * Comportement déterministe, aucun appel réseau. Ne jamais l'activer en production.
 */
export function createFakeStorage(): StoragePort {
  const notImplemented = (method: string) => () =>
    Promise.reject(new Error(`Faux connecteur storage : méthode ${method} à implémenter dans le faux selon le scénario de test`));
  const port = {} as Record<string, unknown>;
  for (const m of PORT_METHODS) {
    port[m] = notImplemented(m);
  }
  
  
  return port as unknown as StoragePort;
}

export const PORT_METHODS = ["put", "get", "presignedGetUrl", "delete"] as const;
