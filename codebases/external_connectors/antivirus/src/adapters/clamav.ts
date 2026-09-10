import { connect } from "node:net";
import type { AntivirusPort, ScanVerdict } from "../port.js";

export interface ClamAvConfig {
  host: string;
  port: number;
  /** Coupe l'analyse au-delà de ce délai : un moteur muet ne doit jamais bloquer une requête. */
  timeoutMs?: number;
}

/**
 * Adaptateur ClamAV via le protocole INSTREAM de clamd. Le fichier n'est jamais écrit sur disque
 * avant son verdict : les octets transitent en mémoire jusqu'au moteur.
 * Un moteur injoignable est une erreur, jamais un verdict propre par défaut.
 */
export function createClamAvAdapter(config: ClamAvConfig): AntivirusPort {
  const timeoutMs = config.timeoutMs ?? 15_000;
  return {
    engine: "clamav",
    scan(bytes: Uint8Array): Promise<ScanVerdict> {
      return new Promise((resolve, reject) => {
        const socket = connect({ host: config.host, port: config.port });
        socket.setTimeout(timeoutMs);
        let response = "";
        socket.on("connect", () => {
          socket.write("zINSTREAM\0");
          // Protocole INSTREAM : blocs de 64 Kio préfixés par leur taille, terminés par un bloc vide.
          for (let offset = 0; offset < bytes.length; offset += 65536) {
            const chunk = bytes.slice(offset, offset + 65536);
            const size = Buffer.alloc(4);
            size.writeUInt32BE(chunk.length, 0);
            socket.write(size);
            socket.write(chunk);
          }
          socket.write(Buffer.from([0, 0, 0, 0]));
        });
        socket.on("data", (d) => {
          response += d.toString("utf8");
        });
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("Analyse antivirus expirée"));
        });
        socket.on("error", reject);
        socket.on("close", () => {
          const line = response.replace(/\0/g, "").trim();
          if (line.endsWith("OK")) return resolve({ clean: true });
          const found = /stream:\s*(.+)\s+FOUND$/.exec(line);
          if (found?.[1]) return resolve({ clean: false, signature: found[1] });
          reject(new Error(`Réponse antivirus inattendue : ${line || "vide"}`));
        });
      });
    },
  };
}
