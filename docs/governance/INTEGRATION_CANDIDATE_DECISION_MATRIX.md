# P2 Integration Candidate Decision Matrix

**Document ID:** GOV-MAT-P2-001  
**Status:** DRAFT_GOVERNANCE_MODEL  
**Date:** 2026-08-20  
**Authority:** Human Director Approval Required for Selection  

---

## 1. Candidate Evaluation Criteria

When selecting the **single candidate** for a future minimal real integration, EOS evaluates options against seven strict risk and governance criteria:

1. **Risk of Data Leakage (Weight: 25%):** Is the payload purely synthetic or does it risk exposing internal EOS code/tokens?
2. **Reversibility & Rollback (Weight: 20%):** Can the operation be 100% reverted without leaving persistent residual state on the external provider?
3. **Credential Scoping & Expiry (Weight: 15%):** Does the provider support short-lived (TTL $\le 1$ hour) and granularly scoped API tokens?
4. **Cost & Financial Predictability (Weight: 15%):** Are costs bounded and capped ($< \$0.10$ per canary run)?
5. **Deterministic Latency & SLA (Weight: 10%):** Is the endpoint reliable with low latency variance?
6. **Ecosystem & Community Standard (Weight: 10%):** Is the integration standard and well-documented?
7. **Local Fallback Feasibility (Weight: 5%):** Can a local offline mock fully emulate the endpoint behavior during degradation?

---

## 2. Comparative Matrix for Prospective Integration Types

| Candidate Archetype | Description | Data Risk | Reversibility | Credential TTL | Cost Predictability | Overall Fit for P2 | Recommendation |
|---|---|---|---|---|---|---|---|
| **Archetype A: Local Test Sandbox / Mock Server** | Fully local HTTP mock server (e.g. WireMock / Fastify local instance) | **LOWEST** (Zero external network) | **100%** ($\Delta = 0$) | Ephemeral / Mock tokens | Zero cost | **IDEAL BASELINE** | **Recommended for Initial P2 Validation** |
| **Archetype B: Public Stateless Echo / Verification Endpoint** | Single stateless public API endpoint (e.g., HTTPBin echo / Time check) | **LOW** (Synthetic ping payloads only) | **HIGH** (Stateless, no storage) | Short-lived test token | Free / Micro-cents | **VIABLE FOR REAL TEST** | **Secondary Candidate for Single Sandbox Run** |
| **Archetype C: External AI Model API (Provider Sandbox Tier)** | Single structured JSON completion call on test account | **MEDIUM** (Payload prompt egress) | **MEDIUM** (Provider logging policy) | API Key with budget cap | $<\$0.05$ | **RESTRICTED** | **Requires Explicit Human Gate & ZDR Contract** |
| **Archetype D: Cloud Infrastructure / Deploy Hook** | Mutation of cloud resources / webhooks | **HIGH** | **LOW** | Long-lived credentials | Variable | **STRICTLY BLOCKED** | **Prohibited in P2** |

---

## 3. Governance Invariant

> **EOS will not select or execute any live external provider until the Human Director approves the candidate selection and issues a signed `HITL-EXECUTION-APPROVED` receipt.**
