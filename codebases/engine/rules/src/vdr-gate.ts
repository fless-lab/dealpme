import { AccessProfile, VdrGateResult } from "@dealpme/domain";

/**
 * Porte d'accès à la data room (matrice d'états d'accès du corpus V3.1, scénarios obligatoires du release gate).
 * Chaque état est un sur-ensemble strict du précédent ; la révocation l'emporte sur tout.
 * Cette règle s'applique AVANT toute récupération de document et AVANT toute récupération par DealLens.
 */
export interface AccessState {
  authenticated: boolean;
  qualified: boolean;
  admitted: boolean;
  ndaSigned: boolean;
  t2Granted: boolean;
  sellerApproved: boolean;
  revoked: boolean;
}

export function resolveProfile(s: AccessState): AccessProfile {
  if (!s.authenticated) return AccessProfile.GUEST;
  if (s.revoked) return AccessProfile.REVOKED;
  if (!s.qualified) return AccessProfile.VERIFIED_BUYER;
  if (!s.admitted) return AccessProfile.QUALIFIED;
  if (!s.ndaSigned) return AccessProfile.ADMITTED;
  if (!s.t2Granted || !s.sellerApproved) return AccessProfile.NDA_SIGNED;
  return AccessProfile.AUTHORIZED;
}

export function openVdr(s: AccessState): VdrGateResult {
  switch (resolveProfile(s)) {
    case AccessProfile.GUEST:
      return VdrGateResult.LOGIN_REQUIRED;
    case AccessProfile.REVOKED:
      return VdrGateResult.ACCESS_REVOKED;
    case AccessProfile.VERIFIED_BUYER:
      return VdrGateResult.QUALIFICATION_REQUIRED;
    case AccessProfile.QUALIFIED:
      return VdrGateResult.ADMISSION_REQUIRED;
    case AccessProfile.ADMITTED:
      return VdrGateResult.NDA_REQUIRED;
    case AccessProfile.NDA_SIGNED:
      return VdrGateResult.T2_GRANT_REQUIRED;
    case AccessProfile.AUTHORIZED:
      return VdrGateResult.VDR_HOME;
  }
}

/** Un accès data room doit toujours être scopé et expirer : un accès perpétuel n'est pas constructible (DP-VDR-010). */
export function isGrantValid(grant: { expiresAt: Date; revokedAt: Date | null }, now = new Date()): boolean {
  return grant.revokedAt === null && grant.expiresAt.getTime() > now.getTime();
}
