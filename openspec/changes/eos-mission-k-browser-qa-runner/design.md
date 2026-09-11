# Design — Mission K

Hermetic-first: CI always injects `clientImpl`. Live Chrome/DevTools path opt-in only (`RUN_LIVE_BROWSER_QA_TESTS` / `BROWSER_QA_ALLOW_LIVE`). Soft QA failures (CWV/a11y) return `ok:false` with custody FAILED; infra errors throw. Screenshot returns receipt hash only (no raw bytes in result). Thresholds: LCP≤2500ms, CLS≤0.1, WCAG 2.1 AA = zero violations.
