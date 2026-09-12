/**
 * @file external-write-gateway.test.js
 * @description SPEC-0025a / Mission T-gate — External Project Write-Barrier Gateway L2.
 * Hermetic TDD: os.tmpdir() fixture dirs only; never touch real Fundacion.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-external-write-gateway-l2 only.
 * Gateway allow ≠ Fundacion Δ=0 flipped.
 * Hermetic fixture ≠ production Fundacion.
 * Level-2 receipts ≠ PRODUCTION_READY.
 * Does NOT claim CloudAgent path or PRODUCTION_READY=YES.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY,
  EXTERNAL_WRITE_GATEWAY_KIND,
  EXTERNAL_WRITE_PRECONDITIONS,
  EXTERNAL_WRITE_CODES,
  ExternalWriteGatewayError,
  createExternalWriteGateway,
  isHermeticFixturePath,
  denyRealFundacion,
  defaultIsRealFundacionPath,
  contentSha256,
  defaultEvaluatePreconditions
} from '../../src/core/governance/external-write-gateway.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/governance/external-write-gateway.js'
);

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function makeFixtureRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ewg-fixture-'));
}

function allReceipts(overrides = {}) {
  return {
    REGISTERED: true,
    INTAKE_COMPLETE: true,
    SPEC_APPROVED: { ok: true },
    AUDIT_COMPLETE: true,
    OWNER_APPROVAL: { ok: true },
    LEVEL_2_AUTHORIZED: true,
    ...overrides
  };
}

function gatewayFor(fixtureRoot, extra = {}) {
  return createExternalWriteGateway({
    fixtureRoot,
    registry: new Set(['proj-alpha']),
    ...extra
  });
}

// ─── T1 ───────────────────────────────────────────────────────────────────────
test('T1 PRODUCTION_READY=NO + kind eos-external-write-gateway-l2', () => {
  assert.equal(EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY, 'NO');
  assert.equal(EXTERNAL_WRITE_GATEWAY_KIND, 'eos-external-write-gateway-l2');
  assert.deepEqual([...EXTERNAL_WRITE_PRECONDITIONS], [
    'REGISTERED',
    'INTAKE_COMPLETE',
    'SPEC_APPROVED',
    'AUDIT_COMPLETE',
    'OWNER_APPROVAL',
    'LEVEL_2_AUTHORIZED'
  ]);
  const g = createExternalWriteGateway({ fixtureRoot: makeFixtureRoot() });
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(g.kind, 'eos-external-write-gateway-l2');
  assert.equal(g.health().PRODUCTION_READY, 'NO');
  assert.equal(g.health().kind, 'eos-external-write-gateway-l2');
});

// ─── T2 ───────────────────────────────────────────────────────────────────────
test('T2 missing precondition → EXTERNAL_WRITE_PRECONDITION_FAILED', () => {
  const root = makeFixtureRoot();
  const target = path.join(root, 'src', 'a.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const g = gatewayFor(root);
  const receipts = allReceipts({ OWNER_APPROVAL: false });
  const verdict = g.authorizeExternalWrite({
    projectId: 'proj-alpha',
    targetPath: target,
    receipts
  });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, 'EXTERNAL_WRITE_PRECONDITION_FAILED');
  assert.ok(verdict.missing.includes('OWNER_APPROVAL'));
  assert.throws(
    () => g.assertPreconditions('proj-alpha', receipts),
    (err) =>
      err instanceof ExternalWriteGatewayError &&
      err.code === 'EXTERNAL_WRITE_PRECONDITION_FAILED' &&
      err.missing.includes('OWNER_APPROVAL')
  );
});

// ─── T3 ───────────────────────────────────────────────────────────────────────
test('T3 all 6 preconditions + fixture path → allow', () => {
  const root = makeFixtureRoot();
  const target = path.join(root, 'docs', 'note.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const g = gatewayFor(root);
  const verdict = g.authorizeExternalWrite({
    projectId: 'proj-alpha',
    targetPath: target,
    receipts: allReceipts()
  });
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.reason, 'OK');
  assert.equal(verdict.PRODUCTION_READY, 'NO');
  for (const k of EXTERNAL_WRITE_PRECONDITIONS) {
    assert.equal(verdict.preconditions[k], true, k);
  }
  assert.equal(isHermeticFixturePath(target, root), true);
});

// ─── T4 ───────────────────────────────────────────────────────────────────────
test('T4 all 6 + real Fundacion-looking path → FUNDACION_ALWAYS_DENY', () => {
  const root = makeFixtureRoot();
  const g = gatewayFor(root);
  const fundacionPaths = [
    'C:\\Users\\valen\\Documents\\Fundacion\\index.html',
    '/Users/valen/Documents/Fundacion/app.js',
    path.join(root, '..', 'Documents', 'Fundacion', 'x.js'),
    '/tmp/some/Fundacion/nested/file.js'
  ];
  for (const p of fundacionPaths) {
    const verdict = g.authorizeExternalWrite({
      projectId: 'proj-alpha',
      targetPath: p,
      receipts: allReceipts()
    });
    assert.equal(verdict.allowed, false, p);
    assert.equal(verdict.reason, 'FUNDACION_ALWAYS_DENY', p);
    assert.equal(verdict.PRODUCTION_READY, 'NO');
  }
  const deny = denyRealFundacion('C:/Users/valen/Documents/Fundacion/x');
  assert.ok(deny);
  assert.equal(deny.reason, 'FUNDACION_ALWAYS_DENY');
  assert.equal(defaultIsRealFundacionPath('/safe/fixture/src/a.js'), false);
});

// ─── T5 ───────────────────────────────────────────────────────────────────────
test('T5 path outside fixture → OUTSIDE_HERMETIC_FIXTURE', () => {
  const root = makeFixtureRoot();
  const outside = path.join(os.tmpdir(), `eos-ewg-outside-${Date.now()}`, 'file.js');
  const g = gatewayFor(root);
  const verdict = g.authorizeExternalWrite({
    projectId: 'proj-alpha',
    targetPath: outside,
    receipts: allReceipts()
  });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.reason, 'OUTSIDE_HERMETIC_FIXTURE');
  assert.equal(isHermeticFixturePath(outside, root), false);
});

// ─── T6 ───────────────────────────────────────────────────────────────────────
test('T6 governed write happy path + receipt hash', async () => {
  const root = makeFixtureRoot();
  const target = path.join(root, 'src', 'widget.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = 'export const x = 1;\n';
  let applied = null;
  const g = gatewayFor(root);
  const receipt = await g.runGovernedWrite({
    projectId: 'proj-alpha',
    targetPath: target,
    receipts: allReceipts(),
    content,
    applyDiff: async ({ targetPath, content: c }) => {
      applied = { targetPath, content: c };
      fs.writeFileSync(targetPath, c, 'utf8');
    },
    rollbackDiff: async () => {
      throw new Error('rollback should not run on happy path');
    },
    runVerifier: async () => ({ ok: true })
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.allowed, true);
  assert.equal(receipt.sha256, sha256(content));
  assert.equal(receipt.sha256, contentSha256(content));
  assert.equal(receipt.PRODUCTION_READY, 'NO');
  assert.equal(receipt.kind, EXTERNAL_WRITE_GATEWAY_KIND);
  assert.equal(receipt.fundacionDeltaOpened, false);
  assert.equal(receipt.hermeticFixtureOnly, true);
  assert.ok(applied);
  assert.equal(fs.readFileSync(target, 'utf8'), content);
});

// ─── T7 ───────────────────────────────────────────────────────────────────────
test('T7 verifier fail → rollback called + fail-closed', async () => {
  const root = makeFixtureRoot();
  const target = path.join(root, 'src', 'bad.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let rollbackCalls = 0;
  const g = gatewayFor(root);
  await assert.rejects(
    () =>
      g.runGovernedWrite({
        projectId: 'proj-alpha',
        targetPath: target,
        receipts: allReceipts(),
        content: 'bad',
        applyDiff: async () => {
          fs.writeFileSync(target, 'bad', 'utf8');
        },
        rollbackDiff: async () => {
          rollbackCalls += 1;
          if (fs.existsSync(target)) fs.unlinkSync(target);
        },
        runVerifier: async () => ({ ok: false, reason: 'a11y fail' })
      }),
    (err) =>
      err instanceof ExternalWriteGatewayError &&
      err.code === 'EXTERNAL_WRITE_VERIFIER_FAILED' &&
      err.rolledBack === true
  );
  assert.equal(rollbackCalls, 1);
  assert.equal(fs.existsSync(target), false);
});

// ─── T8 ───────────────────────────────────────────────────────────────────────
test('T8 apply fail → no false success', async () => {
  const root = makeFixtureRoot();
  const target = path.join(root, 'src', 'fail.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  let verifierCalled = false;
  const g = gatewayFor(root);
  await assert.rejects(
    () =>
      g.runGovernedWrite({
        projectId: 'proj-alpha',
        targetPath: target,
        receipts: allReceipts(),
        content: 'x',
        applyDiff: async () => {
          throw new Error('disk full');
        },
        rollbackDiff: async () => {},
        runVerifier: async () => {
          verifierCalled = true;
          return { ok: true };
        }
      }),
    (err) =>
      err instanceof ExternalWriteGatewayError &&
      err.code === 'EXTERNAL_WRITE_APPLY_FAILED'
  );
  assert.equal(verifierCalled, false);
});

// ─── T9 ───────────────────────────────────────────────────────────────────────
test('T9 partial preconditions list each missing key', () => {
  const root = makeFixtureRoot();
  const g = gatewayFor(root);
  const partial = {
    REGISTERED: true,
    INTAKE_COMPLETE: true
    // SPEC_APPROVED, AUDIT_COMPLETE, OWNER_APPROVAL, LEVEL_2_AUTHORIZED missing
  };
  const evalResult = defaultEvaluatePreconditions('proj-alpha', partial, new Set(['proj-alpha']));
  assert.equal(evalResult.ok, false);
  assert.deepEqual(evalResult.missing.sort(), [
    'AUDIT_COMPLETE',
    'LEVEL_2_AUTHORIZED',
    'OWNER_APPROVAL',
    'SPEC_APPROVED'
  ].sort());

  const target = path.join(root, 'a.txt');
  const verdict = g.authorizeExternalWrite({
    projectId: 'proj-alpha',
    targetPath: target,
    receipts: partial
  });
  assert.equal(verdict.reason, 'EXTERNAL_WRITE_PRECONDITION_FAILED');
  for (const k of [
    'SPEC_APPROVED',
    'AUDIT_COMPLETE',
    'OWNER_APPROVAL',
    'LEVEL_2_AUTHORIZED'
  ]) {
    assert.ok(verdict.missing.includes(k), k);
  }

  // Unregistered project with no REGISTERED receipt
  const unreg = defaultEvaluatePreconditions('unknown', allReceipts({ REGISTERED: false }), new Set());
  assert.ok(unreg.missing.includes('REGISTERED'));
});

// ─── T10 ──────────────────────────────────────────────────────────────────────
test('T10 health never claims Fundacion Δ opened / PRODUCTION_READY yes', () => {
  const g = gatewayFor(makeFixtureRoot());
  const h = g.health();
  const s = g.status();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(s.PRODUCTION_READY, 'NO');
  assert.equal(h.fundacionDeltaOpened, false);
  assert.equal(h.fundacionAlwaysDenyIntact, true);
  assert.equal(h.hermeticFixtureOnly, true);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.level2ReceiptsMeanProductionReady, false);
  assert.equal(h.kind, EXTERNAL_WRITE_GATEWAY_KIND);
  const blob = JSON.stringify(h);
  assert.equal(/PRODUCTION_READY["']?\s*:\s*["']?YES/i.test(blob), false);
  assert.equal(/fundacionDeltaOpened["']?\s*:\s*true/i.test(blob), false);
});

// ─── T11 ──────────────────────────────────────────────────────────────────────
test('T11 NON-CLAIM source strings present in module', () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /Gateway allow ≠ Fundacion Δ=0 flipped|Gateway allow != Fundacion/);
  assert.match(src, /Hermetic fixture ≠ production Fundacion|fixture ≠ production Fundacion|hermetic fixture/i);
  assert.match(src, /Level-2 receipts ≠ PRODUCTION_READY|Level2 receipts ≠ PRODUCTION_READY|level2ReceiptsMeanProductionReady/);
  assert.match(src, /PRODUCTION_READY/);
  assert.match(src, /FUNDACION_ALWAYS_DENY/);
  assert.match(src, /ADR-0013|Δ=0|Delta=0/);
  assert.equal(EXTERNAL_WRITE_CODES.FUNDACION_ALWAYS_DENY, 'FUNDACION_ALWAYS_DENY');
  assert.equal(denyRealFundacion('/safe/path'), null);
});

// ─── T12 ──────────────────────────────────────────────────────────────────────
test('T12 optional SKIP live real Fundacion (must SKIP — never touch)', { skip: 'live real Fundacion must never be touched; hermetic-only Mission T' }, () => {
  // Intentionally unreachable — real Documents/Fundacion is ALWAYS DENIED and out of scope.
  assert.fail('must not execute against real Fundacion');
});
