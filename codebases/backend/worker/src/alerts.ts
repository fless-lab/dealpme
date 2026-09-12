import postgres, { type Sql, type TransactionSql } from "postgres";
import { newId, type DealType, type RegionCode, type TurnoverBand } from "@dealpme/domain";
import { matchDeal, MATCH_ALERT_THRESHOLD } from "@dealpme/rules";
import type { EmailPort } from "@dealpme/connector-email";
import { TransportError } from "@dealpme/notifications";

type Alert = { id: string; user_id: string; organisation_id: string; sector_code: string | null; region_code: RegionCode | null; turnover_band: TurnoverBand | null; deal_ready_only: boolean; notify_opt_in: boolean; revoked_at: Date | null };
type Teaser = { id: string; deal_type: DealType; sector_code: string; region_code: RegionCode; turnover_band: TurnoverBand; is_deal_ready: boolean };
type Intent = { id: string; alert_id: string; deal_id: string; user_id: string; organisation_id: string; attempts: number; expires_at: Date };
const match = (deal: Teaser, alert: Alert) => matchDeal({ id: deal.id, dealType: deal.deal_type, sectorCode: deal.sector_code, regionCode: deal.region_code, turnoverBand: deal.turnover_band, isDealReady: deal.is_deal_ready }, {
  sectorCodes: alert.sector_code ? [alert.sector_code] : [], regionCodes: alert.region_code ? [alert.region_code] : [],
  turnoverBands: alert.turnover_band ? [alert.turnover_band] : [], dealTypes: ["ASSET_DEAL"], dealReadyOnly: alert.deal_ready_only,
});
async function audit(tx: TransactionSql, id: string, phase: string, attempt: number) {
  await tx`INSERT INTO audit_event(id, action, actor_user_id, subject_type, subject_id, outcome, correlation_id, metadata)
    VALUES(${newId()}, 'ALERT_DELIVERY', NULL, 'notification_intent', ${id}, ${["FAILED", "UNKNOWN"].includes(phase) ? "FAILED" : "OK"}, ${id}, ${tx.json({ phase, attempt })})`;
}

/** Le worker ne reçoit que les colonnes T0 autorisées par son rôle PostgreSQL dédié. */
export class AlertWorker {
  private cursor = "00000000-0000-0000-0000-000000000000";
  readonly db: Sql;
  constructor(url: string, private readonly email: EmailPort, private readonly appBaseUrl: string) {
    if (new URL(url).username !== "dealpme_worker") throw new Error("DATABASE_URL_WORKER doit utiliser dealpme_worker");
    const origin = new URL(appBaseUrl);
    if (!/^https?:$/.test(origin.protocol) || origin.username || origin.password) throw new Error("APP_BASE_URL invalide");
    this.db = postgres(url, { max: 3, connect_timeout: 5, idle_timeout: 20 });
  }

  /** Balayage paginé rejouable : une publication ou une nouvelle alerte ne dépend pas d'un enqueue volatile. */
  async matchBatch(): Promise<number> {
    const alerts = await this.db<Alert[]>`SELECT id,user_id,organisation_id,sector_code,region_code,turnover_band,deal_ready_only,notify_opt_in,revoked_at
      FROM saved_alert WHERE notify_opt_in AND revoked_at IS NULL AND id > ${this.cursor} ORDER BY id LIMIT 50`;
    if (!alerts.length) { this.cursor = "00000000-0000-0000-0000-000000000000"; return 0; }
    let inserted = 0;
    for (const alert of alerts) {
      let cursor = "00000000-0000-0000-0000-000000000000";
      while (true) {
        const deals = await this.db<Teaser[]>`SELECT d.id, d.deal_type, d.sector_code, d.region_code, d.turnover_band,
          coalesce((SELECT c.decision='GRANTED' AND c.registry_invalidated_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now())
            FROM certification c JOIN company co ON co.id=c.company_id AND co.registry_record_id IS NOT NULL
            WHERE c.company_id=d.company_id ORDER BY c.decided_at DESC,c.id DESC LIMIT 1),false) is_deal_ready
          FROM deal d WHERE d.id>${cursor} AND d.deal_type='ASSET_DEAL' AND d.visibility='OPEN'
            AND d.status IN ('LISTED_OPEN','ENGAGED','DUE_DILIGENCE','NEGOTIATION') AND d.seller_organisation_id<>${alert.organisation_id}
          ORDER BY d.id LIMIT 100`;
        if (!deals.length) break;
        for (const deal of deals) {
          const result = match(deal, alert);
          if (result.score < MATCH_ALERT_THRESHOLD) continue;
          inserted += await this.db.begin(async (tx) => {
            const rows = await tx`INSERT INTO notification_intent(id,alert_id,deal_id,user_id,organisation_id,score,reasons,expires_at)
              VALUES(${newId()},${alert.id},${deal.id},${alert.user_id},${alert.organisation_id},${result.score},${tx.json(result.reasons)},now()+interval '24 hours')
              ON CONFLICT(alert_id,deal_id) DO NOTHING RETURNING id`;
            if (rows[0]) await audit(tx, rows[0]["id"] as string, "QUEUED", 0);
            return rows.length;
          });
        }
        cursor = deals.at(-1)!.id;
      }
      this.cursor = alert.id;
    }
    return inserted;
  }

