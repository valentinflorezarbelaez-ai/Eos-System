#!/usr/bin/env node

/**
 * @file bin/eos-top.js
 * @description Alias for eos-hud (operator live-truth panel).
 */

import { runOperatorHudCli } from '../src/core/observability/operator-hud.js';

const res = runOperatorHudCli(process.argv.slice(2), { baseDir: process.cwd() });
if (res.output) process.stdout.write(res.output);
process.exit(res.exitCode ?? 0);
