import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessibilityValidatorEngine } from '../scripts/engine/accessibility-validator-engine.js';

test('GAP-ACC-001: Contrast ratio formula calculates correct WCAG contrast', () => {
  const engine = new AccessibilityValidatorEngine();

  // Pure black on pure white -> 21:1
  const blackOnWhite = engine.calculateContrastRatio('#000000', '#ffffff');
  assert.equal(blackOnWhite, 21);

  // Pure white on pure black -> 21:1
  const whiteOnBlack = engine.calculateContrastRatio('#ffffff', '#000000');
  assert.equal(whiteOnBlack, 21);

  // Identical colors -> 1:1
  const sameColor = engine.calculateContrastRatio('#123456', '#123456');
  assert.equal(sameColor, 1);

  // Light gray on white -> fails 4.5:1
  const lightGray = engine.calculateContrastRatio('#cccccc', '#ffffff');
  assert.ok(lightGray < 4.5);
});

test('GAP-ACC-001: Positive case — Valid accessible HTML passes WCAG AA audit', () => {
  const engine = new AccessibilityValidatorEngine();

  const accessibleHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head><title>Accessible Test Page</title></head>
      <body>
        <header><nav aria-label="Main Navigation"><a href="/">Home</a></nav></header>
        <main>
          <h1>Accessible Dashboard</h1>
          <p>Welcome to the platform.</p>
          <img src="logo.png" alt="Company Logo" />
          <form>
            <label for="email-field">Email Address</label>
            <input id="email-field" type="email" />
            <button type="submit">Submit Request</button>
          </form>
        </main>
        <footer><p>&copy; 2026 EOS</p></footer>
      </body>
    </html>
  `;

  const result = engine.auditHtml(accessibleHtml, {
    colorPairs: [{ name: 'Text on Background', fg: '#111827', bg: '#ffffff', isLargeText: false }]
  });

  assert.equal(result.passed, true);
  assert.equal(result.verdict, 'WCAG_AA_COMPLIANT');
  assert.equal(result.totalFindings, 0);
  assert.ok(result.evidenceHash.length === 64);
});

test('GAP-ACC-001: Negative case — Flags missing main landmark, missing alt, unlabelled inputs and empty buttons', () => {
  const engine = new AccessibilityValidatorEngine();

  const brokenHtml = `
    <div>
      <img src="banner.jpg" />
      <input type="text" placeholder="Enter name" />
      <button></button>
    </div>
  `;

  const result = engine.auditHtml(brokenHtml);

  assert.equal(result.passed, false);
  assert.equal(result.verdict, 'WCAG_AA_FINDINGS_IDENTIFIED');
  assert.ok(result.findings.some(f => f.rule.includes('Landmarks')));
  assert.ok(result.findings.some(f => f.rule.includes('Non-text Content')));
  assert.ok(result.findings.some(f => f.rule.includes('Name, Role, Value')));
  assert.ok(result.findings.some(f => f.rule.includes('Button Accessible Name')));
});
