import { describe, expect, it, vi } from "vitest";
import { deliverWithRetry, retryPolicy, smsSegments, TransportError } from "../src/index.js";

const delivery = { idempotencyKey: "test", correlationId: "correlation" };
const policy = retryPolicy({ totalTimeoutMs: 300, attemptTimeoutMs: 60, maxAttempts: 3, retryDelayMs: 0 });
describe("contrat des transports", () => {
  it("reprend un refus temporaire dans le budget", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new TransportError("RATE_LIMITED", true, 1)).mockResolvedValue("ok");
    await expect(deliverWithRetry(delivery, policy, operation, true)).resolves.toEqual({ value: "ok", attempts: 2 });
  });
  it("ne reprend pas un résultat SMTP indéterminé", async () => {
    const operation = vi.fn().mockRejectedValue(new TransportError("RESULT_UNKNOWN"));
    await expect(deliverWithRetry(delivery, policy, operation, false)).rejects.toMatchObject({ code: "RESULT_UNKNOWN" });
    expect(operation).toHaveBeenCalledTimes(1);
  });
  it("reprend l'indéterminé uniquement pour une passerelle idempotente", async () => {
    const operation = vi.fn().mockRejectedValueOnce(new TransportError("RESULT_UNKNOWN")).mockResolvedValue("ok");
    expect((await deliverWithRetry(delivery, policy, operation, true)).attempts).toBe(2);
  });
  it("borne une opération qui ne répond jamais et déclenche son abort", async () => {
    let aborted = false;
    await expect(deliverWithRetry(delivery, policy, (signal) => {
      signal.addEventListener("abort", () => { aborted = true; });
      return new Promise(() => {});
    }, false)).rejects.toMatchObject({ code: "RESULT_UNKNOWN" });
    expect(aborted).toBe(true);
  });
  it("refuse un code expiré avant tout appel réseau", async () => {
    const operation = vi.fn();
    await expect(deliverWithRetry({ ...delivery, expiresAt: "2000-01-01T00:00:00Z" }, policy, operation, true)).rejects.toMatchObject({ code: "EXPIRED" });
    expect(operation).not.toHaveBeenCalled();
  });
  it("ne dépasse pas le budget pour suivre Retry-After", async () => {
    const operation = vi.fn().mockRejectedValue(new TransportError("RATE_LIMITED", true, 5000));
    await expect(deliverWithRetry(delivery, policy, operation, true)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(operation).toHaveBeenCalledTimes(1);
  });
  it("refuse une politique non bornée", () => {
    expect(() => retryPolicy({ totalTimeoutMs: Infinity })).toThrow();
    expect(() => retryPolicy({ maxAttempts: 0 })).toThrow();
    expect(() => retryPolicy({ attemptTimeoutMs: 6000, totalTimeoutMs: 1000 })).toThrow();
  });
  it("estime GSM-7, caractères étendus et unités UTF-16", () => {
    expect(smsSegments("é".repeat(160))).toEqual({ encoding: "GSM-7", units: 160, segments: 1 });
    expect(smsSegments("€".repeat(81))).toEqual({ encoding: "GSM-7", units: 162, segments: 2 });
    expect(smsSegments("🙂".repeat(36))).toEqual({ encoding: "UCS-2", units: 72, segments: 2 });
  });
});
