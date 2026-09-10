import { describe, expect, it } from "vitest";
import { createHmac, randomBytes } from "node:crypto";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { decryptField, encryptField, keyRingFromEnv, type KeyRing } from "../src/platform/field-crypto.js";
import { assertValidSignature, computeSignature, type RequestWithRawBody } from "../src/platform/webhook-signature.js";
import { ErrorRate } from "../src/platform/observability.js";

const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");

function ring(overrides: Partial<Parameters<typeof keyRingFromEnv>[0]> = {}): KeyRing {
  return keyRingFromEnv({ FIELD_ENCRYPTION_KEY: KEY_A, FIELD_ENCRYPTION_KEY_ID: "v1", ...overrides });
}

/** Requête minimale pour la vérification de signature : seul le corps brut et un en-tête comptent. */
function request(raw: string, header?: string): RequestWithRawBody {
  return {
    rawBody: Buffer.from(raw),
    header: (name: string) => (name.toLowerCase() === "x-signature" ? header : undefined),
  } as unknown as RequestWithRawBody;
}

describe("chiffrement applicatif des champs confidentiels", () => {
  it("chiffre et déchiffre un montant sans le perdre", () => {
    const r = ring();
    const stored = encryptField(r, "2850000000");
    expect(stored).not.toContain("2850000000");
    expect(decryptField(r, stored)).toBe("2850000000");
  });

  it("préfixe la valeur stockée par l'identifiant de clé, pour permettre la rotation", () => {
    const stored = encryptField(ring({ FIELD_ENCRYPTION_KEY_ID: "v7" }), "secret");
    expect(stored.startsWith("v7:")).toBe(true);
  });

  it("produit un chiffré différent à chaque écriture de la même valeur", () => {
    const r = ring();
    expect(encryptField(r, "identique")).not.toBe(encryptField(r, "identique"));
  });

  it("refuse de déchiffrer avec une clé inconnue plutôt que de renvoyer du bruit", () => {
    const stored = encryptField(ring(), "prix");
    const autre = keyRingFromEnv({ FIELD_ENCRYPTION_KEY: KEY_B, FIELD_ENCRYPTION_KEY_ID: "v2" });
    expect(() => decryptField(autre, stored)).toThrow(/Clé de chiffrement inconnue/);
  });

  it("pendant une rotation, lit encore ce qui a été écrit avec l'ancienne clé", () => {
    const ancien = encryptField(keyRingFromEnv({ FIELD_ENCRYPTION_KEY: KEY_A, FIELD_ENCRYPTION_KEY_ID: "v1" }), "valeur ancienne");
    const enRotation = keyRingFromEnv({
      FIELD_ENCRYPTION_KEY: KEY_B,
      FIELD_ENCRYPTION_KEY_ID: "v2",
      FIELD_ENCRYPTION_KEY_PREVIOUS: KEY_A,
      FIELD_ENCRYPTION_KEY_PREVIOUS_ID: "v1",
    });
    expect(decryptField(enRotation, ancien)).toBe("valeur ancienne");
    // Les écritures nouvelles portent la clé courante.
    expect(encryptField(enRotation, "valeur nouvelle").startsWith("v2:")).toBe(true);
  });

  it("détecte une altération du chiffré au lieu de la laisser passer", () => {
    const r = ring();
    const stored = encryptField(r, "2850000000");
    const [id, payload] = stored.split(":");
    const buf = Buffer.from(payload!, "base64");
    buf[buf.length - 1] = (buf[buf.length - 1]! ^ 0xff) & 0xff;
    expect(() => decryptField(r, `${id}:${buf.toString("base64")}`)).toThrow();
  });
});

describe("vérification de signature des webhooks", () => {
  const secret = "secret-de-test-suffisamment-long";
  const body = JSON.stringify({ event: "attendance", id: "evt-1" });

  it("accepte une signature calculée sur les octets reçus", () => {
    const req = request(body, computeSignature(body, secret));
    expect(assertValidSignature(req, "x-signature", secret).toString()).toBe(body);
  });

  it("accepte la forme préfixée sha256=", () => {
    const req = request(body, `sha256=${computeSignature(body, secret)}`);
    expect(() => assertValidSignature(req, "x-signature", secret)).not.toThrow();
  });

  it("refuse une signature calculée avec un autre secret", () => {
    const req = request(body, computeSignature(body, "un-autre-secret-tout-aussi-long"));
    expect(() => assertValidSignature(req, "x-signature", secret)).toThrow(DealPmeError);
  });

  it("refuse un corps modifié après signature", () => {
    const signature = computeSignature(body, secret);
    const req = request(JSON.stringify({ event: "attendance", id: "evt-2" }), signature);
    expect(() => assertValidSignature(req, "x-signature", secret)).toThrow(/Signature de webhook invalide/);
  });

  it("refuse quand aucune signature n'est fournie", () => {
    expect(() => assertValidSignature(request(body), "x-signature", secret)).toThrow(DealPmeError);
  });

  it("refuse quand aucun secret n'est configuré, plutôt que d'ouvrir la porte", () => {
    const req = request(body, computeSignature(body, secret));
    try {
      assertValidSignature(req, "x-signature", undefined);
      throw new Error("aurait dû refuser");
    } catch (e) {
      expect(e).toBeInstanceOf(DealPmeError);
      expect((e as DealPmeError).code).toBe(ErrorCode.FORBIDDEN);
    }
  });

  it("signe les octets bruts, pas l'objet ré-sérialisé", () => {
    // Deux sérialisations du même objet, avec des espaces différents : les signatures diffèrent.
    const espace = '{ "event": "attendance", "id": "evt-1" }';
    expect(computeSignature(espace, secret)).not.toBe(computeSignature(body, secret));
    expect(computeSignature(body, secret)).toBe(createHmac("sha256", secret).update(body).digest("hex"));
  });
});

describe("compteur d'erreurs serveur", () => {
  it("compte les erreurs de la fenêtre et oublie les plus anciennes", () => {
    const rate = new ErrorRate(50);
    rate.record();
    rate.record();
    expect(rate.countInWindow()).toBe(2);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(rate.countInWindow()).toBe(0);
        resolve();
      }, 70);
    });
  });
});
