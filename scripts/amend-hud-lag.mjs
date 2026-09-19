#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src/core/observability/operator-hud.js');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');

if (t.includes('enriched.honesty?.revision && enriched.freeze_tip')) {
  console.log('already amended');
  process.exit(0);
}

const marker = '  return attachHonestyToHudSnapshot(snapshot, {';
const start = t.indexOf(marker);
if (start < 0) throw new Error('attach return not found');
const endRel = t.indexOf('  });\n}', start);
if (endRel < 0) throw new Error('attach end not found');
const end = endRel + '  });\n}'.length;

const rep = `  const enriched = attachHonestyToHudSnapshot(snapshot, {
    freezeRevision: options.freezeRevision,
    sourceRevision: options.sourceRevision || options.liveHead || git.head_full || git.head_short,
    lagCommits: options.lagCommits,
    freezeText,
    dirty: options.dirty,
    dirtyPaths: options.dirtyPaths,
    dirtySummary: options.dirtySummary,
    frozen: options.frozen,
    pendingPorts: options.pendingPorts,
    closureEstablished: options.closureEstablished,
    productionReadyEstablished: options.productionReadyEstablished === true,
    evidenceComplete: options.evidenceComplete === true,
    allowOptimisticWhenDirty: options.allowOptimisticWhenDirty
  });
  if (enriched.honesty?.revision && enriched.freeze_tip) {
    enriched.freeze_tip = {
      ...enriched.freeze_tip,
      lag_commits: enriched.honesty.revision.lag_commits,
      lag_measurable: enriched.honesty.revision.lag_measurable,
      lag_label: enriched.honesty.revision.lag_label,
      freeze_revision_short: enriched.honesty.revision.freeze_short,
      source_revision_short: enriched.honesty.revision.source_short
    };
  }
  return enriched;
}`;

t = t.slice(0, start) + rep + t.slice(end);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('amended freeze_tip lag mirror');
