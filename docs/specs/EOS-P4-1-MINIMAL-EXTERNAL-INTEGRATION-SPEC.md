# EOS P4.1 Technical Specification: Minimal Real External Integration Canary Contract

**Document ID:** SPEC-P4-1-002  
**Status:** CANONICAL_DESIGN_SPEC (NOT_YET_EXECUTED)  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Canonical Canary Contract Object

```json
{
  "schema_version": "1.0.0",
  "canary_id": "CANARY-GEMINI-MODELS-001",
  "provider": "GOOGLE_GEMINI",
  "operation": "models.list",
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/models",
  "http_method": "GET",
  "max_requests": 1,
  "page_size": 10,
  "follow_next_page_token": false,
  "data_classification": "PUBLIC_METADATA",
  "synthetic_payload": {},
  "budget_limit_usd": 0.005,
  "cost_basis_notes": "Internal estimated cost ceiling; actual billing depends on Google Gemini project tier and pricing snapshot.",
  "timeout_ms": 3000,
  "credential_env_var": "EOS_CANARY_API_KEY",
  "key_restriction_type": "API_RESTRICTED_KEY",
  "hitl_approval_required": true,
  "fallback_strategy": "OFFLINE_MOCK_FALLBACK",
  "epistemic_status_initial": "DESIGNED_NOT_RUN"
}
```

---

## 2. Mandatory Pre-Flight Offline Gate & Kill Switch

Prior to injecting `process.env.EOS_CANARY_API_KEY`, EOS must execute the following offline pre-flight checks:
1. **Endpoint Whitelist Check**: Verify that `https://generativelanguage.googleapis.com/v1beta/models` is the only permitted destination URL.
2. **Path Traversal & Query Validation**: Ensure no external parameters or unauthorized query fields are appended.
3. **FDIR Kill Switch Test**: Prove that modifying the destination URL or injecting unapproved headers immediately trips the kill switch (`CALL_BLOCKED [DESTINATION_DISALLOWED]`).
4. **Credential Sanitizer Verification**: Prove that passing mock tokens in `EOS_CANARY_API_KEY` results in zero occurrences of the plaintext token in stdout, stderr, reports, or ledger entries.

---

## 3. Concrete HITL Level 3 Receipt Template

Before executing this canary, the Human Director must review and sign the following explicit receipt:

```json
{
  "schema_version": "1.0.0",
  "receipt_id": "HITL-P4-CANARY-GEMINI-001",
  "mission_id": "MIS-P4-CANARY-01",
  "gate_type": "HITL_LEVEL_3_CANARY_APPROVAL",
  "provider": "GOOGLE_GEMINI",
  "operation": "models.list",
  "endpoint": "https://generativelanguage.googleapis.com/v1beta/models",
  "http_method": "GET",
  "max_requests": 1,
  "page_size": 10,
  "follow_next_page_token": false,
  "data_classification": "PUBLIC_METADATA",
  "google_project_id": "[TO_BE_SPECIFIED_BY_DIRECTOR]",
  "key_owner": "Human Director",
  "key_restriction_type": "API_RESTRICTED_KEY",
  "key_revocation_method": "Google Cloud Console API Key Deactivation",
  "pricing_terms_snapshot_date": "2026-08-20",
  "budget_hard_cap_usd": 0.005,
  "valid_until": "2026-08-21T23:59:59Z",
  "verdict": "PENDING_DIRECTOR_SIGNATURE",
  "signed_by": null,
  "signature_date": null
}
```
