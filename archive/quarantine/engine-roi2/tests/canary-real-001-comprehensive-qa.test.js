// =========================================================================
// EOS — CANARY-REAL-001: COMPREHENSIVE TECHNICAL VALIDATION SUITE (T14 - T18)
// Epistemic Standard: Evidence Over Claims
// Targets: Alexander Rodríguez Remodelaciones (EOS-Lab/Canary-Real-001)
// =========================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { StepQualificationEngine } from '../EOS-Lab/Canary-Real-001/src/components/StepQualificationForm.js';
import { WhatsAppPayloadDispatcher } from '../EOS-Lab/Canary-Real-001/src/components/WhatsAppPayloadDispatcher.js';
import { LiveQuoteCalculator } from '../EOS-Lab/Canary-Real-001/src/components/LiveQuoteCalculator.js';
import { HeroConversionHeader } from '../EOS-Lab/Canary-Real-001/src/components/HeroConversionHeader.js';
import { TrustProofSection } from '../EOS-Lab/Canary-Real-001/src/components/TrustProofSection.js';
import { AccessibilityValidatorEngine } from '../scripts/engine/accessibility-validator-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const canaryDir = path.join(rootDir, 'EOS-Lab/Canary-Real-001');

// =========================================================================
// T14: SECURITY AUDIT (OWASP, XSS, PROTOTYPE POLLUTION, PAYLOAD TAMPERING)
// =========================================================================

test('T14.1 - Security: Zero secrets, tokens, or private credentials in codebase', () => {
  const filesToScan = [
    'src/index.html',
    'src/styles/remodelaciones.css',
    'src/components/HeroConversionHeader.js',
    'src/components/LiveQuoteCalculator.js',
    'src/components/StepQualificationForm.js',
    'src/components/TrustProofSection.js',
    'src/components/WhatsAppPayloadDispatcher.js'
  ];

  const secretPatterns = [
    /sk-[a-zA-Z0-9]{20,}/,
    /AKIA[A-Z0-9]{16}/,
    /ghp_[a-zA-Z0-9]{36}/,
    /AIzaSy[a-zA-Z0-9_-]{33}/,
    /Bearer\s+[a-zA-Z0-9._-]+/i,
    /password\s*[:=]\s*["'][^"']+["']/i,
    /private_key/i
  ];

  for (const relPath of filesToScan) {
    const fullPath = path.join(canaryDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of secretPatterns) {
      assert.ok(!pattern.test(content), `Secret pattern ${pattern} detected in ${relPath}`);
    }
  }
});

test('T14.2 - Security: XSS & HTML injection vectors neutralized at input boundary', () => {
  const engine = new StepQualificationEngine();
  
  const xssVectors = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(document.cookie)>',
    '<svg onload=alert(1)>',
    '"><script>alert(1)</script>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)"></iframe>'
  ];

  for (const vector of xssVectors) {
    const sanitized = engine.sanitizeInput(`Carlos ${vector} Montoya`);
    assert.ok(!sanitized.includes('<script>'), `Failed to sanitize script tag in: ${vector}`);
    assert.ok(!sanitized.includes('<img'), `Failed to sanitize img tag in: ${vector}`);
    assert.ok(!sanitized.includes('<svg'), `Failed to sanitize svg tag in: ${vector}`);
    assert.ok(!sanitized.includes('<iframe'), `Failed to sanitize iframe tag in: ${vector}`);
    assert.ok(!sanitized.includes('<'), `Sanitized string still contains '<': ${sanitized}`);
    assert.ok(!sanitized.includes('>'), `Sanitized string still contains '>': ${sanitized}`);
  }
});

test('T14.3 - Security: Prototype pollution & property injection protection', () => {
  const engine = new StepQualificationEngine();
  const maliciousObject = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}, "clientName": "Test"}');

  const result = engine.evaluateQualification(maliciousObject);
  assert.equal({}.polluted, undefined, 'Prototype was polluted!');
  assert.equal(result.isQualified, false);
});

