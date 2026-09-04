# Canary Execution Report Template (P2 Gate Standard)

**Integration ID:** `{{INTEGRATION_ID}}`  
**Mission ID:** `{{MISSION_ID}}`  
**Provider & Endpoint:** `{{PROVIDER_NAME}}` — `{{ENDPOINT_URL}}`  
**Execution Timestamp:** `{{TIMESTAMP}}`  
**Gatekeeper Status:** `{{GATEKEEPER_STATUS}}`  

---

## 1. Governance & Contract Verification
- **Contract Schema Validation:** `PASS` (`integration-contract.schema.json`)
- **HITL Authorization Receipt:** `{{HITL_RECEIPT_ID}}` (Signed by Human Director)
- **Environment:** `SANDBOX / TEST` (Zero production exposure)
- **Credential Scope & TTL:** `{{CREDENTIAL_SCOPE}}` (TTL: `{{TTL_SECONDS}}s`)

---

## 2. Request & Payload Inspection
- **Redacted Request Fingerprint (SHA-256):** `{{REQUEST_SHA256}}`
- **Payload Size:** `{{PAYLOAD_BYTES}}` bytes / max `{{MAX_PAYLOAD_BYTES}}` bytes
- **Forbidden Data Leakage Scan:** `PASS` (0 forbidden tokens or secrets detected)
- **Destination Allowlist Verification:** `PASS` (`{{DESTINATION_URL}}` ∈ Allowlist)

---

## 3. Execution Telemetry & Budget Consumption
- **Response Status Code:** `{{STATUS_CODE}}`
- **Observed Latency:** `{{LATENCY_MS}}ms` / max `{{MAX_LATENCY_MS}}ms`
- **Calls Consumed:** `{{CALLS_CONSUMED}}` / `{{MAX_CALLS}}`
- **Cost Consumed:** `${{COST_CONSUMED_USD}}` / max `${{MAX_COST_USD}}`

---

## 4. Fallback & FDIR State
- **Fallback Engaged:** `{{FALLBACK_ENGAGED}}` (e.g. `FALSE` / `LOCAL_MOCK`)
- **FDIR Kill Switch State:** `NORMAL / ARMED` (Safe mode tripped: `FALSE`)

---

## 5. Rollback & Post-Execution Cleanup
- **Credential Disabled / Revoked:** `VERIFIED`
- **Sandbox Ephemeral Worktree Cleaned:** `VERIFIED` ($\Delta = 0$)
- **Cryptographic Hash Chain Committed:** `{{LEDGER_EVENT_HASH}}`

---

## 6. Epistemic Verdict
**Canonical Status:** `CANARY_VERIFIED`  
*Scope Limitation: This receipt verifies solely that capability '{{CAPABILITY}}' functioned within the bounded sandbox. It does not generalize to other endpoints, models, providers, or production environments.*
