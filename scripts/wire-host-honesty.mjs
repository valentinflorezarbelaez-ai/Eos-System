#!/usr/bin/env node
/**
 * Surgical wire: attach doctor-hud-honesty into KEEP host doctor/HUD.
 * CRLF-safe. Does NOT replace operator-doctor.js / operator-hud.js wholesale.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function toLf(s) {
  return s.replace(/\r\n/g, '\n');
}

function maybeCrlf(s, wantCrlf) {
  return wantCrlf ? s.replace(/\n/g, '\r\n') : s;
}

function wireDoctor() {
  const p = path.join(root, 'src/core/runtime/operator-doctor.js');
  const raw = fs.readFileSync(p, 'utf8');
  const wantCrlf = raw.includes('\r\n');
  let t = toLf(raw);
  if (t.includes('doctor-hud-honesty.js')) {
    console.log('doctor: already wired');
    return;
  }
  const importAnchor = "import { evaluatePurposeFulfillment } from './purpose-fulfillment.js';";
  if (!t.includes(importAnchor)) throw new Error('doctor: import anchor missing');
  t = t.replace(
    importAnchor,
    `${importAnchor}
import {
  attachHonestyToDoctorReport,
  formatHonestyBlock,
  HONESTY_PRODUCTION_READY,
  FREEZE_GATE_REL
} from '../observability/doctor-hud-honesty.js';`
  );

  const reReturn =
    /  const failed = checks\.filter\(\(c\) => !c\.ok\)\.map\(\(c\) => c\.id\);\n  return \{\n    ok: failed\.length === 0,\n    root,\n    homedir_leak: leak,\n    checks,\n    failed,\n    nonClaims: \[\.\.\.DOCTOR_NON_CLAIMS\]\n  \};\n\}/;

  if (!reReturn.test(t)) {
    const idx = t.indexOf('nonClaims: [...DOCTOR_NON_CLAIMS]');
    console.error('snippet', JSON.stringify(t.slice(Math.max(0, idx - 100), idx + 80)));
    throw new Error('doctor: return block not found');
  }

  t = t.replace(
    reReturn,
    `  const failed = checks.filter((c) => !c.ok).map((c) => c.id);
  const base = {
    ok: failed.length === 0,
    root,
    homedir_leak: leak,
    checks,
    failed,
    nonClaims: [...DOCTOR_NON_CLAIMS],
    PRODUCTION_READY: HONESTY_PRODUCTION_READY
  };

  if (options.skipHonesty === true) return base;

  let freezeText = options.freezeText;
  if (freezeText == null) {
    const freezeRel = options.freezeGatePath || FREEZE_GATE_REL;
    const freezeAbs = path.join(root, freezeRel);
    if (exists(freezeAbs)) {
      try {
        freezeText = fs.readFileSync(freezeAbs, 'utf8');
      } catch {
        freezeText = undefined;
      }
    }
  }

  return attachHonestyToDoctorReport(base, {
    freezeRevision: options.freezeRevision,
    sourceRevision: options.sourceRevision || options.liveHead,
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
}`
  );

  const reFmt =
    /    'NON-CLAIMS:',\n    \.\.\.nonClaims\.map\(\(n\) => `  - \$\{n\}`\),\n    '={80}'\n  \];\n  return lines\.join\('\\n'\);\n\}/;

  // Build with exact equals signs
  const equals = '='.repeat(80);
  const reFmt2 = new RegExp(
    String.raw`    'NON-CLAIMS:',\n    \.\.\.nonClaims\.map\(\(n\) => \`  - \$\{n\}\`\),\n    '${equals}'\n  \];\n  return lines\.join\('\\n'\);\n\}`
  );

  if (!reFmt2.test(t)) {
    const i = t.indexOf("'NON-CLAIMS:'");
    console.error('fmt snippet', JSON.stringify(t.slice(i, i + 220)));
    throw new Error('doctor: format block not found');
  }

  t = t.replace(
    reFmt2,
    `    'NON-CLAIMS:',
    ...nonClaims.map((n) => \`  - \${n}\`)
  ];
  if (report.honesty) {
    lines.push('', formatHonestyBlock(report.honesty));
  }
  lines.push('${equals}');
  return lines.join('\\n');
}`
  );

  if (!t.includes('attachHonestyToDoctorReport,')) {
    t =
      t.trimEnd() +
      `

export {
  attachHonestyToDoctorReport,
  formatHonestyBlock,
  HONESTY_PRODUCTION_READY
};
`;
  }

  fs.writeFileSync(p, maybeCrlf(t, wantCrlf));
  console.log('doctor: wired');
}

function wireHud() {
  const p = path.join(root, 'src/core/observability/operator-hud.js');
  const raw = fs.readFileSync(p, 'utf8');
  const wantCrlf = raw.includes('\r\n');
  let t = toLf(raw);
  if (t.includes('doctor-hud-honesty.js')) {
    console.log('hud: already wired');
    return;
  }
  const importAnchor = "import path from 'node:path';";
  if (!t.includes(importAnchor)) throw new Error('hud: path import missing');
  t = t.replace(
    importAnchor,
    `${importAnchor}
import {
  attachHonestyToHudSnapshot,
  formatHonestyBlock,
  HONESTY_PRODUCTION_READY,
  FREEZE_GATE_REL as HONESTY_FREEZE_GATE_REL
} from './doctor-hud-honesty.js';`
  );

  const reCollect = /  const freeze_tip = observeFreezeTipVsHead\(baseDir, \{\n    liveHead: options\.liveHead \|\| git\.head_full \|\| git\.head_short \|\| null,\n    execGit: options\.execGit\n  \}\);\n\n  return \{\n    schema: HUD_SCHEMA,\n    generated_at: options\.now \|\| new Date\(\)\.toISOString\(\),\n    git,\n    verify,\n    freeze_tip,\n    mission_os_coherence,\n    mission: \{\n      epistemic: mission\.epistemic,\n      source: mission\.source,\n      id: mission\.id,\n      status: mission\.status,\n      updated_at: mission\.updated_at\n    \},\n    readiness,\n    error_budget,\n    evidence,\n    file_claims,\n    doctor,\n    defense\n  \};\n\}/;

  if (!reCollect.test(t)) {
    const i = t.indexOf('observeFreezeTipVsHead(baseDir');
    console.error('collect snippet', JSON.stringify(t.slice(i, i + 500)));
    throw new Error('hud: collect return block not found');
  }

  t = t.replace(
    reCollect,
    `  const freeze_tip = observeFreezeTipVsHead(baseDir, {
    liveHead: options.liveHead || git.head_full || git.head_short || null,
    execGit: options.execGit,
    lagCommits: options.lagCommits
  });

  let freezeText = options.freezeText;
  if (freezeText == null) {
    try {
      freezeText = fs.readFileSync(
        path.join(baseDir, options.freezeGatePath || HONESTY_FREEZE_GATE_REL),
        'utf8'
      );
    } catch {
      freezeText = undefined;
    }
  }

  const snapshot = {
    schema: HUD_SCHEMA,
    generated_at: options.now || new Date().toISOString(),
    git,
    verify,
    freeze_tip,
    mission_os_coherence,
    mission: {
      epistemic: mission.epistemic,
      source: mission.source,
      id: mission.id,
      status: mission.status,
      updated_at: mission.updated_at
    },
    readiness,
    error_budget,
    evidence,
    file_claims,
    doctor,
    defense,
    PRODUCTION_READY: HONESTY_PRODUCTION_READY
  };

  if (options.skipHonesty === true) return snapshot;

  return attachHonestyToHudSnapshot(snapshot, {
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
}`
  );

  if (!t.includes('formatHonestyBlock(snapshot.honesty)')) {
    const joinLine = "  const text = lines.join('\\n');";
    if (!t.includes(joinLine)) throw new Error('hud: text join anchor missing');
    t = t.replace(
      joinLine,
      `  if (snapshot.honesty) {
    lines.push(formatHonestyBlock(snapshot.honesty));
  }
  lines.push('NON-CLAIM: HUD honesty display ≠ L26 seal change / PRODUCTION_READY flip');
${joinLine}`
    );
  }

  if (!t.includes('attachHonestyToHudSnapshot,')) {
    t =
      t.trimEnd() +
      `

export {
  attachHonestyToHudSnapshot,
  formatHonestyBlock,
  HONESTY_PRODUCTION_READY
};
`;
  }

  fs.writeFileSync(p, maybeCrlf(t, wantCrlf));
  console.log('hud: wired');
}

wireDoctor();
wireHud();
console.log('wire-host-honesty: OK');
