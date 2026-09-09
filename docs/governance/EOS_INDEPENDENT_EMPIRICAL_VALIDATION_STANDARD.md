# EOS INDEPENDENT EMPIRICAL VALIDATION STANDARD

* **Status:** APPROVED
* **Date:** 2026-08-11
* **Authority:** EOS Principal Engineer & Lead Validation Architect
* **Version:** `v0.3.0`
* **Phase:** `24`

---

## 1. Core Purpose
This standard defines the conditions under which EOS can assert that a property, decision, result, or capability has been truly validated beyond its own internal execution mechanisms.

---

## 2. Independent Truth Principle
A critical assertion by EOS must not be considered empirically validated solely because EOS can demonstrate it using its own internal mechanisms. Every critical claim must be classified by the independence level of available evidence.

---

## 3. The Three Layers of Truth
1. **INTERNAL VERIFICATION (`INTERNALLY_VERIFIED`):** Proves internal behavior matches EOS contracts, schemas, state machines, invariants, and tests.
2. **INDEPENDENT CORROBORATION (`INDEPENDENTLY_CORROBORATED`):** Confirmed by an independent local or external evaluator operating without circular dependencies.
3. **EMPIRICAL VALIDATION (`EMPIRICALLY_VALIDATED`):** Demonstrated against controlled external realities (real projects, real providers, real APIs, real telemetry).

---

## 4. Separation Principle
```text
EXECUTOR != EVIDENCE PRODUCER != VERIFIER != VALIDATOR
```
The entity executing an action cannot certify its own output without independent verification.

---

## 5. Independence Levels
- **I0 — SELF GENERATED:** Claim originates solely from the evaluated component.
- **I1 — INTERNAL CROSS-CHECK:** Second check sharing internal infrastructure.
- **I2 — INDEPENDENT LOCAL CORROBORATION:** Independent local evaluator (filesystem, Git, process, independent parser).
- **I3 — EXTERNAL SYSTEM CORROBORATION:** External evaluator (external CI, external infrastructure, external service).
- **I4 — EMPIRICAL REAL-WORLD VALIDATION:** Controlled real-world execution and observed telemetry.

---

## 6. Falsification-First Axiom
Every critical claim must define:
1. `PASS CONDITION`
2. `FAIL CONDITION`
3. `CONTRADICTION CONDITION`
4. `FALSIFICATION METHOD`

---

## 7. Metrics & Targets
- **FAR (False Acceptance Rate):** `false claims accepted / false claims presented` (Target: 0)
- **FRR (False Rejection Rate):** `valid claims rejected / valid claims presented` (Target: 0)
- **CDR (Contradiction Detection Rate):** `detected contradictions / introduced contradictions` (Target: 1.0)
- **EIR (Evidence Independence Ratio):** `independently corroborated claims / critical claims evaluated`

---

## N5 Fusion-light awareness (2026-09-08)

`verify:independent` / IndependentVerificationHarness includes a **measured fail-closed fusion-light** section (default ON; CI path uses default).

### What fusion-light DOES check

- Path existence: `evidence-custody.js`, `engram-contract.js`, `fusion-cp-lock.js`, `evd-seal-path.js` (reuses doctor POST_FUSION ids)
- Light import/API smoke for EvidenceCustody, EngramContract, fusion-cp-lock exports, sealEvd / auditCanonicalEvdWritePaths
- Flag: `--fusion-light` (default ON). Opt-out: `--no-fusion-light` (emits DISABLED NON-CLAIM; not preferred for CI)

### NON-CLAIM residual (docs must match behavior)

fusion-light / `verify:independent` does **NOT** claim:

- Full `verify:strict` REQUIRED_PATHS / governance suite
- Full fusion-cp GameDay soak or long-run adversarial campaign
- Production readiness / EXTERNAL EMPIRICALLY_VALIDATED (I4)
- App Fuerza delivery certification
- Fundacion mutation authorization (Fundacion Delta=0 retained)
- GitHub branch-protection enforcement
- Replacement of ROI4 `custody:verify` / ROI6 `engram:verify` deep suites

Implementation: `scripts/lib/independent-fusion-light.js` wired by `scripts/engine/independent-verification-harness.js`.
