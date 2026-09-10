import { Injectable } from "@nestjs/common";
import { loadEnv } from "../config/env.js";
import { decryptField, decryptInt, encryptField, encryptInt, keyRingFromEnv, type KeyRing } from "./field-crypto.js";

/** Service injectable autour du trousseau de clés ; les modules ne manipulent jamais la clé directement. */
@Injectable()
export class FieldCrypto {
  private readonly ring: KeyRing = keyRingFromEnv(loadEnv());

  encrypt(value: string | null): string | null {
    return value === null ? null : encryptField(this.ring, value);
  }
  decrypt(stored: string | null): string | null {
    return stored === null ? null : decryptField(this.ring, stored);
  }
  encryptInt(value: number | null): string | null {
    return encryptInt(this.ring, value);
  }
  decryptInt(stored: string | null): number | null {
    return decryptInt(this.ring, stored);
  }
  get currentKeyId(): string {
    return this.ring.currentId;
  }
}
