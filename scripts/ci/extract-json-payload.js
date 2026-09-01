#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

export function extractJsonPayload(raw) {
  const start = String(raw).search(/[\[{]/);
  if (start < 0) {
    throw new Error('No JSON payload found in command output');
  }
  const payload = String(raw).slice(start).trim();
  JSON.parse(payload);
  return payload;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const dest = process.argv[2];
  const raw = fs.readFileSync(0, 'utf8');
  const payload = extractJsonPayload(raw);
  if (dest) {
    fs.writeFileSync(dest, `${payload}\n`);
  } else {
    process.stdout.write(`${payload}\n`);
  }
}
