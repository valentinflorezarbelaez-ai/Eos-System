# Specification: SPEC-FINAL-READINESS-EXAM

* **Status:** IN IMPLEMENTATION
* **Author:** EOS Cloud Agent (final readiness exam)
* **Date:** 2026-08-27
* **Target Project:** PRJ-EOS-MISSION-OS (Control Plane)

## 1. Executive Summary

Director dictamen: stop architectural expansion. Prove three remaining exams on the **canonical executable path** (CLI → MissionRuntime → AuthorityTruthSource → FSM/HITL → tools → verification → evidence):

1. Clean-clone reproducibility
2. Deliberate bypass DENY paths
3. Real CLI mission chain (not a simulation engine)

This spec authorizes **wiring of already-declared barriers** (Fundacion, durable anti-replay, close-time verification) and exam harnesses. It does **not** authorize new orchestrators, frozen-core redesign, or Fundacion mutation.

## 2. Product & Functional Requirements

- **FR-1:** `git clone` of committed HEAD + `node bin/eos.js --help` + `node bin/eos.js doctor` succeed without `npm install` for Mission OS core (L0 builtins).
- **FR-2:** Bypass attempts DENY: manual phase change, HITL skip, unauthorized tool, Fundacion touch, secret injection, nonce replay, close without valid verification.
- **FR-3:** CLI chain `create → plan → package → submit → verify → report → close` succeeds on a disposable fixture via `bin/eos.js`.

## 3. Non-Functional & Quality Requirements

- **NFR-1 (Security):** Protected-surface and anti-replay checks persist across process restarts.
- **NFR-2:** No new runtime layers; reuse MissionRuntime, ATS, HitlGatekeeper, CursorReturnIngestionEngine, McpMissionBridge.
- **NFR-3:** Epistemic honesty: report remains `NOT_PROVEN` for production; exam verdict is scoped.

## 4. Acceptance Criteria

- [ ] **AC-1:** `tests/final-readiness-bypass.test.js` PASS
- [ ] **AC-2:** `tests/final-readiness-cli-e2e.test.js` PASS
- [ ] **AC-3:** `node scripts/exam-clean-clone.js` PASS on committed HEAD
- [ ] **AC-4:** Existing E2E/ATS/negative tests still PASS
- [ ] **AC-5:** No writes under `Fundacion/`

## 5. Verification commands

```text
node --test tests/final-readiness-bypass.test.js tests/final-readiness-cli-e2e.test.js
node --test tests/eos-e2e-local-fixture.test.js tests/eos-negative-governance.test.js tests/eos-local-contracts.test.js
node scripts/exam-clean-clone.js
node bin/eos.js doctor
```