test('T14.4 - Security: Oversized payload truncation and phone sanitization', () => {
  const engine = new StepQualificationEngine();
  const oversizedName = 'A'.repeat(10000);
  const dirtyPhone = '+57 (300) 123-4567 ext 999; DROP TABLE clients;';

  const result = engine.evaluateQualification({
    clientName: oversizedName,
    phone: dirtyPhone,
    location: 'RIONEGRO_LLANOGRANDE',
    scope: 'REMODELACION_INTEGRAL',
    projectType: 'CASA_PARCELACION'
  });

  assert.equal(result.sanitizedData.phone, '5730012345');
  assert.ok(result.sanitizedData.phone.length <= 10);
  assert.ok(!result.sanitizedData.phone.includes('DROP'));
});

test('T14.5 - Security: LiveQuoteCalculator trust boundary enforcement (ESTIMATE !== QUOTE)', () => {
  const calculator = new LiveQuoteCalculator();

  // Negative area or non-standard scope cannot produce unconstrained outputs
  const resNegative = calculator.calculateEstimate({ projectType: 'CASA_PARCELACION', scope: 'MALICIOUS_SCOPE' });
  assert.equal(resNegative.status, 'INSUFFICIENT_DATA_REQUIRES_SITE_VISIT');
  assert.equal(resNegative.bracketMinCop, null);

  // Prototype tampering attempt
  const resProto = calculator.calculateEstimate({ projectType: '__proto__', scope: 'REMODELACION_INTEGRAL' });
  assert.equal(resProto.status, 'INSUFFICIENT_DATA_REQUIRES_SITE_VISIT');

  // Enforces explicit non-binding disclaimer
  const validRes = calculator.calculateEstimate({ projectType: 'APARTAMENTO', scope: 'REMODELACION_INTEGRAL' });
  assert.equal(validRes.isExactQuote, false);
  assert.ok(validRes.legalDisclaimer.includes('no constituye cotización final'));
});

test('T14.6 - Security: WhatsApp payload tampering and protocol injection prevention', () => {
  const dispatcher = new WhatsAppPayloadDispatcher({ businessPhone: '573001234567' });

  const tamperedLead = {
    clientName: 'Carlos\r\nLocation: FAKE_OVERRIDE\nhttps://evil.com',
    phone: '3001234567',
    projectType: 'Casa',
    scope: 'Integral',
    location: 'Rionegro',
    budgetRange: '$60M COP'
  };

  const cta = dispatcher.generateWhatsAppLink(tamperedLead);
  assert.ok(cta.url.startsWith('https://wa.me/573001234567?text='));
  // URL encoding prevents protocol smuggling
  assert.ok(!cta.url.includes('\r'));
  assert.ok(!cta.url.includes('\n'));
});

// =========================================================================
// T15: ACCESSIBILITY (WCAG 2.1 AA) AUDIT
// =========================================================================

test('T15.1 - A11y: WCAG 2.1 AA Automated Audit via AccessibilityValidatorEngine', () => {
  const a11yEngine = new AccessibilityValidatorEngine();
  const htmlContent = fs.readFileSync(path.join(canaryDir, 'src/index.html'), 'utf8');

  const auditResult = a11yEngine.auditHtml(htmlContent, {
    colorPairs: [
      { name: 'Primary Text on Main BG', fg: '#f8fafc', bg: '#0f172a', isLargeText: false },
      { name: 'Secondary Text on Main BG', fg: '#94a3b8', bg: '#0f172a', isLargeText: false },
      { name: 'Amber CTA Button Text', fg: '#0f172a', bg: '#f59e0b', isLargeText: true },
      { name: 'Accent Blue on Main BG', fg: '#38bdf8', bg: '#0f172a', isLargeText: false },
      { name: 'Accent Emerald on Main BG', fg: '#10b981', bg: '#0f172a', isLargeText: false }
    ]
  });

  assert.equal(auditResult.passed, true);
  assert.equal(auditResult.verdict, 'WCAG_AA_COMPLIANT');
  assert.equal(auditResult.totalFindings, 0);
  assert.equal(auditResult.score, 100);
});

