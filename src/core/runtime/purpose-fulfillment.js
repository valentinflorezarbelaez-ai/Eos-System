/**
 * @module PurposeFulfillment
 * @description Frozen original purposes vs what is locally wired. Does not claim production or unsupervised autonomy.
 */

import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_PURPOSE_FILES = [
  'bin/eos.js',
  'src/mcp-server.js',
  'src/cli/mission-cli.js',
  'src/core/runtime/mission-runtime.js',
  'src/core/runtime/mission-learning.js',
  'src/core/runtime/global-knowledge.js',
  'src/core/runtime/operator-next.js',
  'scripts/verify-eos.js',
  'EOS-MISSION-CONTROL/CURRENT_MISSION.json',
  'docs/intelligence/EOS_GLOBAL_KNOWLEDGE.json'
];

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function readDictamen(root) {
  const file = path.join(root, 'EOS-MISSION-CONTROL', 'CURRENT_MISSION.json');
  if (!fs.existsSync(file)) {
    return {
      COMPLETE_FOR_LOCAL_GOVERNED_USE: 'UNKNOWN',
      PRODUCTION_READY: 'NO'
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      COMPLETE_FOR_LOCAL_GOVERNED_USE: raw?.dictamen?.COMPLETE_FOR_LOCAL_GOVERNED_USE || 'UNKNOWN',
      PRODUCTION_READY: raw?.dictamen?.PRODUCTION_READY || 'NO'
    };
  } catch {
    return {
      COMPLETE_FOR_LOCAL_GOVERNED_USE: 'UNKNOWN',
      PRODUCTION_READY: 'NO'
    };
  }
}

/**
 * @param {string} root
 * @returns {{
 *   local_ok: boolean,
 *   missing: string[],
 *   dictamen: object,
 *   summary: string
 * }}
 */
export function evaluatePurposeFulfillment(root) {
  const base = path.resolve(root || process.cwd());
  const missing = LOCAL_PURPOSE_FILES.filter((rel) => !exists(base, rel));
  const learningOk = exists(base, 'src/core/runtime/mission-learning.js');
  const globalKnowledgeOk = exists(base, 'src/core/runtime/global-knowledge.js')
    && exists(base, 'docs/intelligence/EOS_GLOBAL_KNOWLEDGE.json');
  const dictamen = {
    ...readDictamen(base),
    EVOLVE_ON_USE: learningOk ? 'WIRED' : 'MISSING',
    GLOBAL_KNOWLEDGE: globalKnowledgeOk ? 'WIRED' : 'MISSING',
    UNSUPERVISED_AUTONOMY: 'FORBIDDEN',
    AUTO_APPLY_BAND: 'LOW_RISK_ONLY',
    SCALE_MODEL: 'MORE_MISSIONS_NOT_MORE_ENGINES'
  };
  const local_ok = missing.length === 0;
  const summary = local_ok
    ? 'local governed loop wired; production OUT_OF_SCOPE; unsupervised FORBIDDEN'
    : `missing ${missing.join(', ')}`;
  return { local_ok, missing, dictamen, summary };
}
