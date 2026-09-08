import test from 'node:test';
import assert from 'node:assert/strict';
import { SeoValidatorEngine } from '../scripts/engine/seo-validator-engine.js';

test('GAP-SEO-001: Generates valid Schema.org JSON-LD object', () => {
  const engine = new SeoValidatorEngine();

  const jsonLd = engine.generateJsonLd({
    name: 'EOS Autonomous Platform',
    url: 'https://eos.engineering',
    description: 'Autonomous engineering operating system'
  });

  assert.equal(jsonLd['@context'], 'https://schema.org');
  assert.equal(jsonLd['@type'], 'Organization');
  assert.equal(jsonLd.name, 'EOS Autonomous Platform');
  assert.equal(jsonLd.url, 'https://eos.engineering');
});

test('GAP-SEO-001: Positive case — Valid SEO, OpenGraph and JSON-LD pass audit', () => {
  const engine = new SeoValidatorEngine();

  const validHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>EOS Autonomous Platform — Engineering Operating System</title>
        <meta name="description" content="EOS is an evidence-backed autonomous engineering operating system for multi-project development." />
        <link rel="canonical" href="https://eos.engineering" />
        <meta property="og:title" content="EOS Autonomous Platform" />
        <meta property="og:description" content="Autonomous engineering operating system." />
        <meta property="og:image" content="https://eos.engineering/og.png" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "EOS"
          }
        </script>
      </head>
      <body><h1>Welcome to EOS</h1></body>
    </html>
  `;

  const result = engine.auditHtml(validHtml);

  assert.equal(result.passed, true);
  assert.equal(result.validJsonLd, true);
  assert.equal(result.verdict, 'SEO_AUDIT_PASSED');
  assert.ok(result.evidenceHash.length === 64);
});

test('GAP-SEO-001: Negative case — Missing title, viewport and invalid JSON-LD are flagged', () => {
  const engine = new SeoValidatorEngine();

  const brokenHtml = `
    <html>
      <head>
        <script type="application/ld+json">
          { "invalid_json": true
        </script>
      </head>
      <body><div>Broken page</div></body>
    </html>
  `;

  const result = engine.auditHtml(brokenHtml);

  assert.equal(result.passed, false);
  assert.equal(result.validJsonLd, false);
  assert.ok(result.findings.some(f => f.rule === 'SEO-TITLE'));
  assert.ok(result.findings.some(f => f.rule === 'SEO-VIEWPORT'));
  assert.ok(result.findings.some(f => f.rule.includes('JSON-LD')));
});
