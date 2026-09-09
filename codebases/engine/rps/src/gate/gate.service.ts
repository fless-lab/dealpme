import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { DisclosureTier, newId, type DealType } from "@dealpme/domain";
import { RPS_DB, type RpsDb } from "../database/rps-db.js";
import { admissionDecisions, circles, disclosures } from "../database/schema.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { circleStatus, decideCommunication, decidePublication, type CircleStatus, type PublicationRequest } from "./circle.js";

@Injectable()
export class GateService {
  constructor(
    @Inject(RPS_DB) private readonly db: RpsDb,
    private readonly ledger: LedgerService,
  ) {}

  async ensureCircle(dealId: string, dealType: DealType, legalForm: string | null, cap: number): Promise<void> {
    const existing = (await this.db.select().from(circles).where(eq(circles.dealId, dealId)).limit(1))[0];
    if (!existing) {
      await this.db.insert(circles).values({ dealId, dealType, legalForm, cap });
      await this.ledger.append("CIRCLE_CREATED", { dealId, dealType, cap }, dealId);
    }
  }

  async status(dealId: string): Promise<CircleStatus> {
    const circle = (await this.db.select().from(circles).where(eq(circles.dealId, dealId)).limit(1))[0];
    if (!circle) throw new DealPmeError(ErrorCode.NOT_FOUND, "Cercle inconnu pour ce dossier");
    const rows = await this.db.select().from(disclosures).where(eq(disclosures.dealId, dealId));
    return circleStatus(rows, circle.cap);
  }

  /** Vérification de publication : appelée par l'API avant toute mise en ligne. Décision journalisée dans les deux cas. */
  async checkPublication(dealId: string, req: PublicationRequest) {
    const decision = decidePublication(req);
    await this.ledger.append(decision.allowed ? "PUBLICATION_PERMITTED" : "PUBLICATION_BLOCKED", { dealId, ...req, reason: decision.allowed ? null : decision.reason }, dealId);
    return decision;
  }

  /**
   * Admission au cercle : décision humaine obligatoire (DP-RPS-031). decidedBy est l'opérateur de conformité.
   * Refusée si le cercle est plein ; en mode MANUAL_ADMISSION (>= 80 %) la justification est exigée et tracée.
   */
  async admit(dealId: string, personId: string, decidedBy: string, justification: string, relatedPersonGroupId: string | null) {
    const status = await this.status(dealId);
    if (status.mode === "FULL") {
      await this.db.insert(admissionDecisions).values({ id: newId(), dealId, personId, decision: "WAITLISTED", decidedBy, justification });
      await this.ledger.append("ADMISSION_WAITLISTED", { dealId, personId, decidedBy, count: status.count, cap: status.cap }, dealId);
      throw new DealPmeError(ErrorCode.PERIMETER_BLOCKED, "Plafond du cercle atteint : admission impossible tant qu'une personne n'est pas retirée", status);
    }
    if (justification.trim().length < 10) {
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Une justification écrite est obligatoire pour toute admission");
    }
    await this.db.transaction(async (tx) => {
      await tx.insert(admissionDecisions).values({ id: newId(), dealId, personId, decision: "ADMITTED", decidedBy, justification });
      await tx.insert(disclosures).values({ id: newId(), dealId, personId, tier: DisclosureTier.T1, grantedBy: decidedBy, basis: justification, relatedPersonGroupId });
    });
    await this.ledger.append("PERSON_ADMITTED", { dealId, personId, decidedBy, tier: DisclosureTier.T1, mode: status.mode }, dealId);
    return this.status(dealId);
  }

  /** Révocation : nouvelle ligne datée, la ligne d'origine n'est jamais supprimée. */
  async revoke(dealId: string, personId: string, decidedBy: string, justification: string) {
    const rows = await this.db.select().from(disclosures).where(and(eq(disclosures.dealId, dealId), eq(disclosures.personId, personId)));
    for (const r of rows.filter((x) => !x.revokedAt)) {
      await this.db.update(disclosures).set({ revokedAt: new Date() }).where(eq(disclosures.id, r.id));
    }
    await this.db.insert(admissionDecisions).values({ id: newId(), dealId, personId, decision: "REVOKED", decidedBy, justification });
    await this.ledger.append("PERSON_REVOKED", { dealId, personId, decidedBy }, dealId);
  }

  async checkCommunication(dealId: string, dealType: DealType, recipientTier: DisclosureTier, containsSensitiveTerms: boolean) {
    const decision = decideCommunication(dealType, recipientTier, containsSensitiveTerms);
    await this.ledger.append("COMMUNICATION_GATED", { dealId, recipientTier, decision }, dealId);
    return { decision };
  }
}
