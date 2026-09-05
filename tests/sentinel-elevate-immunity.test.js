import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EOSSentinelDaemon } from '../src/core/sentinel-daemon.js';
import { ScannerCouncil } from '../src/core/elevate/scanner-council.js';

describe('EOS Sentinel & Elevate: Active Immunity Integration', () => {
  it('SEN-IMM-01: Sentinel executes multi-vector scan when active immunity is enabled', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-sentinel-test-'));
    try {
      // Create clean file
      fs.writeFileSync(path.join(tmpDir, 'service.js'), 'export function test() { return 42; }');

      const council = new ScannerCouncil({ targetPath: tmpDir });
      const daemon = new EOSSentinelDaemon({
        rootPath: tmpDir,
        scannerCouncil: council,
        enableActiveImmunity: true,
        fdir: {
          async ejecutarCicloRecuperacion() {
            return { estado: 'NOMINAL', mensaje: 'ok', reparaciones: [] };
          }
        }
      });

      const result = await daemon.ejecutarLatido();
      assert.ok(result, 'Heartbeat must return result object');
      assert.ok(Array.isArray(result.councilFindings), 'councilFindings must be an array');
      assert.equal(result.councilFindings.length, 0, 'Clean project should have 0 findings');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('SEN-IMM-02: Sentinel detects violations and seals ledger with active immunity findings', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-sentinel-vuln-'));
    try {
      // Create file with empty catch block (quality violation)
      const badCode = `
        export function risky() {
          try {
            JSON.parse('invalid');
          } catch (e) {
          }
        }
      `;
      fs.writeFileSync(path.join(tmpDir, 'risky.js'), badCode);

      const council = new ScannerCouncil({ targetPath: tmpDir });
      const daemon = new EOSSentinelDaemon({
        rootPath: tmpDir,
        scannerCouncil: council,
        enableActiveImmunity: true,
        fdir: {
          async ejecutarCicloRecuperacion() {
            return { estado: 'NOMINAL', mensaje: 'ok', reparaciones: [] };
          }
        }
      });

      const result = await daemon.ejecutarLatido();
      assert.ok(result.councilFindings.length > 0, 'Should detect quality finding');
      assert.equal(result.councilFindings[0].vector.toLowerCase(), 'quality');
      assert.ok(daemon.lastCouncilFindings.length > 0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('SEN-IMM-03: Operates nominally without scanner council if disabled', async () => {
    const daemon = new EOSSentinelDaemon({
      fdir: {
        async ejecutarCicloRecuperacion() {
          return { estado: 'NOMINAL', mensaje: 'ok', reparaciones: [] };
        }
      }
    });

    const result = await daemon.ejecutarLatido();
    assert.ok(result);
    assert.equal(result.councilFindings, null);
  });
});
