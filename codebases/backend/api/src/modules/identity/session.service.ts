import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { newId, type Role } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { sessions, users } from "../../database/schema/core.js";
import type { Principal } from "../../platform/auth.js";
import type { CoreTx } from "../../database/tenant.js";

/**
 * Sessions côté serveur (DP-IDN) : jeton opaque dont seul le hash est stocké, expiration glissante
 * (30 minutes par défaut pour les comptes ayant accès à une data room), liste d'appareils, révocation à distance.
 */
export const SESSION_TTL_MINUTES = 30;

@Injectable()
export class SessionService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async create(userId: string, deviceLabel: string | null, ipHash: string | null, tx: CoreTx): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000);
    await tx.insert(sessions).values({ id: newId(), userId, tokenHash: this.hashToken(token), deviceLabel, ipHash, expiresAt });
    return { token, expiresAt };
  }

  async resolve(token: string): Promise<Principal | null> {
    const rows = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, this.hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    // Expiration glissante : chaque requête valide repousse l'échéance.
    await this.db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000) })
      .where(eq(sessions.id, row.session.id));
    return {
      userId: row.user.id,
      personId: row.user.personId,
      organisationId: row.user.organisationId,
      roles: row.user.roles as Role[],
      sessionId: row.session.id,
    };
  }

  async revoke(sessionId: string, userId: string, tx: CoreTx): Promise<boolean> {
    const rows = await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id });
    return rows.length > 0;
  }

  async revokeAllForUser(userId: string, tx: CoreTx): Promise<number> {
    const rows = await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id });
    return rows.length;
  }
}
