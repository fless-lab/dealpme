import { Inject, Injectable } from "@nestjs/common";
import { desc } from "drizzle-orm";
import { newId } from "@dealpme/domain";
import { RPS_DB, type RpsDb } from "../database/rps-db.js";
import { regulatoryLogEntries } from "../database/schema.js";
import { GENESIS_HASH, computeHash } from "./hash-chain.js";

/** Écriture append-only dans le journal réglementaire, chaînée par hachage. */
@Injectable()
export class LedgerService {
  constructor(@Inject(RPS_DB) private readonly db: RpsDb) {}

  async append(action: string, payload: Record<string, unknown>, dealId: string | null): Promise<{ sequence: number; hash: string }> {
    return this.db.transaction(async (tx) => {
      const last = (await tx.select({ sequence: regulatoryLogEntries.sequence, hash: regulatoryLogEntries.hash }).from(regulatoryLogEntries).orderBy(desc(regulatoryLogEntries.sequence)).limit(1))[0];
      const sequence = (last?.sequence ?? 0) + 1;
      const previousHash = last?.hash ?? GENESIS_HASH;
      const recordedAt = new Date();
      const hash = computeHash({ sequence, previousHash, action, payload, recordedAt: recordedAt.toISOString() });
      await tx.insert(regulatoryLogEntries).values({ id: newId(), sequence, dealId, action, payload, previousHash, hash, recordedAt });
      return { sequence, hash };
    });
  }
}
