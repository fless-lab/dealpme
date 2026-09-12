import { Inject, Injectable } from "@nestjs/common";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { CoreTx } from "../../database/tenant.js";
import type { EmailPort } from "@dealpme/connector-email";
import type { SmsPort } from "@dealpme/connector-sms";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { loadEnv } from "../../config/env.js";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { otpChallenges } from "../../database/schema/core.js";
import { AuditService } from "../../platform/audit.service.js";
import { RULES, RateLimitService } from "../../platform/rate-limit.service.js";

export const SMS_PORT = Symbol("SMS_PORT");
export const EMAIL_PORT = Symbol("EMAIL_PORT");

export type OtpPurpose = "LOGIN_MFA" | "EMAIL_VERIFY" | "PHONE_VERIFY";

/**
 * Codes à usage unique (S03) : 6 chiffres, 10 minutes, hachés en base (HMAC avec le secret de session),
 * cinq essais par défi, comparaison en temps constant, consommation unique.
 * Le code n'est renvoyé dans la réponse qu'en développement (devCode) pour les tests automatisés.
 */
const OTP_TTL_MS = 10 * 60_000;

@Injectable()
export class OtpService {
  private readonly env = loadEnv();

  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(SMS_PORT) private readonly sms: SmsPort,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    private readonly limiter: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  private hash(challengeId: string, code: string): string {
    return createHmac("sha256", this.env.SESSION_SECRET).update(`${challengeId}:${code}`).digest("hex");
  }

  async issue(userId: string, purpose: OtpPurpose, channel: { phoneE164?: string | null; email?: string | null }, correlationId: string, transaction?: CoreTx): Promise<{ challengeId: string; devCode?: string }> {
    const challengeId = newId();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const issueInTransaction = async (tx: CoreTx) => {
      await tx.insert(otpChallenges).values({ id: challengeId, userId, purpose, codeHash: this.hash(challengeId, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) });

      const text = purpose === "EMAIL_VERIFY" ? `DealPME : votre code de vérification est ${code}. Valable 10 minutes.` : `DealPME : votre code de connexion est ${code}. Valable 10 minutes. Ne le communiquez à personne.`;
      if (purpose === "EMAIL_VERIFY" && channel.email) {
        await this.email.send({ to: channel.email, subject: "Vérification de votre adresse email", text, category: "TRANSACTIONAL" });
      } else if (channel.phoneE164) {
        await this.sms.send({ toE164: channel.phoneE164, text, category: "OTP" });
      } else {
        throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Aucun canal disponible pour envoyer le code");
      }
      await this.audit.record({ action: "OTP_ISSUED", actorUserId: userId, subjectType: "otp", subjectId: challengeId, outcome: "OK", correlationId, metadata: { purpose } }, tx);
    };
    if (transaction) await issueInTransaction(transaction);
    else await this.db.transaction(issueInTransaction);
    return this.env.NODE_ENV === "development" ? { challengeId, devCode: code } : { challengeId };
  }

  /** Vérifie hors transaction métier : les refus et compteurs sont persistés sans verrou externe. */
  async verify(challengeId: string, code: string, purpose: OtpPurpose, correlationId: string): Promise<{ userId: string; challengeId: string; purpose: OtpPurpose }> {
    await this.limiter.hit("otp:challenge", challengeId, RULES.OTP_ATTEMPTS_PER_CHALLENGE);
    const row = (await this.db.select().from(otpChallenges).where(and(eq(otpChallenges.id, challengeId), isNull(otpChallenges.consumedAt), gt(otpChallenges.expiresAt, new Date()))).limit(1))[0];
    if (!row) {
      throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Code expiré ou déjà utilisé");
    }
    const expected = Buffer.from(row.codeHash, "utf8");
    const provided = Buffer.from(this.hash(challengeId, code), "utf8");
    if (row.purpose !== purpose || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      // La transaction d'authentification n'a pas encore démarré.
      await this.db.transaction(async (failureTx) => {
        await failureTx.update(otpChallenges).set({ attempts: sql`${otpChallenges.attempts} + 1` }).where(eq(otpChallenges.id, challengeId));
        await this.audit.record({ action: "OTP_FAILED", actorUserId: row.userId, subjectType: "otp", subjectId: challengeId, outcome: "FAILED", correlationId }, failureTx);
      });
      throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Code invalide");
    }
    return { userId: row.userId, challengeId, purpose };
  }

  /** Consommation et création de session/vérification email partagent la transaction de l'appelant. */
  async consume(verified: { userId: string; challengeId: string; purpose: OtpPurpose }, tx: CoreTx): Promise<void> {
    const consumed = await tx.update(otpChallenges).set({ consumedAt: new Date() }).where(and(eq(otpChallenges.id, verified.challengeId), eq(otpChallenges.userId, verified.userId), isNull(otpChallenges.consumedAt), eq(otpChallenges.purpose, verified.purpose), gt(otpChallenges.expiresAt, new Date()))).returning({ id: otpChallenges.id });
    if (!consumed.length) throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Code expiré ou déjà utilisé");
  }
}
