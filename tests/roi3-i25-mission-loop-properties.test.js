/**
 * ROI3 / I2.5 — Mission-loop property tests (L0, no fast-check).
 *
 * Seams: evaluateStageTransition adjacency, tool×stage gating, archive/verify gates.
 * Strategy: exhaustive Cartesian over MISSION_LOOP_ORDER + PropertyBasedFalsifier
 * for unknown/garbage stage labels.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PropertyBasedFalsifier } from '../src/core/formal/property-based-falsifier.js';
import {
  MISSION_LOOP_STAGES,
  MISSION_LOOP_ORDER,
  MISSION_LOOP_TRANSITIONS,
  MISSION_LOOP_ACT_WRITE_TOOLS,
  MISSION_LOOP_TOOL_STAGES,
  MISSION_LOOP_READONLY_ALLOWLIST,
  evaluateStageTransition,
  assertToolStageAllowed,
  assertArchiveAllowed,
  assertVerifyAdvanceAllowed,
  isMissionLoopStage,
  isLoopReadonlyAllowlisted,
  isActWriteTool
} from '../src/core/mcp/mission-loop.js';

describe('ROI3 I2.5 mission-loop properties', () => {
  it('property: every ordered pair is legal iff adjacency table allows it', () => {
    let pairs = 0;
    for (const from of MISSION_LOOP_ORDER) {
      for (const to of MISSION_LOOP_ORDER) {
        pairs += 1;
        const expectedOk = (MISSION_LOOP_TRANSITIONS[from] || []).includes(to);
        const verdict = evaluateStageTransition(from, to);
        assert.equal(
          verdict.ok,
          expectedOk,
          `pair ${from}→${to}: expected ok=${expectedOk}, got ${JSON.stringify(verdict)}`
        );
        if (!expectedOk) {
          assert.ok(
            verdict.code === 'ILLEGAL_STAGE_TRANSITION' || verdict.code === 'UNKNOWN_STAGE',
            `illegal ${from}→${to} must fail-closed with transition code`
          );
        }
      }
    }
    assert.equal(pairs, MISSION_LOOP_ORDER.length ** 2);
  });

  it('property: Archive is a sink (no legal successors)', () => {
    assert.deepEqual(MISSION_LOOP_TRANSITIONS[MISSION_LOOP_STAGES.ARCHIVE], []);
    for (const to of MISSION_LOOP_ORDER) {
      const v = evaluateStageTransition(MISSION_LOOP_STAGES.ARCHIVE, to);
      assert.equal(v.ok, false);
    }
  });

  it('property: happy-path consecutive advances are the only legal edges', () => {
    for (let i = 0; i < MISSION_LOOP_ORDER.length - 1; i++) {
      const from = MISSION_LOOP_ORDER[i];
      const to = MISSION_LOOP_ORDER[i + 1];
      assert.equal(evaluateStageTransition(from, to).ok, true);
      assert.deepEqual(MISSION_LOOP_TRANSITIONS[from], [to]);
    }
  });

  it('property: Act write tools denied at every non-Act stage', () => {
    for (const tool of MISSION_LOOP_ACT_WRITE_TOOLS) {
      assert.equal(isActWriteTool(tool), true);
      for (const stage of MISSION_LOOP_ORDER) {
        const v = assertToolStageAllowed(tool, stage);
        if (stage === MISSION_LOOP_STAGES.ACT) {
          assert.equal(v.allowed, true, `${tool} @ Act`);
        } else {
          assert.equal(v.allowed, false, `${tool} @ ${stage}`);
          assert.equal(v.code, 'MISSION_LOOP_STAGE_DENIED');
        }
      }
    }
  });

  it('property: readonly allowlist tools always allowed at every stage', () => {
    for (const tool of MISSION_LOOP_READONLY_ALLOWLIST) {
      assert.equal(isLoopReadonlyAllowlisted(tool), true);
      for (const stage of MISSION_LOOP_ORDER) {
        const v = assertToolStageAllowed(tool, stage);
        assert.equal(v.allowed, true, `${tool} @ ${stage}`);
      }
    }
  });

  it('property: gated tools only allowed at declared stages', () => {
    for (const [tool, stages] of Object.entries(MISSION_LOOP_TOOL_STAGES)) {
      if (isLoopReadonlyAllowlisted(tool)) continue;
      for (const stage of MISSION_LOOP_ORDER) {
        const v = assertToolStageAllowed(tool, stage);
        const expect = stages.includes(stage);
        assert.equal(v.allowed, expect, `${tool} @ ${stage}`);
      }
    }
  });

  it('property: Archive requires Verify ok:true receipt (table)', () => {
    const cases = [
      { receipts: [], allowed: false },
      { receipts: [{ stage: 'Verify', ok: false }], allowed: false },
      { receipts: [{ stage: 'Evidence', ok: true }], allowed: false },
      { receipts: [{ kind: 'verify', ok: true }], allowed: true },
      { receipts: [{ stage: 'Verify', ok: true }], allowed: true },
      { receipts: [{ stage: 'Verify', ok: true }, { stage: 'Evidence', ok: true }], allowed: true }
    ];
    for (const c of cases) {
      const v = assertArchiveAllowed({ receipts: c.receipts });
      assert.equal(v.allowed, c.allowed, JSON.stringify(c.receipts));
    }
  });

  it('property: Verify advance requires evidence receipt when enforced', () => {
    assert.equal(assertVerifyAdvanceAllowed({ receipts: [] }).allowed, false);
    assert.equal(
      assertVerifyAdvanceAllowed({ receipts: [{ stage: 'Evidence' }] }).allowed,
      true
    );
    assert.equal(
      assertVerifyAdvanceAllowed({ receipts: [{ kind: 'evidence' }] }).allowed,
      true
    );
    assert.equal(
      assertVerifyAdvanceAllowed({ receipts: [] }, { requireEvidence: false }).allowed,
      true
    );
  });

  it('property: unknown stage labels always fail closed (falsifier)', () => {
    const fuzzer = new PropertyBasedFalsifier();
    const stages = MISSION_LOOP_ORDER;
    const result = fuzzer.checkProperty(
      (from, to) => {
        if (isMissionLoopStage(from) && isMissionLoopStage(to)) {
          // Skip legal SSOT pairs — covered exhaustively above
          return true;
        }
        const v = evaluateStageTransition(from, to);
        return v.ok === false && v.code === 'UNKNOWN_STAGE';
      },
      [
        () => (Math.random() < 0.35 ? stages[Math.floor(Math.random() * stages.length)] : fuzzer.arbitraryString(24)),
        () => (Math.random() < 0.35 ? stages[Math.floor(Math.random() * stages.length)] : fuzzer.arbitraryString(24))
      ],
      { iterations: 400 }
    );
    assert.equal(result.passed, true, JSON.stringify(result.minimalCounterExample || result));
  });
});
