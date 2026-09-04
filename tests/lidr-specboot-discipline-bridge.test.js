import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ADR_REL = 'docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md';
const DECISION_POINTER_REL = 'docs/decisions/ADR-0010-LIDR-SPECBOOT-GENTLEMAN-DISCIPLINE-BRIDGE.md';
const BASE_STANDARDS_REL = 'docs/base-standards.md';
const OPERATOR_REL = 'docs/manuals/EOS_OPERATOR_MANUAL_LOCAL.md';

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

test('ADR-0010 exists as the canonical LIDR Specboot + Gentleman discipline bridge', () => {
  assert.ok(fs.existsSync(path.join(rootDir, ADR_REL)), `${ADR_REL} must exist`);
  const adr = read(ADR_REL);
  assert.match(adr, /LIDR/i);
  assert.match(adr, /Specboot/i);
  assert.match(adr, /OpenSpec/i);
  assert.match(adr, /Gentleman/i);
  assert.match(adr, /\/enrich-us/);
  assert.match(adr, /\/propose|\/ff/);
  assert.match(adr, /\/apply/);
  assert.match(adr, /\/verify/);
  assert.match(adr, /\/adversarial-review/);
  assert.match(adr, /\/archive/);
  assert.match(adr, /\/commit/);
});

test('ADR-0010 defines organic routing: DIRECT vs SDD (size alone does not force SDD)', () => {
  const adr = read(ADR_REL);
  assert.match(adr, /\bDIRECT\b/);
  assert.match(adr, /\bSDD\b/);
  assert.match(adr, /organic routing/i);
  assert.match(adr, /file\/diff size alone/i);
});

test('ADR-0010 requires strict TDD evidence for /apply and /verify', () => {
  const adr = read(ADR_REL);
  assert.match(adr, /RED/);
  assert.match(adr, /GREEN/);
  assert.match(adr, /TRIANGULATE/);
  assert.match(adr, /REFACTOR/);
  assert.match(adr, /\/apply/);
  assert.match(adr, /\/verify/);
});

test('ADR-0010 RDD: independent review does not authorize delivery', () => {
  const adr = read(ADR_REL);
  assert.match(adr, /\bRDD\b/);
  assert.match(adr, /INFORMATIONAL/);
  assert.match(adr, /does not authorize delivery/i);
  assert.match(adr, /HITL|write barrier|Article III/i);
});

test('ADR-0010 lists explicit NON-goals and points to existing SSOT', () => {
  const adr = read(ADR_REL);
  assert.match(adr, /NON-goals/i);
  assert.match(adr, /Engram/);
  assert.match(adr, /gentle-ai|Go installer/i);
  assert.match(adr, /90%/);
  assert.match(adr, /English-only/i);
  assert.match(adr, /CONSTITUTION\.md/);
  assert.match(adr, /\.cursorrules/);
  assert.match(adr, /docs\/base-standards\.md/);
});

test('docs/decisions pointer exists and does not fork ADR-0010 SSOT', () => {
  assert.ok(fs.existsSync(path.join(rootDir, DECISION_POINTER_REL)), `${DECISION_POINTER_REL} must exist`);
  const pointer = read(DECISION_POINTER_REL);
  assert.match(pointer, /ADR-0010/);
  assert.match(pointer, /docs\/architecture\/adrs\/ADR-0010-lidr-specboot-gentleman-discipline-bridge\.md/);
  assert.ok(!pointer.includes('## Decision'), 'pointer must not duplicate the ADR body');
});

test('base-standards.md exists as the coding SSOT index', () => {
  assert.ok(fs.existsSync(path.join(rootDir, BASE_STANDARDS_REL)), `${BASE_STANDARDS_REL} must exist`);
  const standards = read(BASE_STANDARDS_REL);
  assert.match(standards, /CONSTITUTION\.md/);
  assert.match(standards, /ADR-0010/);
  assert.match(standards, /NODE_BUILTINS_ONLY|L0/);
});

test('operator manual states SDD vs DIRECT routing rule', () => {
  const manual = read(OPERATOR_REL);
  assert.match(manual, /SDD vs DIRECT|DIRECT vs SDD/i);
  assert.match(manual, /ADR-0010/);
  assert.match(manual, /organic/i);
});

test('L0 purity: root package.json still has no npm dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(Object.hasOwn(pkg, 'dependencies'), false);
  assert.equal(Object.hasOwn(pkg, 'devDependencies'), false);
});

test('verify-eos REQUIRED_PATHS include ADR-0010 and base-standards', () => {
  const verifier = read('scripts/verify-eos.js');
  for (const rel of [ADR_REL, BASE_STANDARDS_REL, DECISION_POINTER_REL]) {
    assert.ok(verifier.includes(`'${rel}'`), `verify-eos REQUIRED_PATHS must include ${rel}`);
  }
});
