import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionalOutboxPort } from '../src/core/composition/transactional-outbox-port.js';

describe('Mission DV: Transactional Resilient Outbox Pattern Port (L33)', () => {
  it('should store a cryptographically sealed domain event receipt in the outbox', () => {
    const port = new TransactionalOutboxPort();
    
    // Create a mock DU-RCPT (Sovereign Domain Event Receipt)
    const receipt = {
      receiptId: 'DU-RCPT-1234',
      eventDigest: 'a1b2c3d4',
      timestamp: new Date().toISOString(),
      aggregateId: 'user_1',
      eventType: 'UserCreated',
      payload: { role: 'admin' }
    };

    const outboxReceipt = port.store(receipt);

    assert.ok(outboxReceipt.outboxId.startsWith('DV-RCPT-'));
    assert.strictEqual(outboxReceipt.status, 'PENDING');
    assert.strictEqual(outboxReceipt.originalReceiptId, receipt.receiptId);
    
    // Verify pure invariant: DV port never directly dispatches, it only stores.
    const pending = port.getPending();
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].outboxId, outboxReceipt.outboxId);
  });

  it('should allow marking an outbox message as dispatched (DW integration stub)', () => {
    const port = new TransactionalOutboxPort();
    const outboxReceipt = port.store({ receiptId: 'DU-RCPT-5678', eventDigest: 'f5f5f5' });
    
    assert.strictEqual(outboxReceipt.status, 'PENDING');
    
    const dispatched = port.markDispatched(outboxReceipt.outboxId);
    assert.strictEqual(dispatched.status, 'DISPATCHED');
    
    const pending = port.getPending();
    assert.strictEqual(pending.length, 0);
  });

  it('should strictly enforce PRODUCTION_READY=NO', () => {
    const port = new TransactionalOutboxPort();
    assert.strictEqual(port.productionReady, 'NO');
  });
});
