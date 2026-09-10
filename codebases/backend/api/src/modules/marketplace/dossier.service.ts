import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { AntivirusPort } from "@dealpme/connector-antivirus";
import type { StoragePort } from "@dealpme/connector-storage";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { DealType, newId } from "@dealpme/domain";
import { completeness, requirementsFor, type Completeness, type Requirement } from "@dealpme/rules";
import { loadEnv } from "../../config/env.js";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { dealDocuments, deals, declaredFacts } from "../../database/schema/core.js";
import { withTenant, type CoreTx } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { ANTIVIRUS_PORT, STORAGE_PORT } from "./dossier.providers.js";

/**
 * Types de fichiers acceptés pour une pièce de dossier. Liste fermée : un type absent est refusé avec
 * son nom, jamais accepté puis ignoré. Les bureautiques sont admis parce que les états financiers
 * circulent sous cette forme au Togo ; ils passent par l'antivirus comme les autres et ne sont jamais exécutés.
 */
const ACCEPTED: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "image JPEG",
  "image/png": "image PNG",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "classeur Excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document Word",
};

export interface UploadedFile {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class DossierService {
  private readonly bucket = loadEnv().S3_BUCKET_DOSSIER;
  private readonly maxBytes = loadEnv().DOSSIER_MAX_FILE_BYTES;

  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(ANTIVIRUS_PORT) private readonly antivirus: AntivirusPort,
    private readonly audit: AuditService,
  ) {}

