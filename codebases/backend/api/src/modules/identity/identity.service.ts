import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DealPmeError, ErrorCode, type RegisterRequest } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { organisations, persons, users } from "../../database/schema/core.js";
import { AuditService } from "../../platform/audit.service.js";
import { PasswordService } from "./password.service.js";
import { SessionService } from "./session.service.js";

@Injectable()
export class IdentityService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Inscription : organisation + personne + utilisateur dans une transaction.
   * L'attribution est capturée ici et devient immuable (trigger en base).
   * Les consentements sont horodatés séparément ; le marketing n'est jamais pré-coché.
   */
  async register(req: RegisterRequest, correlationId: string): Promise<{ userId: string; organisationId: string }> {
    const existing = await this.db.select({ id: users.id }).from(users).where(eq(users.email, req.email)).limit(1);
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
        email: req.email,
        phoneE164: req.phoneE164,
        passwordHash,
        roles: [req.role],
        consentTermsAt: now,
        consentPrivacyAt: now,
        consentMarketingAt: req.consents.marketingOptIn ? now : null,
      });
    });

    this.audit.record({ action: "USER_REGISTERED", actorUserId: userId, subjectType: "user", subjectId: userId, outcome: "OK", correlationId });
    return { userId, organisationId };
  }

  async login(email: string, password: string, deviceLabel: string | null, correlationId: string): Promise<{ token: string; expiresAt: Date }> {
    const row = (await this.db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    // Réponse identique que l'email existe ou non : pas d'énumération de comptes.
    const ok = row ? await this.passwords.verify(row.passwordHash, password) : false;
    if (!row || !ok) {
      throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Identifiants invalides");
    }
    const session = await this.sessions.create(row.id, deviceLabel, null);
    this.audit.record({ action: "SESSION_CREATED", actorUserId: row.id, subjectType: "user", subjectId: row.id, outcome: "OK", correlationId });
    return session;
  }
}
