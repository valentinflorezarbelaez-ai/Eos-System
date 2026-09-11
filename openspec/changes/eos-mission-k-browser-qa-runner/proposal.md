# Proposal — Mission K: Browser QA Runner (SPEC-0016)

## Why
EOS needs a governed, hermetic Browser QA surface for Core Web Vitals (LCP/CLS), WCAG 2.1 AA a11y, and screenshot receipts — without coupling CI to a live Chrome session.

## What
1. `src/core/qa/browser-qa-runner.js` — `runBrowserQa` + CWV/a11y evaluators + custody.
2. Injectable `clientImpl` (navigate / collectCwv / runA11yScan / captureScreenshot).
3. Suite `eos-browser-qa-runner.test.js`; slim-exclude; `test:browser-qa`.
4. Release report.

## DoD
Branch `grok/mission-k-browser-qa-runner` from main@1b951af; tests green; SLIM≤145; verify:strict EXIT 0.