  /**
   * Dossier complet vu par son propriétaire : exigences, valeurs déclarées en vigueur, pièces propres,
   * complétude et liste des manques. Un dossier invisible par RLS renvoie NOT_FOUND.
   */
  async getDossier(dealId: string, principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      const deal = await this.mustFindDeal(tx, dealId);
      const facts = await this.currentFacts(tx, dealId);
      const documents = await this.currentDocuments(tx, dealId);
      const status = this.completenessOf(deal.dealType as DealType, facts, documents);
      return {
        dealId,
        dealType: deal.dealType,
        status: deal.status,
        requirements: requirementsFor(deal.dealType as DealType),
        facts,
        documents,
        completeness: status,
      };
    });
  }

  /**
   * Déclaration d'une valeur. Jamais de mise à jour sur place : une correction crée une version et
   * chaîne l'ancienne, qui reste consultable avec sa date et sa source (provenance vérifiable).
   */
  async declareFact(
    dealId: string,
    input: { fieldKey: string; periodLabel?: string | null; valueText?: string | null; valueAmountXof?: number | null; source: "SELLER_DECLARATION" | "SUPPORTING_DOCUMENT" | "REGISTRY" | "EXPERT_REVIEW"; sourceDocumentId?: string | null; note?: string | null },
    seller: Principal,
    correlationId: string,
  ): Promise<{ factId: string; version: number }> {
    if ((input.valueText ?? null) === null && (input.valueAmountXof ?? null) === null) {
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Une valeur déclarée doit porter un texte ou un montant");
    }
    const id = newId();
    const version = await withTenant(this.db, seller, async (tx) => {
      const deal = await this.mustFindDeal(tx, dealId);
      this.mustOwn(deal, seller);
      const previous = (
        await tx
          .select({ id: declaredFacts.id, version: declaredFacts.version })
          .from(declaredFacts)
          .where(and(eq(declaredFacts.dealId, dealId), eq(declaredFacts.fieldKey, input.fieldKey), isNull(declaredFacts.supersededAt)))
          .orderBy(desc(declaredFacts.version))
          .limit(1)
      )[0];
      const next = (previous?.version ?? 0) + 1;
      await tx.insert(declaredFacts).values({
        id,
        dealId,
        fieldKey: input.fieldKey,
        periodLabel: input.periodLabel ?? null,
        valueText: input.valueText ?? null,
        valueAmountXof: input.valueAmountXof ?? null,
        source: input.source,
        sourceDocumentId: input.sourceDocumentId ?? null,
        note: input.note ?? null,
        version: next,
        supersedesId: previous?.id ?? null,
        declaredBy: seller.userId,
      });
      if (previous) {
        await tx.update(declaredFacts).set({ supersededAt: new Date() }).where(eq(declaredFacts.id, previous.id));
      }
      return next;
    });
    this.audit.record({ action: "DEAL_FACT_DECLARED", actorUserId: seller.userId, subjectType: "deal", subjectId: dealId, outcome: "OK", correlationId, metadata: { fieldKey: input.fieldKey, version } });
    return { factId: id, version };
  }

  /** Historique d'une valeur : toutes les versions, de la plus récente à la première. */
  async factHistory(dealId: string, fieldKey: string, principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      await this.mustFindDeal(tx, dealId);
      const rows = await tx
        .select()
        .from(declaredFacts)
        .where(and(eq(declaredFacts.dealId, dealId), eq(declaredFacts.fieldKey, fieldKey)))
        .orderBy(desc(declaredFacts.version));
      return { items: rows };
    });
  }

  /**
   * Dépôt d'une pièce. Ordre imposé : contrôle du type et de la taille, analyse antivirus, puis seulement
   * écriture sur le stockage chiffré. Une pièce infectée n'est jamais écrite ; le refus est journalisé
   * avec la signature du moteur. Le fichier ne reçoit jamais d'URL publique : il se lit par l'API.
   */
  async uploadDocument(
    dealId: string,
    input: { category: string; title: string; file: UploadedFile },
    seller: Principal,
    correlationId: string,
  ): Promise<{ documentId: string; version: number; sha256: string }> {
    const { file } = input;
    if (!ACCEPTED[file.mimeType]) {
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, `Type de fichier non accepté (${file.mimeType}). Formats acceptés : ${Object.values(ACCEPTED).join(", ")}.`);
    }
    if (file.size > this.maxBytes) {
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, `Fichier trop volumineux : ${Math.round(file.size / 1024 / 1024)} Mo pour un maximum de ${Math.round(this.maxBytes / 1024 / 1024)} Mo.`);
    }

    const verdict = await this.antivirus.scan(file.buffer);
    if (!verdict.clean) {
      this.audit.record({
        action: "DOCUMENT_REJECTED_INFECTED",
        actorUserId: seller.userId,
        subjectType: "deal",
        subjectId: dealId,
        outcome: "BLOCKED",
        correlationId,
        metadata: { category: input.category, fileName: file.originalName, signature: verdict.signature, engine: this.antivirus.engine },
      });
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Fichier refusé par l'analyse antivirus. Il n'a pas été enregistré.", { signature: verdict.signature });
    }

    const id = newId();
    const key = `deal/${dealId}/${input.category}/${id}`;
    const stored = await this.storage.put({ bucket: this.bucket, key, body: file.buffer, contentType: file.mimeType, classification: "CONFIDENTIAL_DEAL" });

    const version = await withTenant(this.db, seller, async (tx) => {
      const deal = await this.mustFindDeal(tx, dealId);
      this.mustOwn(deal, seller);
      const previous = (
        await tx
          .select({ id: dealDocuments.id, version: dealDocuments.version })
          .from(dealDocuments)
          .where(and(eq(dealDocuments.dealId, dealId), eq(dealDocuments.category, input.category), isNull(dealDocuments.supersededAt)))
          .orderBy(desc(dealDocuments.version))
          .limit(1)
      )[0];
      const next = (previous?.version ?? 0) + 1;
      await tx.insert(dealDocuments).values({
        id,
        dealId,
        category: input.category,
        title: input.title,
        fileName: file.originalName.slice(0, 260),
        contentType: file.mimeType,
        sizeBytes: file.size,
        sha256: stored.sha256,
        storageKey: key,
        storageVersionId: stored.versionId,
        version: next,
        supersedesId: previous?.id ?? null,
        scanState: "CLEAN",
        scanEngine: this.antivirus.engine,
        uploadedBy: seller.userId,
      });
      if (previous) {
        await tx.update(dealDocuments).set({ supersededAt: new Date() }).where(eq(dealDocuments.id, previous.id));
      }
      return next;
    });

    this.audit.record({ action: "DOCUMENT_UPLOADED", actorUserId: seller.userId, subjectType: "deal", subjectId: dealId, outcome: "OK", correlationId, metadata: { category: input.category, sha256: stored.sha256, version } });
    return { documentId: id, version, sha256: stored.sha256 };
  }

  /**
   * Contenu d'une pièce. Il transite par l'API : le stockage n'expose aucune URL, et la lecture est
   * tracée. Une pièce hors du périmètre du lecteur est introuvable, pas interdite.
   */
  async readDocument(dealId: string, documentId: string, principal: Principal, correlationId: string): Promise<{ body: Uint8Array; contentType: string; fileName: string }> {
    const row = await withTenant(this.db, principal, async (tx) => {
      await this.mustFindDeal(tx, dealId);
      return (await tx.select().from(dealDocuments).where(and(eq(dealDocuments.id, documentId), eq(dealDocuments.dealId, dealId))).limit(1))[0];
    });
    if (!row || row.scanState !== "CLEAN") throw new DealPmeError(ErrorCode.NOT_FOUND, "Pièce introuvable");
    const body = await this.storage.get(this.bucket, row.storageKey);
    this.audit.record({ action: "DOCUMENT_READ", actorUserId: principal.userId, subjectType: "deal_document", subjectId: documentId, outcome: "OK", correlationId });
    return { body, contentType: row.contentType, fileName: row.fileName };
  }

  /** Complétude du dossier et liste des manques, sans effet de bord : l'assistant l'affiche à chaque étape. */
  async completenessOfDeal(dealId: string, principal: Principal): Promise<Completeness & { requirements: Requirement[] }> {
    return withTenant(this.db, principal, async (tx) => {
      const deal = await this.mustFindDeal(tx, dealId);
      const facts = await this.currentFacts(tx, dealId);
      const documents = await this.currentDocuments(tx, dealId);
      return { ...this.completenessOf(deal.dealType as DealType, facts, documents), requirements: requirementsFor(deal.dealType as DealType) };
    });
  }

  /**
   * Porte de soumission (P04) : un dossier incomplet reste en DRAFT. La liste des manques accompagne
   * toujours le refus, pour que le cédant sache quoi produire.
   */
  async assertSubmittable(dealId: string, principal: Principal): Promise<void> {
    const status = await this.completenessOfDeal(dealId, principal);
    if (!status.complete) {
      throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "Le dossier reste en préparation tant que des éléments manquent.", {
        reason: "DOSSIER_INCOMPLETE",
        missing: status.missing,
      });
    }
  }

  // ---------------------------------------------------------------- internes

  private completenessOf(dealType: DealType, facts: { fieldKey: string }[], documents: { category: string }[]): Completeness {
    return completeness({ dealType, factKeys: facts.map((f) => f.fieldKey), documentCategories: documents.map((d) => d.category) });
  }

  private async currentFacts(tx: CoreTx, dealId: string) {
    return tx
      .select()
      .from(declaredFacts)
      .where(and(eq(declaredFacts.dealId, dealId), isNull(declaredFacts.supersededAt)))
      .orderBy(asc(declaredFacts.fieldKey));
  }

  private async currentDocuments(tx: CoreTx, dealId: string) {
    return tx
      .select({
        id: dealDocuments.id,
        category: dealDocuments.category,
        title: dealDocuments.title,
        fileName: dealDocuments.fileName,
        contentType: dealDocuments.contentType,
        sizeBytes: dealDocuments.sizeBytes,
        sha256: dealDocuments.sha256,
        version: dealDocuments.version,
        scanState: dealDocuments.scanState,
        scanEngine: dealDocuments.scanEngine,
        uploadedAt: dealDocuments.uploadedAt,
      })
      .from(dealDocuments)
      .where(and(eq(dealDocuments.dealId, dealId), isNull(dealDocuments.supersededAt), eq(dealDocuments.scanState, "CLEAN")))
      .orderBy(asc(dealDocuments.category));
  }

  private async mustFindDeal(tx: CoreTx, dealId: string) {
    const deal = (await tx.select({ id: deals.id, dealType: deals.dealType, status: deals.status, sellerOrganisationId: deals.sellerOrganisationId }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
    if (!deal) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
    return deal;
  }

  private mustOwn(deal: { sellerOrganisationId: string }, principal: Principal): void {
    if (deal.sellerOrganisationId !== principal.organisationId) {
      throw new DealPmeError(ErrorCode.FORBIDDEN, "Seul le cédant propriétaire alimente ce dossier");
    }
  }
}
