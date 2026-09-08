/**
 * @module AuthorityAdapter
 * @version 1.0.0
 * @description Monotonic least-privilege authority translator.
 * Maps autonomy levels (LEVEL_0..4), mission control levels (MCL-0..4),
 * and authority tokens (A0..A5) with strict deny-by-default behavior.
 */

const AUTHORITY_MATRIX = {
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

  // Promotion / Staging / Canary (Unambiguously resolved to A3)
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
};

const DENIED_AUTHORITY = {
  rank: 0,
  mcl: 'MCL-0',
  token: 'A0',
  isProduction: false,
  isExternalWrite: false,
  isDenied: true,
  reason: 'INVALID_OR_UNKNOWN_AUTHORITY_TOKEN'
};

class AuthorityAdapter {
  static normalize(token) {
    if (!token || typeof token !== 'string') {
      return { ...DENIED_AUTHORITY };
    }
    const cleanToken = token.trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(AUTHORITY_MATRIX, cleanToken)) {
      return { ...AUTHORITY_MATRIX[cleanToken], isDenied: false, inputToken: token };
    }
    return { ...DENIED_AUTHORITY, inputToken: token };
  }

  static checkAuthority(requiredLevel, grantedLevel) {
    const req = this.normalize(requiredLevel);
    const grant = this.normalize(grantedLevel);

    if (req.isDenied || grant.isDenied) {
      return {
        authorized: false,
        reason: 'DENIED: One or both authority tokens are invalid or unrecognized',
        effectiveRank: 0,
        requiredRank: req.rank || 0
      };
    }

    const authorized = grant.rank >= req.rank;
    return {
      authorized,
      reason: authorized ? 'AUTHORIZED' : `DENIED: Required rank ${req.rank} exceeds granted rank ${grant.rank}`,
      effectiveRank: grant.rank,
      requiredRank: req.rank
    };
  }

  static isProductionAuthorized(grantedLevel) {
    const grant = this.normalize(grantedLevel);
    return !grant.isDenied && grant.isProduction;
  }

  static isExternalWriteAuthorized(grantedLevel) {
    const grant = this.normalize(grantedLevel);
    return !grant.isDenied && grant.isExternalWrite;
  }
}

export { AuthorityAdapter, AUTHORITY_MATRIX, DENIED_AUTHORITY };
