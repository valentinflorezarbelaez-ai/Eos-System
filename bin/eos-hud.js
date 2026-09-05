#!/usr/bin/env node

/**
 * @file bin/eos-hud.js
 * @description Operator live-truth HUD. Thin CLI over observability aggregator.
 */

import { runOperatorHudCli } from '../src/core/observability/operator-hud.js';

const res = runOperatorHudCli(process.argv.slice(2), { baseDir: process.cwd() });
if (res.output) process.stdout.write(res.output);
process.exit(res.exitCode ?? 0);