test('T15.2 - A11y: Color contrast ratios meet or exceed WCAG AA thresholds', () => {
  const a11yEngine = new AccessibilityValidatorEngine();

  const primaryTextContrast = a11yEngine.calculateContrastRatio('#f8fafc', '#0f172a');
  assert.ok(primaryTextContrast >= 4.5, `Primary text contrast ${primaryTextContrast} is below 4.5:1`);

  const secondaryTextContrast = a11yEngine.calculateContrastRatio('#94a3b8', '#0f172a');
  assert.ok(secondaryTextContrast >= 4.5, `Secondary text contrast ${secondaryTextContrast} is below 4.5:1`);

  const buttonTextContrast = a11yEngine.calculateContrastRatio('#0f172a', '#f59e0b');
  assert.ok(buttonTextContrast >= 4.5, `Button text contrast ${buttonTextContrast} is below 4.5:1`);

  const blueBadgeContrast = a11yEngine.calculateContrastRatio('#38bdf8', '#0f172a');
  assert.ok(blueBadgeContrast >= 4.5, `Blue badge contrast ${blueBadgeContrast} is below 4.5:1`);

  const emeraldContrast = a11yEngine.calculateContrastRatio('#10b981', '#0f172a');
  assert.ok(emeraldContrast >= 4.5, `Emerald text contrast ${emeraldContrast} is below 4.5:1`);
});

test('T15.3 - A11y: Form controls have explicit labels, legends, and aria-live regions', () => {
  const htmlContent = fs.readFileSync(path.join(canaryDir, 'src/index.html'), 'utf8');

  // Explicit label pairings
  assert.ok(htmlContent.includes('<label for="location-select">'));
  assert.ok(htmlContent.includes('id="location-select"'));
  assert.ok(htmlContent.includes('<label for="client-name">'));
  assert.ok(htmlContent.includes('id="client-name"'));
  assert.ok(htmlContent.includes('<label for="client-phone">'));
  assert.ok(htmlContent.includes('id="client-phone"'));

  // Fieldset grouping
  assert.ok(htmlContent.includes('<fieldset class="form-group">'));
  assert.ok(htmlContent.includes('<legend>Paso 1:'));
  assert.ok(htmlContent.includes('<legend>Paso 2:'));

  // Dynamic live announcements
  assert.ok(htmlContent.includes('role="region" aria-live="polite"'));
});

test('T15.4 - A11y: Focus visible styling and keyboard accessibility', () => {
  const cssContent = fs.readFileSync(path.join(canaryDir, 'src/styles/remodelaciones.css'), 'utf8');

  // Focus visible rings defined
  assert.ok(cssContent.includes(':focus-visible'));
  assert.ok(cssContent.includes('outline: 3px solid var(--color-accent-blue)'));
  assert.ok(cssContent.includes('.input-text:focus, select:focus'));
  assert.ok(cssContent.includes('outline: 2px solid var(--color-accent-amber)'));
});

// =========================================================================
// T16: PERFORMANCE & BUNDLE AUDIT
// =========================================================================

test('T16.1 - Performance: Asset payload within strict budget (HTML < 15KB, CSS < 10KB)', () => {
  const htmlStats = fs.statSync(path.join(canaryDir, 'src/index.html'));
  const cssStats = fs.statSync(path.join(canaryDir, 'src/styles/remodelaciones.css'));

  const htmlKb = htmlStats.size / 1024;
  const cssKb = cssStats.size / 1024;

  assert.ok(htmlKb < 15.0, `HTML payload ${htmlKb.toFixed(2)}KB exceeds 15KB budget`);
  assert.ok(cssKb < 10.0, `CSS payload ${cssKb.toFixed(2)}KB exceeds 10KB budget`);
  assert.ok(htmlKb + cssKb < 25.0, `Total initial payload ${(htmlKb + cssKb).toFixed(2)}KB exceeds 25KB budget`);
});

