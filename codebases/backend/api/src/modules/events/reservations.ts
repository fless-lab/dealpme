import { and, eq, ne, lte, gte } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import type { CoreTx } from "../../database/tenant.js";
import { eventProviderAccounts, eventReservations } from "../../database/schema/core.js";

/** Remo documente des bornes inclusives : fin à 12 h / début à 12 h comptent ensemble. */
export function peakReservations(intervals: { startsAt: Date; endsAt: Date }[], start: Date, end: Date, touchingCounts=true): number {
  const points: [number, number][] = [];
  for (const r of intervals) {
    const a = Math.max(start.getTime(), r.startsAt.getTime()), b = Math.min(end.getTime(), r.endsAt.getTime());
    if (a < b || (touchingCounts && a === b)) points.push([a, 1], [b, -1]);
  }
  points.sort((a, b) => a[0] - b[0] || (touchingCounts ? b[1]-a[1] : a[1]-b[1]));
  let current = 0, peak = 0;
  for (const [,delta] of points) { current += delta; peak = Math.max(peak,current); }
  return peak;
}
export async function reserveSharedEvent(tx: CoreTx, input: { accountKey: string; productKey: string; resourceId: string; startsAt: Date; endsAt: Date; limit: number; marginMinutes: number; provider?: string; externalAccountId?: string | undefined; qualificationRef?: string | undefined }) {
  const provider = input.provider ?? "local";
  await tx.insert(eventProviderAccounts).values({ key: input.accountKey, provider, concurrentLimit: input.limit, marginMinutes: input.marginMinutes, qualificationRef: input.qualificationRef ?? "SIMULATION_LOCALE_NON_CONTRACTUELLE", externalAccountId: input.externalAccountId ?? null }).onConflictDoNothing();
  const account = (await tx.select().from(eventProviderAccounts).where(eq(eventProviderAccounts.key,input.accountKey)).for("update"))[0]!;
  if (account.concurrentLimit !== input.limit || account.marginMinutes !== input.marginMinutes || account.provider !== provider || account.externalAccountId !== (input.externalAccountId ?? null)) throw new DealPmeError(ErrorCode.CONFLICT,"Configuration du compte partagé divergente ; rapprocher son quota avant publication");
  const existing = (await tx.select().from(eventReservations).where(and(eq(eventReservations.productKey,input.productKey),eq(eventReservations.resourceId,input.resourceId))))[0];
  if (existing && existing.accountKey !== input.accountKey) throw new DealPmeError(ErrorCode.CONFLICT,"La réservation appartient à un autre compte fournisseur");
  if (existing && existing.state !== "RELEASED") return existing.id;
  const start = new Date(input.startsAt.getTime() - account.marginMinutes * 60000), end = new Date(input.endsAt.getTime() + account.marginMinutes * 60000);
  const active = await tx.select().from(eventReservations).where(and(eq(eventReservations.accountKey,input.accountKey),ne(eventReservations.state,"RELEASED"),lte(eventReservations.startsAt,end),gte(eventReservations.endsAt,start)));
  if (peakReservations(active,start,end) >= account.concurrentLimit) throw new DealPmeError(ErrorCode.CONFLICT,"Quota du compte partagé atteint sur ce créneau, marges comprises",{ reason: "EVENT_ACCOUNT_CAPACITY" });
  if (existing) throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"Une réservation libérée ne se republie pas ; créer un nouvel événement");
  const id = newId(); await tx.insert(eventReservations).values({ id, accountKey: input.accountKey, productKey: input.productKey, resourceId: input.resourceId, startsAt: start, endsAt: end, state: "RESERVED" });
  return id;
}
