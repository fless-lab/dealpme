import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DealPmeError, ErrorCode, type RegisterRequest } from "@dealpme/contracts";
import { Role, newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { organisations, persons, users } from "../../database/schema/core.js";
import { AuditService } from "../../platform/audit.service.js";
import { RULES, RateLimitService } from "../../platform/rate-limit.service.js";
import { OtpService } from "./otp.service.js";
import { PasswordService } from "./password.service.js";
import { SessionService } from "./session.service.js";

/** Rôles pour lesquels un second facteur est obligatoire à chaque connexion (S03). */
const MFA_REQUIRED_ROLES: readonly string[] = [Role.CCI_OFFICER, Role.PLATFORM_ADMIN, Role.COMPLIANCE_OPERATOR];

export type LoginOutcome = { kind: "SESSION"; token: string; expiresAt: Date } | { kind: "MFA_REQUIRED"; challengeId: string; devCode?: string };

@Injectable()
export class IdentityService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly otp: OtpService,
    private readonly audit: AuditService,
    private readonly limiter: RateLimitService,
  ) {}

  /**
   * Inscription : organisation + personne + utilisateur dans une transaction, puis code de vérification d'email.
   * L'attribution est capturée ici et devient immuable (trigger en base). Le marketing n'est jamais pré-coché.
   */
  async register(req: RegisterRequest, ip: string, correlationId: string): Promise<{ userId: string; organisationId: string; emailChallengeId: string; devCode?: string }> {
    await this.limiter.hit("register:ip", ip, RULES.REGISTER_PER_IP);
    const existing = await this.db.select({ id: users.id }).from(users).where(eq(users.email, req.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      throw new DealPmeError(ErrorCode.CONFLICT, "Un compte existe déjà avec cet email");
    }
    const now = new Date();
    const organisationId = newId();
    const personId = newId();
    const userId = newId();
    const passwordHash = await this.passwords.hash(req.password);

    await this.db.transaction(async (tx) => {
      await tx.insert(organisations).values({
        id: organisationId,
        name: req.organisationName,
        attributionChannel: req.attribution.channel,
        attributionCampaignId: req.attribution.campaignId,
        attributionReferralCode: req.attribution.referralCode,
      });
      await tx.insert(persons).values({ id: personId, legalName: req.organisationName });
      await tx.insert(users).values({
        id: userId,
        organisationId,
        personId,
        email: req.email.toLowerCase(),
        phoneE164: req.phoneE164,
        passwordHash,
        roles: [req.role],
        consentTermsAt: now,
        consentPrivacyAt: now,
        consentMarketingAt: req.consents.marketingOptIn ? now : null,
      });
    });
    this.audit.record({ action: "USER_REGISTERED", actorUserId: userId, subjectType: "user", subjectId: userId, outcome: "OK", correlationId });
    const challenge = await this.otp.issue(userId, "EMAIL_VERIFY", { email: req.email.toLowerCase() }, correlationId);
    return { userId, organisationId, emailChallengeId: challenge.challengeId, ...(challenge.devCode ? { devCode: challenge.devCode } : {}) };
  }

  async verifyEmail(challengeId: string, code: string, correlationId: string): Promise<void> {
    const { userId, purpose } = await this.otp.verify(challengeId, code, correlationId);
    if (purpose !== "EMAIL_VERIFY") throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Code invalide pour cet usage");
    await this.db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    this.audit.record({ action: "EMAIL_VERIFIED", actorUserId: userId, subjectType: "user", subjectId: userId, outcome: "OK", correlationId });
  }

  /**
   * Connexion protégée contre la force brute (S02) et à second facteur obligatoire pour les rôles sensibles (S03).
   * Réponse identique que l'email existe ou non. Un email non vérifié bloque la connexion.
   */
  async login(email: string, password: string, ip: string, deviceLabel: string | null, correlationId: string): Promise<LoginOutcome> {
    const account = email.toLowerCase();
    const ipFp = RateLimitService.fingerprint(ip);
    await this.limiter.hit("login:ip", ip, RULES.LOGIN_PER_IP);
    await this.limiter.assertNotLocked(account);

    const row = (await this.db.select().from(users).where(eq(users.email, account)).limit(1))[0];
    const ok = row ? await this.passwords.verify(row.passwordHash, password) : false;
    if (!row || !ok) {
      this.audit.record({ action: "LOGIN_FAILED", actorUserId: row?.id ?? null, subjectType: "account", subjectId: RateLimitService.fingerprint(account), outcome: "FAILED", correlationId, metadata: { ipFp } });
      const locked = await this.limiter.recordFailure(account);
      if (locked > 0) {
        this.audit.record({ action: "ACCOUNT_LOCKED", actorUserId: row?.id ?? null, subjectType: "account", subjectId: RateLimitService.fingerprint(account), outcome: "BLOCKED", correlationId, metadata: { lockSeconds: locked } });
      }
      try {
        await this.limiter.hit("login:account", account, RULES.LOGIN_FAILURES_PER_ACCOUNT);
      } catch (e) {
        if (e instanceof DealPmeError && e.code === ErrorCode.RATE_LIMITED) {
          this.audit.record({ action: "RATE_LIMITED", actorUserId: null, subjectType: "account", subjectId: RateLimitService.fingerprint(account), outcome: "BLOCKED", correlationId });
        }
        throw e;
      }
      throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Identifiants invalides");
    }
    await this.limiter.clearFailures(account);

    if (!row.emailVerifiedAt) {
      throw new DealPmeError(ErrorCode.FORBIDDEN, "Adresse email non vérifiée", { reason: "EMAIL_NOT_VERIFIED" });
    }

    const roles = row.roles as string[];
    if (roles.some((r) => MFA_REQUIRED_ROLES.includes(r))) {
      if (!row.phoneE164) {
        throw new DealPmeError(ErrorCode.FORBIDDEN, "Second facteur obligatoire pour ce rôle : aucun téléphone enregistré", { reason: "MFA_PHONE_MISSING" });
      }
      const challenge = await this.otp.issue(row.id, "LOGIN_MFA", { phoneE164: row.phoneE164 }, correlationId);
      return { kind: "MFA_REQUIRED", challengeId: challenge.challengeId, ...(challenge.devCode ? { devCode: challenge.devCode } : {}) };
    }

    const session = await this.sessions.create(row.id, deviceLabel, ipFp);
    this.audit.record({ action: "SESSION_CREATED", actorUserId: row.id, subjectType: "user", subjectId: row.id, outcome: "OK", correlationId, metadata: { ipFp } });
    return { kind: "SESSION", token: session.token, expiresAt: session.expiresAt };
  }

  /** Second facteur : le code consommé ouvre la session. */
  async completeMfa(challengeId: string, code: string, ip: string, deviceLabel: string | null, correlationId: string): Promise<{ token: string; expiresAt: Date }> {
    const { userId, purpose } = await this.otp.verify(challengeId, code, correlationId);
    if (purpose !== "LOGIN_MFA") throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Code invalide pour cet usage");
    const session = await this.sessions.create(userId, deviceLabel, RateLimitService.fingerprint(ip));
    this.audit.record({ action: "SESSION_CREATED", actorUserId: userId, subjectType: "user", subjectId: userId, outcome: "OK", correlationId, metadata: { mfa: true } });
    return session;
  }
}
