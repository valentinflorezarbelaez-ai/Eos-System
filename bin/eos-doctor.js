/**
 * @file bin/eos-doctor.js
 * @description Operator doctor CLI. Thin wrapper over runOperatorDoctorCli.
 */

import { runOperatorDoctorCli } from '../src/core/runtime/operator-doctor.js';

const res = runOperatorDoctorCli(process.argv.slice(2), { root: process.cwd() });
if (res.output) process.stdout.write(res.output);
process.exit(res.exitCode ?? 0);
