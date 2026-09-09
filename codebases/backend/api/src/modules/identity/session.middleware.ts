import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Principal } from "../../platform/auth.js";
import { SessionService } from "./session.service.js";

/**
 * Résout le principal depuis le jeton de session (en-tête Authorization: Bearer <jeton>).
 * Aucune erreur ici : l'absence de session laisse req.principal vide, et ce sont les gardes
 * (RolesGuard, CurrentPrincipal) qui refusent l'accès. Le frontend n'est jamais la frontière de sécurité.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessions: SessionService) {}

  async use(req: Request & { principal?: Principal }, _res: Response, next: NextFunction): Promise<void> {
    const header = req.header("authorization");
    if (header?.startsWith("Bearer ")) {
      const token = header.slice("Bearer ".length).trim();
      if (token.length > 0) {
        const principal = await this.sessions.resolve(token);
        if (principal) {
          req.principal = principal;
        }
      }
    }
    next();
  }
}
