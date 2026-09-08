/**
 * ROI4 I3 — fail-closed evidence custody chain verifier.
 * Usage: node scripts/custody-verify.js [--json] [--base-dir <path>]
 * Exit 0 PASS / PASS_EMPTY_GENESIS; exit 1 DENY/FAIL.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EvidenceCustody,
  EvidenceCustodyError,
  GENESIS_PREVIOUS_HASH
} from '../src/core/sdd/evidence-custody.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
let baseDir;
const bdIdx = args.indexOf('--base-dir');
if (bdIdx >= 0) baseDir = args[bdIdx + 1];

const custody = new EvidenceCustody({
  controlPlaneRoot: rootDir,
  baseDir: baseDir || undefined
});

try {
  const result = custody.verify({ failClosed: true });
  const out = {
    status: 'PASS',
    ...result,
    genesis_previous_hash: GENESIS_PREVIOUS_HASH
  };
  if (asJson) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`CUSTODY VERIFY: ${result.verdict} (count=${result.count}, chain=${result.chain_id})`);
  }
  process.exit(0);
} catch (err) {
  const payload = {
    status: 'DENY',
    error: err.code || 'CUSTODY_CHAIN_BROKEN',
    message: err.message,
    details: err instanceof EvidenceCustodyError ? err.details : null
  };
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.error(`CUSTODY VERIFY DENY: ${err.message}`);
  }
  process.exit(1);
}