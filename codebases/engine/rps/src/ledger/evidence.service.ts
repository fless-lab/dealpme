import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { RPS_DB, type RpsDb } from "../database/rps-db.js";
import { admissionDecisions, circles, disclosures, regulatoryLogEntries } from "../database/schema.js";
import { countDisclosedPersons } from "../gate/circle.js";
import { GENESIS_HASH, computeHash, verifyChain, type ChainedEntry } from "./hash-chain.js";

/**
 * Pack de preuves d'un dossier (DP-RPS-010). Il répond à une seule question, posée un jour par un juge,
 * un régulateur ou un conseil : qui a su quoi, quand, et sur décision de qui.
 *
 * Le pack ne contient aucun contenu confidentiel, seulement des identifiants et des décisions. Il est
 * vérifiable sans accès au code : la méthode de hachage est décrite dedans, et chaque entrée porte le
 * hash de la précédente. Une entrée retouchée ou retirée casse la chaîne à un endroit nommé.
 */
@Injectable()
export class EvidenceService {
  constructor(@Inject(RPS_DB) private readonly db: RpsDb) {}

  /**
   * Vérification de la chaîne complète. Elle porte sur toutes les entrées, pas seulement sur celles d'un
   * dossier : c'est la chaîne entière qui garantit qu'aucune entrée n'a été retirée entre deux autres.
   */
  async verifyLedger(): Promise<{ entries: number; valid: boolean; brokenAt: number | null; lastHash: string }> {
    const rows = await this.db
      .select({
        sequence: regulatoryLogEntries.sequence,
        previousHash: regulatoryLogEntries.previousHash,
        action: regulatoryLogEntries.action,
        payload: regulatoryLogEntries.payload,
        recordedAt: regulatoryLogEntries.recordedAt,
        hash: regulatoryLogEntries.hash,
      })
      .from(regulatoryLogEntries)
      .orderBy(asc(regulatoryLogEntries.sequence));
    const chain: ChainedEntry[] = rows.map((r) => ({
      sequence: r.sequence,
      previousHash: r.previousHash,
      action: r.action,
      payload: r.payload as Record<string, unknown>,
      recordedAt: r.recordedAt.toISOString(),
      hash: r.hash,
    }));
    const result = verifyChain(chain);
    return { entries: chain.length, valid: result.valid, brokenAt: result.brokenAt, lastHash: chain[chain.length - 1]?.hash ?? GENESIS_HASH };
  }

  /**
   * Pack d'un dossier : paramètres du cercle, personnes admises en vigueur, décisions d'admission, et
   * les entrées du journal qui concernent ce dossier, avec leur position dans la chaîne globale.
   */
  async packFor(dealId: string) {
    const circle = (await this.db.select().from(circles).where(eq(circles.dealId, dealId)).limit(1))[0];
    const allDisclosures = await this.db.select().from(disclosures).where(eq(disclosures.dealId, dealId)).orderBy(asc(disclosures.grantedAt));
    const active = await this.db.select().from(disclosures).where(eq(disclosures.dealId, dealId)).then((rows) => rows.filter((r) => !r.revokedAt));
    const decisions = await this.db.select().from(admissionDecisions).where(eq(admissionDecisions.dealId, dealId)).orderBy(asc(admissionDecisions.decidedAt));
    const entries = await this.db
      .select({
        sequence: regulatoryLogEntries.sequence,
        previousHash: regulatoryLogEntries.previousHash,
        action: regulatoryLogEntries.action,
        payload: regulatoryLogEntries.payload,
        recordedAt: regulatoryLogEntries.recordedAt,
        hash: regulatoryLogEntries.hash,
      })
      .from(regulatoryLogEntries)
      .where(eq(regulatoryLogEntries.dealId, dealId))
      .orderBy(asc(regulatoryLogEntries.sequence));

    const ledger = await this.verifyLedger();

    return {
      dossier: dealId,
      genereLe: new Date().toISOString(),
      avertissement:
        "Pack de preuves du périmètre réglementaire. Il retrace qui a eu accès à quel palier d'information, quand, et sur décision de qui. Il ne contient aucun élément confidentiel du dossier.",
      cercle: circle
        ? {
            typeDeCession: circle.dealType,
            formeJuridique: circle.legalForm,
            plafond: circle.cap,
            admissionHumaineObligatoire: circle.manualAdmissionOnly === 1,
            personnesEnVigueur: countDisclosedPersons(active.map((d) => ({ personId: d.personId, relatedPersonGroupId: d.relatedPersonGroupId, tier: d.tier, revokedAt: d.revokedAt }))),
            creeLe: circle.createdAt.toISOString(),
          }
        : null,
      divulgations: allDisclosures.map((d) => ({
        personne: d.personId,
        groupeDePersonnesLiees: d.relatedPersonGroupId,
        palier: d.tier,
        accordeeLe: d.grantedAt.toISOString(),
        accordeePar: d.grantedBy,
        fondement: d.basis,
        revoqueeLe: d.revokedAt?.toISOString() ?? null,
      })),
      decisionsDAdmission: decisions.map((d) => ({
        personne: d.personId,
        decision: d.decision,
        deciseePar: d.decidedBy,
        justification: d.justification,
        deciseeLe: d.decidedAt.toISOString(),
      })),
      journal: entries.map((e) => ({
        sequence: e.sequence,
        action: e.action,
        contenu: e.payload,
        enregistreLe: e.recordedAt.toISOString(),
        hashPrecedent: e.previousHash,
        hash: e.hash,
      })),
      integrite: {
        methode: "SHA-256 sur sequence | hashPrecedent | action | contenu canonique | enregistreLe",
        entreesDansLaChaine: ledger.entries,
        chaineValide: ledger.valid,
        rompueALaSequence: ledger.brokenAt,
        dernierHash: ledger.lastHash,
        verification:
          "Recalculez chaque hash à partir des champs listés, dans cet ordre, séparés par une barre verticale. Le contenu est sérialisé avec ses clés triées récursivement. Chaque entrée doit porter le hash de la précédente ; la première porte soixante-quatre zéros.",
      },
    };
  }

  /** Recalcule un hash à partir des champs publiés : sert aux tests et à quiconque veut vérifier à la main. */
  static recompute(entry: { sequence: number; previousHash: string; action: string; payload: Record<string, unknown>; recordedAt: string }): string {
    return computeHash(entry);
  }
}
