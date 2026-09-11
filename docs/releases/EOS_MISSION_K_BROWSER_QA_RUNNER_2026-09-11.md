# Mission K — Browser QA Runner (SPEC-0016) — 2026-09-11

## Summary

Autonomous Chrome DevTools Browser QA surface at `src/core/qa/browser-qa-runner.js`:

- Core Web Vitals: LCP ≤ 2500ms, CLS ≤ 0.1
- Accessibility: WCAG 2.1 AA (pass iff zero violations)
- Screenshot receipts: mimeType / byteLength / sha256 / capturedAt (no raw bytes in result)
- Injectable `clientImpl`: navigate → collectCwv → runA11yScan → captureScreenshot

Hermetic by default; live path opt-in only (`RUN_LIVE_BROWSER_QA_TESTS` / `BROWSER_QA_ALLOW_LIVE`). Soft QA fails return `ok:false` + custody `FAILED`; infra errors throw.

## Bounds

| Knob | Value |
| --- | --- |
| Timeout | 30s |
| LCP good | ≤ 2500 ms |
| CLS good | ≤ 0.1 |
| A11y | WCAG 2.1 AA |
| Fail-closed | CLIENT_IMPL_REQUIRED, URL_REQUIRED, URL_INVALID, CLIENT_METHOD_MISSING, TIMEOUT |

## Custody

`{ tool: 'browser_qa_run', input_hash (SHA-256; secrets stripped), duration_ms, status: VERIFIED|FAILED, PRODUCTION_READY: NO }`

## Verification (box harness)

- `node --test tests/runners/eos-browser-qa-runner.test.js` → **16 PASS**, 1 SKIP (live gated)
- Slim: `eos-browser-qa-runner.test.js` in `SLIM_SUITE_EXCLUDES`
- Script: `npm run test:browser-qa`

## Governance

- PRODUCTION_READY=NO
- Fundacion Δ=0
- AT_CEILING (exclude-from-slim; TR-01 ≤145)
- Antigravity-first / no Cursor CloudAgent
- Zero new npm dependencies (no puppeteer/playwright packages)

## Branch

`grok/mission-k-browser-qa-runner` from `main@1b951afed09e42ce35ab6ea52abc5df4cb869d27`
