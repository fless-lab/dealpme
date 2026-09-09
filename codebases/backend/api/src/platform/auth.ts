import { CanActivate, createParamDecorator, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import type { Role } from "@dealpme/domain";

/**
 * Autorisation côté serveur uniquement (DP-IDN-001) : les gardes de route du frontend sont un confort,
 * jamais un contrôle d'accès. Le principal est résolu depuis la session serveur par le module identity.
 */
export interface Principal {
  userId: string;
  personId: string;
  organisationId: string;
  roles: Role[];
  sessionId: string;
}

export const ROLES_KEY = "dealpme:roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext): Principal => {
  const req = ctx.switchToHttp().getRequest<Request & { principal?: Principal }>();
  if (!req.principal) {
    throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Connexion requise");
  }
  return req.principal;
});

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { principal?: Principal }>();
    if (!required || required.length === 0) {
      return true;
    }
    if (!req.principal) {
      throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Connexion requise");
    }
    const ok = required.some((r) => req.principal!.roles.includes(r));
    if (!ok) {
      throw new DealPmeError(ErrorCode.FORBIDDEN, "Rôle insuffisant pour cette action");
    }
    return true;
  }
}
