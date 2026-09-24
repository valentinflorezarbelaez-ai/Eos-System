/**
 * @module quarantine-execution-port
 * SPEC-0117 / Mission DH — Quarantine / Soft-Remove Execution Port.
 * Pure Layer-0 Node.js (node:crypto, node:fs). Never seal secrets.
 *
 * Coordinates safe, non-destructive file quarantine isolation for PO Level-2
 * approved named paths.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 06af7278
 *   Zero data destruction: relocates approved files to .quarantine/<date>/
 *   Hard deletes (rm -rf, purge) and mass prunes are strictly rejected
 *   Each execution produces a sealed DH-RCPT-* with verifiable manifest digest
 *   schemas AT_CEILING 35/35
 */

import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import path from 'node:path';

import {
  DH_PRODUCTION_READY,
  sha256Canonical,
  normalizeQuarantinedPaths,
  buildQuarantineExecutionReceipt,
  verifyQuarantineExecutionReceipt
} from './quarantine-execution-receipt.js';

import {
  QuarantineExecutionPolicyGate,
  DH_CODES
} from './quarantine-execution-policy-gate.js';

/** @type {'NO'} */
export const DH_PORT_PRODUCTION_READY = 'NO';
export const DH_PORT_KIND = 'eos-quarantine-execution-port';

export class QuarantineExecutionPort {
  /**
   * @param {object} [opts]
   * @param {object} [opts.fileSystemDouble] Mock filesystem with { files: Map, moves: Array }
   * @param {QuarantineExecutionPolicyGate} [opts.policyGate]
   * @param {string} [opts.quarantineRoot] Defaults to '.quarantine'
   */
  constructor(opts = {}) {
    this.fs = opts.fileSystemDouble || null;
    this.policyGate = opts.policyGate || new QuarantineExecutionPolicyGate();
    this.quarantineRoot = opts.quarantineRoot || '.quarantine';
    this.trail = [];
    this.productionReady = DH_PORT_PRODUCTION_READY;
  }

  /**
   * Governs and executes quarantine isolation under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object, manifest: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildQuarantineExecutionReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-30-mission-dh',
        decision: 'DENY',
        executionMode: input.executionMode || 'ACTIVE',
        quarantinedPaths: input.quarantinedPaths || [],
        quarantineDir: input.quarantineDir || `${this.quarantineRoot}/${new Date().toISOString().slice(0, 10)}`,
        manifestDigest: sha256Canonical(JSON.stringify([])),
        dgReceiptLink: input.dgReceipt ? input.dgReceipt.receiptId : null,
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(deniedReceipt);
      return {
        ok: false,
        decision: 'DENY',
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: deniedReceipt,
        manifest: { files: [], manifestDigest: deniedReceipt.manifestDigest }
      };
    }

    if (input.executionMode === 'HOLD') {
      const holdReceipt = buildQuarantineExecutionReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        executionMode: 'HOLD',
        quarantinedPaths: input.quarantinedPaths || [],
        quarantineDir: input.quarantineDir || `${this.quarantineRoot}/${new Date().toISOString().slice(0, 10)}`,
        manifestDigest: sha256Canonical(JSON.stringify([])),
        dgReceiptLink: input.dgReceipt ? input.dgReceipt.receiptId : null,
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DH_CODES.OK,
        receipt: holdReceipt,
        manifest: { files: [], manifestDigest: holdReceipt.manifestDigest }
      };
    }

    // ACTIVE mode: perform non-destructive quarantine isolation
    const dateStr = new Date().toISOString().slice(0, 10);
    const quarantineDir = input.quarantineDir || `${this.quarantineRoot}/${dateStr}`;
    const paths = normalizeQuarantinedPaths(input.quarantinedPaths);
    const fileEntries = [];

    for (const p of paths) {
      const dest = `${quarantineDir}/${p}`;
      let content = '';
      let sha256 = '';

      if (this.fs) {
        if (this.fs.files.has(p)) {
          content = this.fs.files.get(p);
        }
        sha256 = sha256Canonical(content);
        this.fs.moves.push({ from: p, to: dest, sha256 });
        this.fs.files.delete(p);
        this.fs.files.set(dest, content);
      } else {
        try {
          if (existsSync(p)) {
            content = readFileSync(p);
            sha256 = sha256Canonical(content);
            const destDir = path.dirname(dest);
            mkdirSync(destDir, { recursive: true });
            renameSync(p, dest);
          } else {
            sha256 = sha256Canonical('');
          }
        } catch (err) {
          sha256 = sha256Canonical(String(err));
        }
      }

      fileEntries.push({
        path: p,
        quarantinedTo: dest,
        sha256,
        bytes: Buffer.byteLength(content)
      });
    }

    const manifestDigest = sha256Canonical(JSON.stringify(fileEntries));
    const manifest = {
      files: fileEntries,
      manifestDigest,
      timestamp: new Date().toISOString()
    };

    const receipt = buildQuarantineExecutionReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      executionMode: 'ACTIVE',
      quarantinedPaths: paths,
      quarantineDir,
      manifestDigest,
      dgReceiptLink: input.dgReceipt ? input.dgReceipt.receiptId : null,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DH_CODES.OK,
      receipt,
      manifest
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DH_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifyQuarantineExecutionReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DH_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DH_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DH_CODES.TRAIL_OK };
  }
}
