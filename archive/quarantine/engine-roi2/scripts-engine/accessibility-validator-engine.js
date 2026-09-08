import crypto from 'node:crypto';

export class AccessibilityValidatorEngine {
  constructor() {
    this.wcagStandard = 'WCAG 2.1 AA';
  }

  // Calculate relative luminance for sRGB color hex (#RRGGBB)
  calculateRelativeLuminance(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const sRgb = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRgb[0] + 0.7152 * sRgb[1] + 0.0722 * sRgb[2];
  }

  // Calculate Contrast Ratio between two colors
  calculateContrastRatio(fgHex, bgHex) {
    const lum1 = this.calculateRelativeLuminance(fgHex);
    const lum2 = this.calculateRelativeLuminance(bgHex);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  }

  // Audit HTML document for WCAG AA compliance
  auditHtml(htmlString = '', options = {}) {
    const findings = [];
    const minContrastNormal = 4.5;
    const minContrastLarge = 3.0;

    // 1. Landmark & Hierarchy Checks
    const hasMain = /<main[\s>]/i.test(htmlString);
    if (!hasMain) {
      findings.push({
        rule: 'WCAG 1.3.1 (Landmarks)',
        severity: 'CRITICAL',
        description: 'Missing <main> landmark element in document.'
      });
    }

    const h1Matches = htmlString.match(/<h1[\s>]/gi) || [];
    if (h1Matches.length === 0) {
      findings.push({
        rule: 'WCAG 1.3.1 (Heading Hierarchy)',
        severity: 'HIGH',
        description: 'Missing <h1> primary heading in document.'
      });
    } else if (h1Matches.length > 1) {
      findings.push({
        rule: 'WCAG 1.3.1 (Heading Hierarchy)',
        severity: 'MEDIUM',
        description: `Multiple (${h1Matches.length}) <h1> headings detected. Prefer a single top-level <h1> per page.`
      });
    }

    // 2. Images Alt Text
    const imgRegex = /<img\s+([^>]*?)>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(htmlString)) !== null) {
      const attrs = imgMatch[1];
      if (!/alt\s*=\s*["'][^"']*["']/i.test(attrs)) {
        findings.push({
          rule: 'WCAG 1.1.1 (Non-text Content)',
          severity: 'HIGH',
          description: `<img> element missing alt attribute: ${imgMatch[0].substring(0, 50)}...`
        });
      }
    }

    // 3. Form Controls Labeling
    const inputRegex = /<input\s+([^>]*?)>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(htmlString)) !== null) {
      const attrs = inputMatch[1];
      if (/type\s*=\s*["'](hidden|submit|button|reset)["']/i.test(attrs)) continue;

      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs);
      const hasId = /id\s*=\s*["']([^"']+)["']/i.test(attrs);
      let hasAssociatedLabel = false;

      if (hasId) {
        const idVal = attrs.match(/id\s*=\s*["']([^"']+)["']/i)[1];
        const labelForRegex = new RegExp(`<label[^>]*for\\s*=\\s*["']${idVal}["']`, 'i');
        hasAssociatedLabel = labelForRegex.test(htmlString);
      }

      if (!hasAriaLabel && !hasAssociatedLabel) {
        findings.push({
          rule: 'WCAG 4.1.2 (Name, Role, Value)',
          severity: 'HIGH',
          description: `Interactive <input> missing associated <label for="..."> or aria-label: ${inputMatch[0].substring(0, 50)}...`
        });
      }
    }

    // 4. Buttons Accessible Name
    const btnRegex = /<button\s*([^>]*)>([\s\S]*?)<\/button>/gi;
    let btnMatch;
    while ((btnMatch = btnRegex.exec(htmlString)) !== null) {
      const attrs = btnMatch[1];
      const innerText = btnMatch[2].replace(/<[^>]*>/g, '').trim();
      const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs);

      if (!innerText && !hasAriaLabel) {
        findings.push({
          rule: 'WCAG 4.1.2 (Button Accessible Name)',
          severity: 'HIGH',
          description: `Empty <button> without text or aria-label: ${btnMatch[0].substring(0, 50)}...`
        });
      }
    }

    // 5. Color Contrast Checks (if provided in options)
    if (options.colorPairs) {
      for (const pair of options.colorPairs) {
        const ratio = this.calculateContrastRatio(pair.fg, pair.bg);
        const required = pair.isLargeText ? minContrastLarge : minContrastNormal;
        if (ratio < required) {
          findings.push({
            rule: 'WCAG 1.4.3 (Contrast Minimum)',
            severity: 'HIGH',
            description: `Contrast ratio for ${pair.name || 'element'} (${pair.fg} on ${pair.bg}) is ${ratio}:1, below required ${required}:1.`
          });
        }
      }
    }

    const passed = findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0;
    const score = Math.max(0, 100 - (findings.length * 15));
    const evidenceHash = crypto.createHash('sha256').update(JSON.stringify({ findings, score })).digest('hex');

    return {
      wcagStandard: this.wcagStandard,
      passed,
      score,
      totalFindings: findings.length,
      findings,
      evidenceHash,
      verdict: passed ? 'WCAG_AA_COMPLIANT' : 'WCAG_AA_FINDINGS_IDENTIFIED'
    };
  }
}