test('T16.2 - Performance: Zero external runtime dependencies & native modern JS', () => {
  const htmlContent = fs.readFileSync(path.join(canaryDir, 'src/index.html'), 'utf8');

  // Zero external script CDN dependencies (no jQuery, no React runtime, no Bootstrap)
  assert.ok(!htmlContent.includes('cdn.jsdelivr.net'));
  assert.ok(!htmlContent.includes('cdnjs.cloudflare.com'));
  assert.ok(!htmlContent.includes('unpkg.com'));
  assert.ok(!htmlContent.includes('code.jquery.com'));

  // Uses native ESM modules
  assert.ok(htmlContent.includes('<script type="module">'));
});

test('T16.3 - Performance: System font stack eliminates remote webfont layout shifts (CLS = 0)', () => {
  const cssContent = fs.readFileSync(path.join(canaryDir, 'src/styles/remodelaciones.css'), 'utf8');
  assert.ok(cssContent.includes('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'));
  assert.ok(!cssContent.includes('@import url'));
  assert.ok(!cssContent.includes('fonts.googleapis.com'));
});

// =========================================================================
// T17: BROWSER & E2E FLOW QA
// =========================================================================

test('T17.1 - Browser QA: Full 3-Step Prequalification Flow with live estimate', () => {
  const engine = new StepQualificationEngine();
  const calculator = new LiveQuoteCalculator();
  const dispatcher = new WhatsAppPayloadDispatcher({ businessPhone: '573001234567' });

  // Scenario 1: Casa en Parcelación en Llanogrande -> Remodelación Integral
  const est1 = calculator.calculateEstimate({ projectType: 'CASA_PARCELACION', scope: 'REMODELACION_INTEGRAL' });
  assert.equal(est1.status, 'ESTIMATE_CALCULATED');
  assert.equal(est1.formattedRangeText, '$60M - $150M COP');

  const qual1 = engine.evaluateQualification({
    projectType: 'CASA_PARCELACION',
    scope: 'REMODELACION_INTEGRAL',
    location: 'RIONEGRO_LLANOGRANDE',
    clientName: 'Felipe Echeverri',
    phone: '3104567890'
  });

  assert.equal(qual1.isQualified, true);
  assert.equal(qual1.coverageStatus, 'IN_COVERAGE');

  const cta1 = dispatcher.generateWhatsAppLink({
    projectType: 'Casa en Parcelación',
    scope: 'Remodelación Integral',
    location: 'Rionegro (Llanogrande)',
    budgetRange: est1.formattedRangeText,
    clientName: qual1.sanitizedData.clientName,
    phone: qual1.sanitizedData.phone
  });

  assert.ok(cta1.url.includes('https://wa.me/573001234567'));
  assert.ok(decodeURIComponent(cta1.url).includes('Felipe Echeverri'));
  assert.ok(decodeURIComponent(cta1.url).includes('$60M - $150M COP'));
});

test('T17.2 - Browser QA: Out of coverage location triggers referral guidance', () => {
  const engine = new StepQualificationEngine();

  const qualOutOfArea = engine.evaluateQualification({
    projectType: 'APARTAMENTO',
    scope: 'COCINA_BANOS',
    location: 'OTRA_ZONA',
    clientName: 'Valeria Restrepo',
    phone: '3001112233'
  });

  assert.equal(qualOutOfArea.isQualified, false);
  assert.equal(qualOutOfArea.coverageStatus, 'OUT_OF_COVERAGE');
  assert.ok(qualOutOfArea.ariaAnnouncement.includes('fuera de nuestra zona de cobertura'));
});

test('T17.3 - Browser QA: Trust proof claims filtered strictly by evidence gate', () => {
  const trust = new TrustProofSection();
  const rendered = trust.render();

  assert.ok(rendered.includes('Atención presencial en Rionegro y Llanogrande'));
  assert.ok(rendered.includes('Presupuesto cerrado por contrato'));
  assert.ok(rendered.includes('Visita técnica de diagnóstico'));
});
