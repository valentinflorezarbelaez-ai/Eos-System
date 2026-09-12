import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FundacionAllocation } from '../../src/fundacion/allocation.js';

describe('FundacionAllocation', () => {
  it('constructor sets core and initializes allocations array', () => {
    const mockCore = { ledger: [] };
    const allocation = new FundacionAllocation(mockCore);
    assert.equal(allocation.core, mockCore);
    assert.deepEqual(allocation.allocations, []);
  });

  describe('getProjectBalance', () => {
    it('calculates total donated minus total allocated (direct properties)', () => {
      const mockCore = {
        ledger: [
          { destination: 'PROJ1', amount: 100 },
          { destination: 'PROJ2', amount: 50 },
          { destination: 'PROJ1', amount: 200 }
        ]
      };
      const allocation = new FundacionAllocation(mockCore);
      allocation.allocations = [
        { projectId: 'PROJ1', amount: 50 },
        { projectId: 'PROJ1', amount: 25 }
      ];

      assert.equal(allocation.getProjectBalance('PROJ1'), 225); // (100+200) - (50+25)
      assert.equal(allocation.getProjectBalance('PROJ2'), 50); // 50 - 0
      assert.equal(allocation.getProjectBalance('PROJ3'), 0); // 0 - 0
    });

    it('calculates total donated minus total allocated (nested data properties)', () => {
      const mockCore = {
        ledger: [
          { data: { destination: 'PROJ1', amount: 100 } },
          { data: { destination: 'PROJ2', amount: 50 } },
          { data: { destination: 'PROJ1', amount: 200 } }
        ]
      };
      const allocation = new FundacionAllocation(mockCore);
      allocation.allocations = [
        { projectId: 'PROJ1', amount: 50 },
        { projectId: 'PROJ1', amount: 25 }
      ];

      assert.equal(allocation.getProjectBalance('PROJ1'), 225);
      assert.equal(allocation.getProjectBalance('PROJ2'), 50);
      assert.equal(allocation.getProjectBalance('PROJ3'), 0);
    });
  });

  describe('allocateFunds', () => {
    it('throws ERR-FUN-INVALID-ALLOCATION-AMOUNT for non-numbers, negative numbers, or zero', () => {
      const allocation = new FundacionAllocation({ ledger: [] });
      const invalidAmounts = [0, -10, NaN, '100', undefined, null];

      for (const amt of invalidAmounts) {
        assert.throws(
          () => allocation.allocateFunds({ projectId: 'PROJ1', amountToAllocate: amt, purpose: 'Test' }),
          (err) => err.code === 'ERR-FUN-INVALID-ALLOCATION-AMOUNT'
        );
      }
    });

    it('throws ERR-FUN-INSUFFICIENT-PROJECT-FUNDS when amount exceeds balance', () => {
      const mockCore = { ledger: [{ destination: 'PROJ1', amount: 100 }] };
      const allocation = new FundacionAllocation(mockCore);

      assert.throws(
        () => allocation.allocateFunds({ projectId: 'PROJ1', amountToAllocate: 150, purpose: 'Test' }),
        (err) => err.code === 'ERR-FUN-INSUFFICIENT-PROJECT-FUNDS'
      );
    });

    it('successfully allocates funds when balance is sufficient', () => {
      const mockCore = { ledger: [{ destination: 'PROJ1', amount: 100 }] };
      const allocation = new FundacionAllocation(mockCore);

      const receipt = allocation.allocateFunds({ projectId: 'PROJ1', amountToAllocate: 60, purpose: 'First allocation' });

      assert.equal(receipt.projectId, 'PROJ1');
      assert.equal(receipt.amount, 60);
      assert.equal(receipt.purpose, 'First allocation');
      assert.equal(receipt.status, 'ALLOCATED');
      assert.ok(receipt.allocationId.startsWith('ALC-'));
      assert.ok(receipt.digest.startsWith('sha256-'));
      assert.ok(receipt.timestamp);

      assert.equal(allocation.allocations.length, 1);
      assert.deepEqual(allocation.allocations[0], receipt);

      assert.equal(allocation.getProjectBalance('PROJ1'), 40);
    });
  });

  describe('generatePublicAuditReport', () => {
    it('generates a correct matrix of all projects', () => {
      const mockCore = {
        ledger: [
          { destination: 'PROJ1', amount: 100 },
          { data: { destination: 'PROJ2', amount: 200 } }
        ]
      };
      const allocation = new FundacionAllocation(mockCore);
      allocation.allocateFunds({ projectId: 'PROJ1', amountToAllocate: 40, purpose: 'Test 1' });
      allocation.allocateFunds({ projectId: 'PROJ2', amountToAllocate: 50, purpose: 'Test 2' });

      const report = allocation.generatePublicAuditReport();
      assert.ok(report.timestamp);
      assert.deepEqual(report.projects, {
        'PROJ1': { totalDonated: 100, totalAllocated: 40, netBalance: 60 },
        'PROJ2': { totalDonated: 200, totalAllocated: 50, netBalance: 150 }
      });
    });

    it('includes projects that only have allocations (though normally invalid state)', () => {
      const mockCore = { ledger: [] };
      const allocation = new FundacionAllocation(mockCore);
      // Forcing allocation to test the Set merging logic
      allocation.allocations.push({ projectId: 'PROJ_GHOST', amount: 10 });

      const report = allocation.generatePublicAuditReport();
      assert.deepEqual(report.projects, {
        'PROJ_GHOST': { totalDonated: 0, totalAllocated: 10, netBalance: -10 }
      });
    });
  });
});
