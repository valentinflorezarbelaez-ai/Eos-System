import crypto from 'node:crypto';

export class SeoValidatorEngine {
  constructor() {}

  // Generate canonical JSON-LD structured schema
  generateJsonLd(config = {}) {
    const {
      type = 'Organization',
      name = 'EOS Project',
      url = 'https://example.com',
      description = 'Official Project Web Space',
      logo = 'https://example.com/logo.png',
      contactPoint = { telephone: '+1-555-0100', contactType: 'Customer Support' }
    } = config;

    return {
      '@context': 'https://schema.org',
      '@type': type,
      name,
      url,
      description,
      logo,
      contactPoint: {
        '@type': 'ContactPoint',
        ...contactPoint
      }
    };
  }

  // Audit HTML document for Meta Tags, Open Graph and JSON-LD
  auditHtml(htmlString = '', options = {}) {
    const findings = [];

    // 1. Title Tag
    const titleMatch = htmlString.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch || !titleMatch[1].trim()) {
      findings.push({
        rule: 'SEO-TITLE',
        severity: 'CRITICAL',
        description: 'Missing or empty <title> tag in <head>.'
      });
    } else if (titleMatch[1].trim().length < 10 || titleMatch[1].trim().length > 70) {
      findings.push({
        rule: 'SEO-TITLE-LENGTH',
        severity: 'LOW',
        description: `<title> length (${titleMatch[1].trim().length} chars) is outside optimal range (10-70 chars).`
      });
    }

    // 2. Meta Description
    const metaDescMatch = htmlString.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                          htmlString.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    if (!metaDescMatch || !metaDescMatch[1].trim()) {
      findings.push({
        rule: 'SEO-META-DESCRIPTION',
        severity: 'HIGH',
        description: 'Missing meta description tag.'
      });
    } else if (metaDescMatch[1].trim().length < 50 || metaDescMatch[1].trim().length > 160) {
      findings.push({
        rule: 'SEO-META-DESCRIPTION-LENGTH',
        severity: 'LOW',
        description: `Meta description length (${metaDescMatch[1].trim().length} chars) is outside optimal range (50-160 chars).`
      });
    }

    // 3. Viewport Meta Tag
    const viewportMatch = /<meta\s+name=["']viewport["']/i.test(htmlString);
    if (!viewportMatch) {
      findings.push({
        rule: 'SEO-VIEWPORT',
        severity: 'CRITICAL',
        description: 'Missing responsive <meta name="viewport"> tag.'
      });
    }

    // 4. Open Graph Meta Tags (og:title, og:description, og:image, og:type)
    const requiredOg = ['og:title', 'og:description', 'og:image', 'og:type'];
    for (const og of requiredOg) {
      const hasOg = new RegExp(`<meta\\s+(property|name)=["']${og}["']`, 'i').test(htmlString);
      if (!hasOg) {
        findings.push({
          rule: 'SEO-OPEN-GRAPH',
          severity: 'MEDIUM',
          description: `Missing Open Graph tag: ${og}.`
        });
      }
    }

    // 5. Canonical Link
    const hasCanonical = /<link\s+rel=["']canonical["']/i.test(htmlString);
    if (!hasCanonical) {
      findings.push({
        rule: 'SEO-CANONICAL',
        severity: 'MEDIUM',
        description: 'Missing <link rel="canonical"> tag.'
      });
    }

    // 6. JSON-LD Structured Data
    const jsonLdMatch = htmlString.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
    let validJsonLd = false;
    if (!jsonLdMatch) {
      findings.push({
        rule: 'SEO-JSON-LD',
        severity: 'MEDIUM',
        description: 'Missing Schema.org JSON-LD structured data block.'
      });
    } else {
      try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        if (parsed['@context'] && parsed['@type']) {
          validJsonLd = true;
        } else {
          findings.push({
            rule: 'SEO-JSON-LD-INVALID',
            severity: 'HIGH',
            description: 'JSON-LD block is missing @context or @type properties.'
          });
        }
      } catch (err) {
        findings.push({
          rule: 'SEO-JSON-LD-PARSE-ERROR',
          severity: 'HIGH',
          description: `JSON-LD parsing error: ${err.message}`
        });
      }
    }

    const passed = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0;
    const score = Math.max(0, 100 - (findings.length * 10));
    const evidenceHash = crypto.createHash('sha256').update(JSON.stringify({ findings, score })).digest('hex');

    return {
      passed,
      score,
      validJsonLd,
      totalFindings: findings.length,
      findings,
      evidenceHash,
      verdict: passed ? 'SEO_AUDIT_PASSED' : 'SEO_FINDINGS_IDENTIFIED'
    };
  }
}
