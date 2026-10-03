/**
 * @file bin/eos-doctor.js
 * @description Operator doctor CLI. Thin wrapper over runOperatorDoctorCli.
 */

import { runOperatorDoctorCli } from '../src/core/runtime/operator-doctor.js';
import { formatDoctorBoundaryBlock } from '../src/shield/intelligence-finding.js';

const res = runOperatorDoctorCli(process.argv.slice(2), { root: process.cwd() });
if (res.output) process.stdout.write(res.output);
if (!process.argv.includes('--json')) process.stdout.write(formatDoctorBoundaryBlock());
process.exit(res.exitCode ?? 0);
