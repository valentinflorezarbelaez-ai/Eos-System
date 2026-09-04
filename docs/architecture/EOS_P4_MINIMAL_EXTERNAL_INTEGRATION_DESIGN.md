# EOS P4: Minimal Real External Integration Candidate Design & Risk Architecture

**Document ID:** ARCH-P4-CANDIDATE-002  
**Status:** DESIGNED_NOT_RUN (BLOCKED_OFFLINE_BY_DEFAULT)  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Verified Provider & Endpoint Selection

Based on the official Google Gemini API documentation ([ai.google.dev/api/models](https://ai.google.dev/api/models)), the selected candidate for the minimal external canary is **`models.list`**:

- **Target URL**: `GET https://generativelanguage.googleapis.com/v1beta/models`
- **HTTP Method**: `GET`
- **Request Body**: Empty (`{}`)
- **Data Transmitted**: Zero user code, zero prompts, zero PII (`PUBLIC_METADATA`).

```text
┌─────────────────────────────────────────────────────────────┐
│                 Candidate Architectural Contract            │
├─────────────────────────────────────────────────────────────┤
│  Provider:                GOOGLE_GEMINI                     │
│  Operation:               models.list                       │
│  HTTP Method:             GET                               │
│  Endpoint:                /v1beta/models                    │
│  Max Requests:            1 (STRICTLY HARD-CAPPED)          │
│  Page Size:               10 (Bounded query param)          │
│  Follow Next Page Token:  FALSE (PROHIBITED FROM PAGINATING)│
│  Data Classification:     PUBLIC_METADATA                   │
│  Budget Limit:            $0.005 USD (Internal Hard Ceiling)│
│  Timeout:                 3000ms                            │
│  Key Restriction Type:    API_RESTRICTED_KEY / AUTH_KEY     │
│  Credential Source:       process.env.EOS_CANARY_API_KEY    │
│  Fallback Strategy:       OFFLINE_MOCK_FALLBACK             │
│  Initial Epistemic State: DESIGNED_NOT_RUN                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants & Risk Mitigations (Addressing Official Findings)

### 1. Pagination & Runaway Request Prevention
- **Official Finding**: Gemini `models.list` returns paginated responses (default 50, up to 1,000) and provides `nextPageToken`.
- **Canary Invariant**: The contract strictly fixes `pageSize = 10`, `max_requests = 1`, and `follow_next_page_token = false`. The engine is **hard-coded to execute exactly one HTTP GET and never follow pagination tokens**.

### 2. Authentication & Credential Hygiene
- **Official Finding**: Gemini requires restricted standard keys or authorization keys; unrestricted standard keys are rejected (with full deprecation in September 2026).
- **Canary Invariant**:
  - Key is read exclusively from `process.env.EOS_CANARY_API_KEY`.
  - Zero disk storage, zero staging in git (`ZERO_STAGED`).
  - Strict masking in all ledger events, reports, and receipts (only SHA-256 hash of response payload is stored).
  - Teardown protocol requires immediate key deactivation/revocation post-test.

### 3. Pricing, Budgeting & Billing Transparency
- **Official Finding**: Paid billing depends on token operations and billing tier; metadata calls may not incur token costs, but total cost is subject to account tier terms.
- **Canary Invariant**: `$0.005 USD` is defined as a **local hard ceiling estimate**, not a guaranteed provider pricing claim. The engine halts if request overhead or telemetry predicts costs exceeding this threshold.

### 4. Rate-Limit Awareness
- **Official Finding**: Rate limits (RPM, TPM, RPD) apply per project rather than per key and vary across tiers.
- **Canary Invariant**: The canary captures and logs actual project ID, tier, and response headers (`x-ratelimit-*` if present) into non-sensitive metadata without making unverified assumptions.

### 5. Hermetic Offline Fallback & Epistemic Honesty
- **Invariant**: If network is blocked, timeout (3000ms) expires, or HTTP status $\ge 400$:
  - The system triggers `OFFLINE_MOCK_FALLBACK`.
  - Logs `FALLBACK_TRIGGERED` event.
  - Epistemic status remains `SIMULATION_ONLY / FALLBACK_ACTIVE`. **Under no circumstances is a fallback promoted to `VERIFIED` or `MEASURED_EXTERNAL`.**

### 6. Pre-Flight Kill Switch Verification
- The FDIR Kill Switch is validated offline *before* any credential or live request is initiated.

---

## 3. Epistemic Provenance Rules

```text
┌────────────────────────────┬────────────────────────────────────────────────────────┐
│ CONDICIÓN DE EJECUCIÓN     │ CLASIFICACIÓN EPISTÉMICA PERMITIDA                     │
├────────────────────────────┼────────────────────────────────────────────────────────┤
│ Diseño y Contrato          │ DESIGNED_NOT_RUN                                       │
│ Fallback Offline Disparado │ SIMULATION_ONLY (con evento FALLBACK_TRIGGERED)        │
│ Petición Real Exitosa (200)│ MEASURED_EXTERNAL_CANARY (con recibo SHA-256 auditado) │
│ Violación o Error 4xx/5xx  │ BLOCKED / FDIR_KILL_SWITCH_TRIPPED                     │
└────────────────────────────┴────────────────────────────────────────────────────────┘
```
