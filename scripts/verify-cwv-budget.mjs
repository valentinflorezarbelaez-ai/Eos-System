import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("==================================================================");
console.log(" EOS SYSTEM — STATIC UI MARKUP AND ASSET ASSERTIONS   ");
console.log("==================================================================");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/eos.css"), "utf8");
const js = fs.readFileSync(path.join(root, "js/eos.js"), "utf8");

// 1. LCP (Largest Contentful Paint) Invariants
assert.ok(html.includes('rel="preload"'), "LCP Violation: Critical assets must have preload hints");
assert.ok(html.includes('fetchpriority="high"'), "LCP Violation: Hero emblem must have fetchpriority='high'");
assert.ok(html.includes('type="speculationrules"'), "LCP Violation: Speculation rules must be active for 0ms navigation");
assert.ok(html.includes('preconnect" href="https://fonts.googleapis.com"'), "LCP Violation: Preconnect to font domains required");
console.log("[PASS] 1/4 Critical-asset preload and speculation-rule markup present.");

// 2. CLS (Cumulative Layout Shift < 0.1) Invariants
assert.ok(css.includes("contain-intrinsic-size"), "CLS Violation: CSS must specify contain-intrinsic-size");
assert.ok(css.includes("content-visibility: auto"), "CLS Violation: Modern deferred rendering must be configured");
const imgTagsWithoutDimensions = (html.match(/<img(?![^>]*width=)[^>]*>/g) || []);
assert.equal(
  imgTagsWithoutDimensions.length,
  0,
  `CLS Violation: Found ${imgTagsWithoutDimensions.length} <img> tags without explicit width attribute`
);
console.log("[PASS] 2/4 Static layout-stability hints present; CLS was not measured in a browser.");

// 3. INP (Interaction to Next Paint < 200ms) Invariants
assert.ok(css.includes("touch-action: manipulation"), "INP Violation: touch-action: manipulation required to eliminate tap delay");
assert.ok(html.includes('defer></script>'), "INP Violation: Scripts must be non-blocking (defer)");
console.log("[PASS] 3/4 Touch-action and deferred-script markup present; INP was not measured.");

// 4. WCAG 2.1 AA Accessibility & Semantic DOM Invariants
assert.ok(html.includes('class="skip-link" href="#main-content"'), "A11y Violation: Skip link to main content required");
assert.ok(html.includes('role="region"'), "A11y Violation: Semantic landmark regions required");
assert.ok(html.includes('aria-live="polite"'), "A11y Violation: Screen reader live regions required");
assert.ok(html.includes('closedby="any"'), "A11y Violation: Native light-dismiss dialog required");
assert.ok(html.includes('integrity="sha384-'), "Security Violation: Subresource Integrity (SRI) SHA-384 required");
console.log("[PASS] 4/4 Selected accessibility and semantic-markup assertions passed; this is not a full WCAG audit.");

console.log("------------------------------------------------------------------");
console.log(" STATIC ASSERTIONS PASSED; NO BROWSER CWV MEASUREMENT OR FULL WCAG AUDIT WAS RUN  ");
console.log("==================================================================");
