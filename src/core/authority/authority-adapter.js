/**
 * @module AuthorityAdapter
 * @description Canonical monotonic least-privilege authority translator for EOS Mission OS.
 * Maps autonomy levels (LEVEL_0..4), mission control levels (MCL-0..4),
 * and authority tokens (A0..A5) with strict deny-by-default behavior.
 */

export const AUTHORITY_MATRIX = Object.freeze({
  // Read-only / Observation
  LEVEL_0: { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false },
  LEVEL_0_OBSERVE: { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false },
  L0: { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false },
  'MCL-0': { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false },
  A0: { rank: 0, mcl: 'MCL-0', token: 'A0', isProduction: false, isExternalWrite: false },

  // Local Research / Workspace Read
  LEVEL_1: { rank: 1, mcl: 'MCL-1', token: 'A1', isProduction: false, isExternalWrite: false },
  LEVEL_1_RESEARCH: { rank: 1, mcl: 'MCL-1', token: 'A1', isProduction: false, isExternalWrite: false },
  L1: { rank: 1, mcl: 'MCL-1', token: 'A1', isProduction: false, isExternalWrite: false },
  'MCL-1': { rank: 1, mcl: 'MCL-1', token: 'A1', isProduction: false, isExternalWrite: false },
  A1: { rank: 1, mcl: 'MCL-1', token: 'A1', isProduction: false, isExternalWrite: false },

  // Supervised / Local DAG Write
  LEVEL_2: { rank: 2, mcl: 'MCL-2', token: 'A2', isProduction: false, isExternalWrite: true },
  LEVEL_2_SUPERVISED: { rank: 2, mcl: 'MCL-2', token: 'A2', isProduction: false, isExternalWrite: true },
  L2: { rank: 2, mcl: 'MCL-2', token: 'A2', isProduction: false, isExternalWrite: true },
  'MCL-2': { rank: 2, mcl: 'MCL-2', token: 'A2', isProduction: false, isExternalWrite: true },
  A2: { rank: 2, mcl: 'MCL-2', token: 'A2', isProduction: false, isExternalWrite: true },

  // Promotion / Staging / Canary
  LEVEL_3: { rank: 3, mcl: 'MCL-3', token: 'A3', isProduction: false, isExternalWrite: true },
  LEVEL_3_PROMOTE: { rank: 3, mcl: 'MCL-3', token: 'A3', isProduction: false, isExternalWrite: true },
  L3: { rank: 3, mcl: 'MCL-3', token: 'A3', isProduction: false, isExternalWrite: true },
  'MCL-3': { rank: 3, mcl: 'MCL-3', token: 'A3', isProduction: false, isExternalWrite: true },
  A3: { rank: 3, mcl: 'MCL-3', token: 'A3', isProduction: false, isExternalWrite: true },

  // Production Deployment
  LEVEL_4: { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true },
  LEVEL_4_PRODUCTION: { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true },
  L4: { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true },
  'MCL-4': { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true },
  A4: { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true },
  A5: { rank: 4, mcl: 'MCL-4', token: 'A5', isProduction: true, isExternalWrite: true }
});

export const DENIED_AUTHORITY = Object.freeze({
  rank: 0,
  mcl: 'MCL-0',
  token: 'A0',
  isProduction: false,
  isExternalWrite: false,
  isDenied: true,
  reason: 'DENIED_INVALID_OR_UNKNOWN_AUTHORITY_TOKEN'
});

export class AuthorityAdapter {
  static normalize(token) {
    if (!token || typeof token !== 'string') {
      return { ...DENIED_AUTHORITY };
    }
    const clean = token.trim().toUpperCase();
    if (AUTHORITY_MATRIX[clean]) {
      return { ...AUTHORITY_MATRIX[clean], isDenied: false, reason: 'VALID' };
    }
    return { ...DENIED_AUTHORITY, token: clean };
  }

  static checkAuthority(requiredLevel, grantedLevel) {
    const req = AuthorityAdapter.normalize(requiredLevel);
    const grt = AuthorityAdapter.normalize(grantedLevel);

    if (req.isDenied || grt.isDenied) {
      return {
        authorized: false,
        requiredToken: requiredLevel,
        grantedToken: grantedLevel,
        requiredRank: req.rank,
        effectiveRank: grt.rank,
        reason: req.isDenied ? req.reason : grt.reason
      };
    }

    const authorized = grt.rank >= req.rank;
    return {
      authorized,
      requiredToken: requiredLevel,
      grantedToken: grantedLevel,
      requiredRank: req.rank,
      effectiveRank: grt.rank,
      reason: authorized ? 'AUTHORIZED' : 'INSUFFICIENT_AUTHORITY_RANK'
    };
  }

  static isAuthorized(requiredLevel, grantedLevel) {
    return AuthorityAdapter.checkAuthority(requiredLevel, grantedLevel).authorized;
  }

  static isExternalWriteAuthorized(level) {
    return Boolean(AuthorityAdapter.normalize(level).isExternalWrite);
  }

  static isProductionAuthorized(level) {
    return Boolean(AuthorityAdapter.normalize(level).isProduction);
  }
}
