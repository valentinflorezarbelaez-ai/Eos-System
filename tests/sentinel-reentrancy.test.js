/**
 * L8-S01 — Sentinel overlapping heartbeats (RED / fail-closed).
 * File under test: src/core/sentinel-daemon.js
 *
 * Current main has no inflight mutex: setInterval fires the next latido
 * while a slow FDIR cycle is still running. This suite encodes the
 * invariant (max concurrent inflight === 1) and MUST FAIL until a GREEN
 * remediation PR adds serialization.
 *
 * Do not mutate production in this PR.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EOSSentinelDaemon } from '../src/core/sentinel-daemon.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('L8-S01 sentinel heartbeat reentrancy (fail-closed)', () => {
  it('must not overlap heartbeats when FDIR cycle is slower than intervaloMs', async () => {
    let inflight = 0;
    let maxInflight = 0;
    let started = 0;

    const slowFdir = {
      async ejecutarCicloRecuperacion() {
        started += 1;
        inflight += 1;
        maxInflight = Math.max(maxInflight, inflight);
        // Sleep longer than intervaloMs so a naive setInterval overlaps.
        await delay(80);
        inflight -= 1;
        return { estado: 'NOMINAL', mensaje: 'slow-fdir-fixture', reparaciones: [] };
      }
    };

    const daemon = new EOSSentinelDaemon({
      intervaloMs: 20,
      fdir: slowFdir
    });

    await daemon.iniciar({ 'l8-s01-fixture.js': 'deadbeef' });
    await delay(200);
    daemon.detener();
    // Drain any in-flight cycle so we do not leak timers into other tests.
    await delay(120);

    assert.ok(started >= 1, 'precondition: at least one heartbeat must have started');
    assert.equal(
      maxInflight,
      1,
      `L8-S01: max concurrent inflight heartbeats must be 1 (observed ${maxInflight}; no mutex on current main)`
    );
  });

  it('must mark estado DEGRADED or PANIC when FDIR throws (not swallow to null)', async () => {
    const throwingFdir = {
      async ejecutarCicloRecuperacion() {
        throw new Error('L8-S01 injected FDIR fault');
      }
    };

    const daemon = new EOSSentinelDaemon({
      intervaloMs: 50_000,
      fdir: throwingFdir
    });
    daemon.lineasBaseAutorizadas = { 'l8-s01-throw.js': 'cafe' };

    const result = await daemon.ejecutarLatido();
    const estado = String(daemon.estado || '');

    assert.notEqual(
      result,
      null,
      'L8-S01: FDIR throw must not be swallowed as a silent null return'
    );
    assert.ok(
      estado === 'DEGRADED' || estado === 'PANIC',
      `L8-S01: estado must become DEGRADED or PANIC after FDIR throw (observed ${estado || '<empty>'})`
    );
  });
});
