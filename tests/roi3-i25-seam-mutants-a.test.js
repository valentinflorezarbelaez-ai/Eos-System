/**
 * ROI3 I2.5 seam mutant oracle suite — L0 only, no Stryker.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSION_LOOP_ORDER,
  MISSION_LOOP_TRANSITIONS,
  evaluateStageTransition
} from '../src/core/mcp/mission-loop.js';

describe('ROI3 I2.5 seam mutants A', () => {
  it('kills allow-all adjacency mutant', () => {
    const illegal = [];
    for (const from of MISSION_LOOP_ORDER) {
      for (const to of MISSION_LOOP_ORDER) {
        if (!(MISSION_LOOP_TRANSITIONS[from] || []).includes(to)) illegal.push([from, to]);
      }
    }
    assert.ok(illegal.length > 0);
    for (const [from, to] of illegal) {
      const prod = evaluateStageTransition(from, to);
      assert.equal(prod.ok, false);
    }
  });
});
