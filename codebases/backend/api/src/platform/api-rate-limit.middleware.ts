import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { RULES, RateLimitService } from "./rate-limit.service.js";

/** Plafond global par IP sur toute l'API (S02) : protège aussi les endpoints sans authentification. */
@Injectable()
export class ApiRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly limiter: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? "0.0.0.0";
    try {
      await this.limiter.hit("api:ip", ip, RULES.API_PER_IP);
      next();
    } catch (e) {
      if (e instanceof DealPmeError && e.code === ErrorCode.RATE_LIMITED) {
        res.setHeader("Retry-After", String(RULES.API_PER_IP.windowSeconds));
        res.status(429).json({ error: { code: e.code, message: e.message, correlationId: res.getHeader("x-correlation-id") ?? "" } });
        return;
      }
      next(e);
    }
  }
}
