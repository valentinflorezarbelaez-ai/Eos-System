import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FundacionCore } from '../../src/fundacion/core.js';

describe('FundacionCore - Basic Methods', () => {
  it('should initialize with empty ledger and isAuditing false', () => {
    const core = new FundacionCore();
    assert.deepEqual(core.ledger, []);
    assert.equal(core.isAuditing, false);
    assert.equal(core.getLedgerCount(), 0);
  });

  it('inicializar() should reset ledger and set isAuditing true', async () => {
    const core = new FundacionCore();
    core.ledger = [1, 2, 3]; // mock some data
    const result = await core.inicializar();
    assert.deepEqual(core.ledger, []);
    assert.equal(core.isAuditing, true);
    assert.equal(result, true);
  });
});

describe('FundacionCore - registerDonation', () => {
  it('should register a valid donation and return receipt', () => {
    const core = new FundacionCore();
    const payload = { donorId: 'D123', amount: 100, destination: 'Project A' };

    const receipt = core.registerDonation(payload);

    assert.equal(core.getLedgerCount(), 1);
    assert.equal(receipt.status, 'CONSECRATED');
    assert.equal(receipt.donorId, payload.donorId);
    assert.equal(receipt.amount, payload.amount);
    assert.equal(receipt.destination, payload.destination);
    assert.equal(receipt.previousHash, '0'.repeat(64));
    assert.ok(receipt.txId.startsWith('TX-'));
    assert.ok(receipt.timestamp);
    assert.ok(receipt.hashSha256);
    assert.deepEqual(receipt.data, payload);
  });

  it('should calculate correct previousHash for subsequent donations', () => {
    const core = new FundacionCore();
    const receipt1 = core.registerDonation({ donorId: 'D1', amount: 50, destination: 'A' });
    const receipt2 = core.registerDonation({ donorId: 'D2', amount: 75, destination: 'B' });

    assert.equal(core.getLedgerCount(), 2);
    assert.equal(receipt2.previousHash, receipt1.hashSha256);
  });

  it('should throw error on invalid amounts', () => {
    const core = new FundacionCore();

    const invalidPayloads = [
      { donorId: 'D1', amount: 0, destination: 'A' },
      { donorId: 'D1', amount: -10, destination: 'A' },
      { donorId: 'D1', amount: '100', destination: 'A' },
      { donorId: 'D1', amount: NaN, destination: 'A' },
      { donorId: 'D1', destination: 'A' }
    ];

    for (const payload of invalidPayloads) {
      assert.throws(
        () => core.registerDonation(payload),
        (err) => {
          assert.equal(err.code, 'ERR-FUN-INVALID-AMOUNT');
          assert.equal(err.message, 'ERR-FUN-INVALID-AMOUNT: Donation amount must be greater than zero.');
          return true;
        }
      );
    }

    assert.equal(core.getLedgerCount(), 0);
  });
});

describe('FundacionCore - registrarDonacion & verifyLedgerIntegrity', () => {
  it('registrarDonacion() should act as an alias to registerDonation()', async () => {
    const core = new FundacionCore();
    const payload = { donorId: 'D999', amount: 500, destination: 'Project Z' };

    const receipt = await core.registrarDonacion(payload);

    assert.equal(core.getLedgerCount(), 1);
    assert.equal(receipt.status, 'CONSECRATED');
    assert.equal(receipt.donorId, payload.donorId);
  });

  it('verifyLedgerIntegrity() should return true for an intact ledger', () => {
    const core = new FundacionCore();
    core.registerDonation({ donorId: 'D1', amount: 10, destination: 'A' });
    core.registerDonation({ donorId: 'D2', amount: 20, destination: 'B' });
    core.registerDonation({ donorId: 'D3', amount: 30, destination: 'C' });

    assert.equal(core.verifyLedgerIntegrity(), true);
  });

  it('verifyLedgerIntegrity() should return false if ledger is tampered', () => {
    const core = new FundacionCore();
    core.registerDonation({ donorId: 'D1', amount: 10, destination: 'A' });
    core.registerDonation({ donorId: 'D2', amount: 20, destination: 'B' });

    // Tamper the ledger data
    core.ledger[0].amount = 9999;

    assert.equal(core.verifyLedgerIntegrity(), false);
  });

  it('verifyLedgerIntegrity() should return false if previousHash chain is broken', () => {
    const core = new FundacionCore();
    core.registerDonation({ donorId: 'D1', amount: 10, destination: 'A' });
    core.registerDonation({ donorId: 'D2', amount: 20, destination: 'B' });

    // The previousHash of the second block will be tested against the current value in verifyLedgerIntegrity
    // So we can break it like this:
    core.ledger[1].timestamp = 'broken';

    assert.equal(core.verifyLedgerIntegrity(), false);
  });
});
