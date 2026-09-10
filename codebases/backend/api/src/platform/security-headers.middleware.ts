import type { NextFunction, Request, Response } from "express";

/**
 * En-têtes de sécurité HTTP (registre S05). L'API ne sert que du JSON : la CSP interdit tout chargement.
 * HSTS n'est envoyé qu'en production (derrière TLS), pour ne pas piéger un navigateur en développement.
 */
export function securityHeaders(production: boolean) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader("Cache-Control", "no-store");
    res.removeHeader("X-Powered-By");
    if (production) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  };
}
