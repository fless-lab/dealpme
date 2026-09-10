import { Inject, Injectable } from "@nestjs/common";
import type { IndicativeValuationRequest } from "@dealpme/contracts";
import { newId, xof } from "@dealpme/domain";
import { indicativeRange, type IndicativeRange } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { indicativeValuations } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { FieldCrypto } from "../../platform/field-crypto.service.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";

/**
 * Évaluation financière sommaire (P05). Les multiples proviennent d'une table sourcée et datée ;
 * en V1 une grille synthétique par secteur, étiquetée comme telle. Jamais présentée comme un avis DealPME.
 */
const SYNTHETIC_MULTIPLES = { low: 4, high: 6, source: "Grille sectorielle synthétique de démonstration", asOf: "2026-09-01" };

@Injectable()
export class ValuationService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly audit: AuditService,
    private readonly crypto: FieldCrypto,
  ) {}

  async compute(req: IndicativeValuationRequest, actor: Principal, correlationId: string): Promise<IndicativeRange> {
    const range = indicativeRange({ ebitdaXof: xof(req.ebitdaXof), netDebtXof: req.netDebtXof, restatements: req.restatements, multiples: SYNTHETIC_MULTIPLES });
    // La politique RLS n'accepte l'écriture que si le dossier appartient à l'organisation du principal.
    await withTenant(this.db, actor, (tx) => tx.insert(indicativeValuations).values({
      id: newId(),
      dealId: req.dealId,
      method: range.method,
      equityLowEnc: this.crypto.encryptInt(range.equityValueLowXof)!,
      equityHighEnc: this.crypto.encryptInt(range.equityValueHighXof)!,
      calculationLog: range.calculationLog,
      sources: range.sources,
      computedBy: actor.userId,
    }));
    this.audit.record({ action: "VALUATION_COMPUTED", actorUserId: actor.userId, subjectType: "deal", subjectId: req.dealId, outcome: "OK", correlationId });
    return range;
  }
}
