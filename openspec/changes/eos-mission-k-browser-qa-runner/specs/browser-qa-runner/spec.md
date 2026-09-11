# Spec — browser-qa-runner

## Requirement: CWV
The runner SHALL evaluate LCP and CLS against good thresholds (LCP ≤ 2500ms, CLS ≤ 0.1).

## Requirement: A11y
The runner SHALL evaluate accessibility against WCAG 2.1 AA (pass iff zero violations).

## Requirement: Screenshot receipt
Successful or soft-fail runs that capture a screenshot SHALL attach a receipt with mimeType, byteLength, sha256, and capturedAt — without embedding raw image bytes in the result envelope.

## Requirement: Custody
Runs SHALL attach custody with tool `browser_qa_run`, input_hash (SHA-256), duration_ms, status VERIFIED|FAILED, PRODUCTION_READY NO.

## Requirement: Hermetic CI
Default tests SHALL inject clientImpl and SHALL NOT require live Chrome. Live tests opt-in via RUN_LIVE_BROWSER_QA_TESTS=true.
