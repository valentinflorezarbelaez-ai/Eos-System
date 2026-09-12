import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForceMultiplexer } from '../src/core/routing/force-multiplexer.js';

describe('ForceMultiplexer', () => {
  it('should resolve to fallback when no workload is provided', () => {
    const multiplexer = new ForceMultiplexer();
    const fallback = { id: 'fallback' };
    multiplexer.setFallback(fallback);

    assert.deepEqual(multiplexer.resolve(null), fallback);
    assert.deepEqual(multiplexer.resolve(undefined), fallback);
    assert.deepEqual(multiplexer.resolve(''), fallback);
  });

  it('should resolve to the matching route', () => {
    const route1 = { id: 'r1', canHandle: (w) => w.type === 'compute' };
    const route2 = { id: 'r2', canHandle: (w) => w.type === 'memory' };
    const fallback = { id: 'fallback' };

    const multiplexer = new ForceMultiplexer([route1, route2]);
    multiplexer.setFallback(fallback);

    assert.deepEqual(multiplexer.resolve({ type: 'compute' }), route1);
    assert.deepEqual(multiplexer.resolve({ type: 'memory' }), route2);
  });

  it('should resolve to fallback when no route matches', () => {
    const route1 = { id: 'r1', canHandle: (w) => w.type === 'compute' };
    const fallback = { id: 'fallback' };

    const multiplexer = new ForceMultiplexer([route1]);
    multiplexer.setFallback(fallback);

    assert.deepEqual(multiplexer.resolve({ type: 'network' }), fallback);
  });

  it('should return null when no match and no fallback is set', () => {
    const multiplexer = new ForceMultiplexer();

    assert.equal(multiplexer.resolve({ type: 'compute' }), null);
    assert.equal(multiplexer.resolve(null), null);
  });
});
