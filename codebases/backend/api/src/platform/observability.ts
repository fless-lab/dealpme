import type { NextFunction, Request, Response } from "express";
import { correlationIdOf } from "./correlation-id.middleware.js";

/**
 * Journalisation applicative. Une ligne JSON par requête, sur la sortie standard : c'est ce que les
 * collecteurs savent lire sans agent particulier, et ce qui permet de retrouver une requête par son
 * identifiant de corrélation, y compris à travers l'API et le service RPS.
 *
 * Aucune donnée personnelle ni confidentielle n'entre dans un journal : ni corps de requête, ni jeton,
 * ni adresse email. L'adresse IP est réduite à son empreinte par les services qui en ont besoin.
 */
export interface RequestLog {
  ts: string;
  level: "info" | "warn" | "error";
  msg: "request";
  method: string;
  path: string;
  status: number;
  durationMs: number;
  correlationId: string;
  /** Rôles du principal, sans son identité : sert à isoler un problème lié à un rôle. */
  roles?: string;
}

const REDACTED_QUERY = /(token|code|password|secret)=[^&]*/gi;

/** Chemin journalisé sans ses valeurs sensibles : un code OTP ne doit jamais atterrir dans un journal. */
function safePath(req: Request): string {
  const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
  const query = req.originalUrl.includes("?") ? `?${req.originalUrl.split("?")[1]?.replace(REDACTED_QUERY, "$1=***")}` : "";
  return `${path}${query}`;
}

export function requestLogger(production: boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const principal = (req as Request & { principal?: { roles: string[] } }).principal;
      const line: RequestLog = {
        ts: new Date().toISOString(),
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        msg: "request",
        method: req.method,
        path: safePath(req),
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        correlationId: correlationIdOf(req),
        ...(principal ? { roles: principal.roles.join(",") } : {}),
      };
      // En développement, une ligne compacte reste lisible à l'œil ; en production, du JSON pour le collecteur.
      if (production) {
        process.stdout.write(`${JSON.stringify(line)}\n`);
      } else if (res.statusCode >= 400) {
        process.stdout.write(`${line.status} ${line.method} ${line.path} ${line.durationMs}ms [${line.correlationId}]\n`);
      }
    });
    next();
  };
}

/**
 * Compteur d'erreurs serveur sur une fenêtre glissante. Il alimente la sonde de disponibilité :
 * une rafale de 5xx rend le service "dégradé" avant que quiconque appelle le support.
 */
export class ErrorRate {
  private readonly timestamps: number[] = [];
  constructor(private readonly windowMs = 5 * 60_000) {}

  record(): void {
    const now = Date.now();
    this.timestamps.push(now);
    while (this.timestamps.length > 0 && now - (this.timestamps[0] ?? 0) > this.windowMs) this.timestamps.shift();
  }

  countInWindow(): number {
    const now = Date.now();
    while (this.timestamps.length > 0 && now - (this.timestamps[0] ?? 0) > this.windowMs) this.timestamps.shift();
    return this.timestamps.length;
  }
}

export const errorRate = new ErrorRate();
