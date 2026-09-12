import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/** Base jetable dans le serveur CI : rejouer une mise à niveau avec de vrais messages historiques. */
export async function verifyHistoricalMigration(admin, root) {
  const database = `l02_migration_${process.pid}`;
  await admin.unsafe(`CREATE DATABASE ${database}`);
  const url = new URL(process.env.DATABASE_URL_CORE_ADMIN);
  url.pathname = `/${database}`;
  const db = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const dir = join(root, "codebases/backend/api/drizzle/core");
  try {
    for (const file of ["0000_pale_khan.sql", "0001_classy_shadowcat.sql", "0002_tricky_wild_pack.sql", "0003_youthful_james_howlett.sql"]) {
      for (const statement of readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint")) await db.unsafe(statement);
    }
    // Les protections de l'ancien schéma sont actives au moment de la reprise.
    await db.unsafe(readFileSync(join(dir, "rls.sql"), "utf8"));
    const ids = Array.from({ length: 14 }, (_, i) => `018f0000-0000-7000-8000-${String(i + 1).padStart(12, "0")}`);
    const [sellerOrg, orgA, orgB, seller, userA, userB, company, deal, interestA, interestB, msgA, oldSeller, explicitSeller, msgB] = ids;
    for (const [org, user] of [[sellerOrg, seller], [orgA, userA], [orgB, userB]]) {
      await db`INSERT INTO organisation(id,name,attribution_channel) VALUES(${org},'Migration synthétique','TEST')`;
      await db`INSERT INTO person(id,legal_name) VALUES(${user},'Synthétique')`;
      await db`INSERT INTO app_user(id,organisation_id,person_id,email,password_hash,consent_terms_at,consent_privacy_at) VALUES(${user},${org},${user},${`${user}@migration.invalid`},'not-a-password',now(),now())`;
    }
    await db`INSERT INTO company(id,owner_organisation_id,legal_name,legal_form) VALUES(${company},${sellerOrg},'Migration','SARL')`;
    await db`INSERT INTO deal(id,company_id,seller_organisation_id,deal_type,status,sector_code,region_code,turnover_band) VALUES(${deal},${company},${sellerOrg},'ASSET_DEAL','LISTED_OPEN','TEST','KARA','LT_50M')`;
    for (const [id, user] of [[interestA, userA], [interestB, userB]]) await db`INSERT INTO interest(id,deal_id,investor_user_id) VALUES(${id},${deal},${user})`;
    for (const [id, interest, user, org, body] of [
      [msgA, interestA, userA, orgA, 'Question historique Alpha'],
      [msgB, interestB, userB, orgB, 'Question historique Beta'],
      [oldSeller, null, seller, sellerOrg, 'Réponse sans destinataire connu'],
      [explicitSeller, interestA, seller, sellerOrg, 'Réponse avec intérêt explicite'],
    ]) await db`INSERT INTO deal_message(id,deal_id,interest_id,sender_user_id,sender_organisation_id,body) VALUES(${id},${deal},${interest},${user},${org},${body})`;
    const before = await db`SELECT * FROM deal_message ORDER BY id`;
    await db.begin(async (tx) => {
      for (const statement of readFileSync(join(dir, "0004_conversation_routing.sql"), "utf8").split("--> statement-breakpoint")) await tx.unsafe(statement);
    });
    const after = await db`SELECT * FROM deal_message ORDER BY id`;
    assert.deepEqual(after.map((row) => { const original = { ...row }; delete original.conversation_id; return original; }), Array.from(before));
    assert.equal(after.find((r) => r.id === oldSeller).conversation_id, null);
    assert.equal(after.find((r) => r.id === msgA).conversation_id, interestA);
    assert.equal(after.find((r) => r.id === explicitSeller).conversation_id, interestA);
    await db.unsafe(readFileSync(join(dir, "rls.sql"), "utf8")); // ne doit pas réouvrir une politique permissive
    for (const [org, user, expected] of [[orgA, userA, [msgA, explicitSeller]], [orgB, userB, [msgB]], [sellerOrg, seller, [msgA, oldSeller, explicitSeller, msgB]]]) {
      const visible = await db.begin(async (tx) => {
        await tx`SET LOCAL ROLE dealpme_api`;
        await tx`SELECT set_config('app.organisation_id',${org},true),set_config('app.user_id',${user},true)`;
        return tx`SELECT id FROM deal_message ORDER BY id`;
      });
      assert.deepEqual(visible.map((r) => r.id).sort(), expected.sort());
    }
    await assert.rejects(db`UPDATE deal_message SET body='réécriture interdite' WHERE id=${oldSeller}`);
    await assert.rejects(db`INSERT INTO deal_message(id,deal_id,sender_user_id,sender_organisation_id,body) VALUES(gen_random_uuid(),${deal},${seller},${sellerOrg},'sans cible')`);
  } finally {
    await db.end({ timeout: 5 });
    await admin.unsafe(`DROP DATABASE ${database} WITH (FORCE)`);
  }
}