  async deliverOne(): Promise<boolean> {
    // Un crash entre SMTP et commit est indéterminé : aucune réémission automatique.
    await this.db.begin(async (tx) => {
      const lost = await tx`UPDATE notification_intent SET state='UNKNOWN',last_error='WORKER_LOST',updated_at=now(),lease_until=NULL
        WHERE state='SENDING' AND lease_until<now() RETURNING id,attempts`;
      for (const row of lost) await audit(tx, row["id"] as string, "UNKNOWN", row["attempts"] as number);
    });
    const intent = await this.db.begin(async (tx) => {
      const rows = await tx<Intent[]>`SELECT id,alert_id,deal_id,user_id,organisation_id,attempts,expires_at FROM notification_intent
        WHERE state IN ('PENDING','RETRY') AND next_attempt_at<=now() ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1`;
      const row = rows[0];
      if (!row) return null;
      await tx`UPDATE notification_intent SET state='SENDING', attempts=attempts+1,lease_until=now()+interval '2 minutes',updated_at=now() WHERE id=${row.id}`;
      row.attempts++;
      await audit(tx, row.id, "STARTED", row.attempts);
      return row;
    });
    if (!intent) return false;
    await this.db.begin(async (tx) => {
      await tx`SELECT id FROM notification_intent WHERE id=${intent.id} FOR UPDATE`;
      // Les verrous ordonnent la révocation et l'envoi ; un retrait commis avant ce point bloque le transport.
      const alert = (await tx<Alert[]>`SELECT id,user_id,organisation_id,sector_code,region_code,turnover_band,deal_ready_only,notify_opt_in,revoked_at
        FROM saved_alert WHERE id=${intent.alert_id} FOR UPDATE`)[0];
      const user = (await tx`SELECT id,organisation_id,email,email_verified_at,roles FROM app_user WHERE id=${intent.user_id} FOR SHARE`)[0];
      const deal = (await tx<Teaser[]>`SELECT d.id,d.deal_type,d.sector_code,d.region_code,d.turnover_band,
        coalesce((SELECT c.decision='GRANTED' AND c.registry_invalidated_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now()) FROM certification c
          JOIN company co ON co.id=c.company_id AND co.registry_record_id IS NOT NULL
          WHERE c.company_id=d.company_id ORDER BY c.decided_at DESC,c.id DESC LIMIT 1),false) is_deal_ready
        FROM deal d WHERE d.id=${intent.deal_id} AND d.deal_type='ASSET_DEAL' AND d.visibility='OPEN'
        AND d.status IN ('LISTED_OPEN','ENGAGED','DUE_DILIGENCE','NEGOTIATION') AND d.seller_organisation_id<>${intent.organisation_id} FOR SHARE OF d`)[0];
      const subscription = (await tx`SELECT payment_state,period_end FROM subscription WHERE organisation_id=${intent.organisation_id} ORDER BY created_at DESC,id DESC LIMIT 1 FOR SHARE`)[0];
      const eligible = alert?.notify_opt_in && !alert.revoked_at && alert.user_id === intent.user_id && alert.organisation_id === intent.organisation_id
        && user?.["organisation_id"] === intent.organisation_id && user["email_verified_at"] && (user["roles"] as string[]).some((role) => ["INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR"].includes(role))
        && (!subscription || (subscription["payment_state"] === "PAID" && new Date(subscription["period_end"] as string).getTime() > Date.now()))
        && deal && match(deal, alert).score >= MATCH_ALERT_THRESHOLD && intent.expires_at.getTime() > Date.now();
      let state: string = "CANCELLED", error: string | null = "INELIGIBLE", providerRef: string | null = null;
      if (eligible) {
        try {
          const result = match(deal, alert);
          const receipt = await this.email.send({ to: user["email"] as string, subject: "DealPME — opportunité correspondant à votre alerte",
            text: `Une opportunité publique correspond à vos critères.\n${result.reasons.join("\n")}\n${this.appBaseUrl}/opportunites/${deal.id}\nGérer ou retirer vos alertes : ${this.appBaseUrl}/investisseur/alertes`,
            category: "MARKETING", unsubscribeUrl: `${this.appBaseUrl}/investisseur/alertes`,
            delivery: { idempotencyKey: intent.id, correlationId: intent.id, expiresAt: intent.expires_at.toISOString() },
          });
          state = "SENT"; error = null; providerRef = receipt.providerRef;
        } catch (failure) {
          const transport = failure instanceof TransportError ? failure : new TransportError("RESULT_UNKNOWN");
          error = transport.code;
          state = transport.code === "RESULT_UNKNOWN" ? "UNKNOWN" : transport.retryable && intent.attempts < 3 ? "RETRY" : "FAILED";
        }
      }
      await tx`UPDATE notification_intent SET state=${state},last_error=${error},provider_ref=${providerRef},lease_until=NULL,
        next_attempt_at=now()+(${intent.attempts * 30} * interval '1 second'),updated_at=now() WHERE id=${intent.id}`;
      await audit(tx, intent.id, state, intent.attempts);
    });
    return true;
  }
  async close() { await this.db.end({ timeout: 10 }); }
}
