import type { AntivirusPort, ScanVerdict } from "./port.js";

/**
 * Faux moteur pour le développement et les tests. Il reconnaît la chaîne de test EICAR, qui est le
 * standard officiel pour vérifier une chaîne antivirus sans manipuler de code malveillant, et déclare
 * tout le reste propre. Ne jamais l'activer en production : l'adaptateur ClamAV est le seul moteur réel.
 */
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export function createFakeAntivirus(): AntivirusPort {
  return {
    engine: "fake-eicar",
    scan(bytes: Uint8Array): Promise<ScanVerdict> {
      const head = Buffer.from(bytes.slice(0, 1024)).toString("latin1");
      if (head.includes(EICAR)) return Promise.resolve({ clean: false, signature: "Eicar-Test-Signature" });
      return Promise.resolve({ clean: true });
    },
  };
}
