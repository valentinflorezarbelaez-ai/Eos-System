import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RemediationPresets, resolvePreset } from '../src/core/elevate/remediation-presets.js';
import { TDDAutoHealer } from '../src/core/elevate/tdd-auto-healer.js';

describe('EOS-ELEVATE: AST & Remediation Presets', () => {
  it('PRE-01: Auto-fixes empty catch blocks', () => {
    const preset = resolvePreset({ ruleId: 'QUAL-EMPTY-CATCH' });
    assert.ok(preset, 'Must resolve QUAL-EMPTY-CATCH preset');

    const inputCode = 'try { doSomething(); } catch (err) {}';
    const outputCode = preset.apply(inputCode);
    assert.ok(outputCode.includes('console.error'), 'Must inject error handler');
    assert.ok(outputCode.includes('[EOS-AUTO-HEALED]:'), 'Must tag auto-healed error');
  });

  it('PRE-02: Auto-fixes missing image alt attribute', () => {
    const preset = resolvePreset({ ruleId: 'A11Y-IMG-NO-ALT' });
    assert.ok(preset, 'Must resolve A11Y-IMG-NO-ALT preset');

    const inputHtml = '<div class="banner"><img src="/logo.png" class="responsive"></div>';
    const outputHtml = preset.apply(inputHtml);
    assert.ok(outputHtml.includes('alt=""'), 'Must inject alt attribute');
  });

  it('PRE-03: Auto-fixes empty button without accessible name', () => {
    const preset = resolvePreset({ ruleId: 'A11Y-EMPTY-BUTTON' });
    assert.ok(preset, 'Must resolve A11Y-EMPTY-BUTTON preset');

    const inputHtml = '<button class="icon-btn"></button>';
    const outputHtml = preset.apply(inputHtml);
    assert.ok(outputHtml.includes('aria-label="Action"'), 'Must inject aria-label attribute');
  });

  it('PRE-04: Auto-fixes synchronous blocking I/O', () => {
    const preset = resolvePreset({ ruleId: 'PERF-BLOCKING-SYNC-IO' });
    assert.ok(preset, 'Must resolve PERF-BLOCKING-SYNC-IO preset');

    const inputCode = 'const data = fs.readFileSync("path.txt", "utf8");';
    const outputCode = preset.apply(inputCode);
    assert.ok(outputCode.includes('await fs.promises.readFile('), 'Must replace with async promises');
  });

  it('PRE-05: TDDAutoHealer.healFinding executes full TDD lifecycle autonomously', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-healer-preset-'));
    try {
      const brokenFile = path.join(tmpDir, 'vulnerable.js');
      const brokenCode = `
        function processData() {
          try {
            badOp();
          } catch (e) {
          }
        }
      `;
      fs.writeFileSync(brokenFile, brokenCode, 'utf8');

      const healer = new TDDAutoHealer({ targetPath: tmpDir });
      const finding = {
        ruleId: 'QUAL-EMPTY-CATCH',
        file: 'vulnerable.js',
        vector: 'quality',
        message: 'Empty catch block'
      };

      const result = await healer.healFinding(finding);
      assert.equal(result.status, 'REMEDIATED');
      assert.equal(result.falsified, true);
      assert.equal(result.verified, true);

      // Verify file content on disk was actually repaired
      const repairedContent = fs.readFileSync(brokenFile, 'utf8');
      assert.ok(!repairedContent.includes('catch (e) {\n          }'), 'Empty catch must be gone');
      assert.ok(repairedContent.includes('[EOS-AUTO-HEALED]:'), 'Repaired content must contain structured error log');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
