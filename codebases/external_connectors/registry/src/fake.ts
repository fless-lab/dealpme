import type { RegistryPort } from "./port.js";

/**
 * Implémentation factice pour les tests et le développement tant qu'aucun contrat n'est signé.
 * Comportement déterministe, aucun appel réseau. Ne jamais l'activer en production.
 */
export function createFakeRegistry(): RegistryPort {
  const notImplemented = (method: string) => () =>
    Promise.reject(new Error(`Faux connecteur registry : méthode ${method} à implémenter dans le faux selon le scénario de test`));
  const port = {} as Record<string, unknown>;
  for (const m of PORT_METHODS) {
    port[m] = notImplemented(m);
  }
  port['mode'] = 'manual';
  port['provider'] = 'manual';
  
  return port as unknown as RegistryPort;
}

export const PORT_METHODS = ["lookup"] as const;
