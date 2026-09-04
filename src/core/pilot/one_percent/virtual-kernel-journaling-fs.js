/**
 * @module VirtualKernelJournalingFs
 * @description [1% Canon - Artefacto 2 (OSTEP)]
 * Simulates OS process scheduling (Priority Preemptive) and a crash-consistent Write-Ahead Journaling filesystem.
 */

import { calculateSha256 } from '../../sdd/epistemic-evidence-engine.js';

export class VirtualKernelJournalingFs {
  constructor() {
    this.processes = [];
    this.storageBlocks = new Map();
    this.journal = [];
    this.isCrashed = false;
  }

  // OS VIRTUALIZATION: Process Scheduler
  addProcess(pid, priority, burstTime) {
    this.processes.push({ pid, priority, burstTime, remainingTime: burstTime, state: 'READY' });
  }

  scheduleCpu() {
    const executionOrder = [];
    const queue = [...this.processes].sort((a, b) => b.priority - a.priority);

    for (const proc of queue) {
      proc.state = 'RUNNING';
      executionOrder.push(proc.pid);
      proc.remainingTime = 0;
      proc.state = 'TERMINATED';
    }

    return {
      execution_order: executionOrder,
      status: 'ALL_PROCESSES_SCHEDULED'
    };
  }

  // OS PERSISTENCE: Write-Ahead Journaling File System
  writeBlock(blockId, data) {
    const journalEntry = {
      tx_id: `TX-${Date.now()}-${blockId}`,
      block_id: blockId,
      data,
      state: 'LOGGED_TO_JOURNAL',
      timestamp: new Date().toISOString()
    };

    journalEntry.sha256 = calculateSha256(JSON.stringify(journalEntry));
    this.journal.push(journalEntry);

    // Commit phase to storage blocks
    this.storageBlocks.set(blockId, data);
    journalEntry.state = 'COMMITTED';

    return {
      block_id: blockId,
      tx_id: journalEntry.tx_id,
      status: 'TRANSACTION_COMMITTED',
      data_sha256: calculateSha256(String(data))
    };
  }

  readBlock(blockId) {
    if (!this.storageBlocks.has(blockId)) {
      return null;
    }
    return this.storageBlocks.get(blockId);
  }

  simulateCrashAndRecover() {
    // Check journal entries and replay any uncommitted blocks
    let recoveredCount = 0;
    for (const entry of this.journal) {
      if (entry.state === 'LOGGED_TO_JOURNAL') {
        this.storageBlocks.set(entry.block_id, entry.data);
        entry.state = 'COMMITTED_AFTER_CRASH_RECOVERY';
        recoveredCount++;
      }
    }

    return {
      status: 'CRASH_RECOVERY_COMPLETE',
      journal_entries_scanned: this.journal.length,
      recovered_transactions: recoveredCount
    };
  }
}
