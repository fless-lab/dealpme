import { Injectable } from "@nestjs/common";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { loadEnv } from "../config/env.js";

/**
 * Drapeaux gouvernés par des conditions juridiques (v0, section 3.2 et DP-RPS-021).
 * Un drapeau ne s'active jamais par simple décision produit : l'avis écrit correspondant doit être archivé.
 */
export type FeatureFlag = "TRANSACTION_FEES" | "LICENSED_PARTNER_HANDOFF" | "BIOMETRIC_KYC" | "SHARE_DEAL_LISTING" | "DEALLENS";

@Injectable()
export class FeatureFlags {
  private readonly env = loadEnv();

  isEnabled(flag: FeatureFlag): boolean {
    switch (flag) {
      case "TRANSACTION_FEES":
        return this.env.FEATURE_TRANSACTION_FEES;
      case "LICENSED_PARTNER_HANDOFF":
        return this.env.FEATURE_LICENSED_PARTNER_HANDOFF;
      case "BIOMETRIC_KYC":
        return this.env.FEATURE_BIOMETRIC_KYC;
      case "SHARE_DEAL_LISTING":
        return this.env.FEATURE_SHARE_DEAL_LISTING;
      case "DEALLENS":
        return this.env.FEATURE_DEALLENS;
    }
  }

  require(flag: FeatureFlag): void {
    if (!this.isEnabled(flag)) {
      throw new DealPmeError(ErrorCode.FEATURE_DISABLED, `Fonction désactivée : ${flag}. Activation soumise à validation juridique.`);
    }
  }
}
