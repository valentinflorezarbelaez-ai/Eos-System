# EOS Purification — Phase B Reversible Quarantine Manifest (Hardened Proposal)

**Document ID:** PUR-EOS-PHASE-B-001-REV2  
**Status:** PROPOSAL_ONLY (EXECUTION_NOT_AUTHORIZED)  
**Baseline Git Commit:** `1b269932943c46849e463b293ace471a9745d3f1`  
**Date:** 2026-08-21  
**Lead Auditor:** EOS Senior Systems Architect & Verification Agent  

---

## 1. Governance Stance & Boundary Declarations

```text
PROPOSAL_STATUS: PROPOSAL_ONLY
QUARANTINE_EXECUTION: NOT_AUTHORIZED
DELETION: PROHIBITED
RUNTIME_MUTATION: 0
PROTECTED_PROJECT_MUTATION: 0 (PRJ-FUNDACION Δ = 0)
AUDIT_ARTIFACT_MUTATION: PRESENT / DOCUMENTED (Creación de propuesta de Fase B)
```

---

## 2. Reversible Quarantine Candidate Inventory (Full Hashes & SSOT Verification)

### Candidate QCAND-001
- **Source Path:** `.eos/temp_test/package.json`
- **Source SHA-256:** `532c2534f31c5040e0be22a0a20fcbfcfd39c054238e469591461ffeb50d18d4` (78 bytes)
- **Git Tracking Status:** `UNTRACKED_FILE`
- **Canonical Target SSOT Path:** `tests/fixtures/worktrees/canary-base-fixture/package.json`
- **Canonical Target SHA-256:** `532c2534f31c5040e0be22a0a20fcbfcfd39c054238e469591461ffeb50d18d4` (78 bytes)
- **SSOT Verified on Disk:** `YES (Exact byte-for-byte match)`
- **Live Code / Manifest References:** `0`
- **Proposed Quarantine Path:** `.quarantine/2026-08-21/eos-temp_test/package.json`
- **Safe Rollback Command:**
```powershell
node -e "const fs = require('fs'); fs.mkdirSync('.eos/temp_test', {recursive: true}); fs.copyFileSync('.quarantine/2026-08-21/eos-temp_test/package.json', '.eos/temp_test/package.json');"
```

---

### Candidate QCAND-002
- **Source Path:** `.eos/temp_test/src/calculator.js`
- **Source SHA-256:** `88c2fbcbb0b0c6f582f3ef841cf3500350486c478a87b8b2eb5963f4586fc249` (46 bytes)
- **Git Tracking Status:** `UNTRACKED_FILE`
- **Canonical Target SSOT Path:** `tests/fixtures/worktrees/canary-base-fixture/src/calculator.js`
- **Canonical Target SHA-256:** `88c2fbcbb0b0c6f582f3ef841cf3500350486c478a87b8b2eb5963f4586fc249` (46 bytes)
- **SSOT Verified on Disk:** `YES (Exact byte-for-byte match)`
- **Live Code / Manifest References:** `0`
- **Proposed Quarantine Path:** `.quarantine/2026-08-21/eos-temp_test/src/calculator.js`
- **Safe Rollback Command:**
```powershell
node -e "const fs = require('fs'); fs.mkdirSync('.eos/temp_test/src', {recursive: true}); fs.copyFileSync('.quarantine/2026-08-21/eos-temp_test/src/calculator.js', '.eos/temp_test/src/calculator.js');"
```

---

### Candidate QCAND-003
- **Source Path:** `.eos/temp_test/tests/calculator.test.js`
- **Source SHA-256:** `5c4786d1bf1e2e92c2cf888126cb9da460113c2f0f7572d4ae11e51b3fc1c841` (196 bytes)
- **Git Tracking Status:** `UNTRACKED_FILE`
- **Canonical Target SSOT Path:** `tests/fixtures/worktrees/canary-base-fixture/tests/calculator.test.js`
- **Canonical Target SHA-256:** `5c4786d1bf1e2e92c2cf888126cb9da460113c2f0f7572d4ae11e51b3fc1c841` (196 bytes)
- **SSOT Verified on Disk:** `YES (Exact byte-for-byte match)`
- **Live Code / Manifest References:** `0`
- **Proposed Quarantine Path:** `.quarantine/2026-08-21/eos-temp_test/tests/calculator.test.js`
- **Safe Rollback Command:**
```powershell
node -e "const fs = require('fs'); fs.mkdirSync('.eos/temp_test/tests', {recursive: true}); fs.copyFileSync('.quarantine/2026-08-21/eos-temp_test/tests/calculator.test.js', '.eos/temp_test/tests/calculator.test.js');"
```

---

### Candidate QCAND-004
- **Source Path:** `audit/eos_state_audit_2026/EOS_MCP_TOOL_CAPABILITY_MATRIX.md`
- **Source SHA-256:** `bfebca3629474775d713c72b2203cf31f50005a76985a19842a2656910a3013a` (7,793 bytes)
- **Git Tracking Status:** `UNTRACKED_FILE`
- **Canonical Target SSOT Path:** `docs/mcp/MCP_TOOL_CAPABILITY_MATRIX.md`
- **Canonical Target SHA-256:** `bfebca3629474775d713c72b2203cf31f50005a76985a19842a2656910a3013a` (7,793 bytes)
- **SSOT Verified on Disk:** `YES (Exact byte-for-byte match)`
- **Live Code / Manifest References:** `0`
- **Proposed Quarantine Path:** `.quarantine/2026-08-21/audit-eos_state_audit_2026/EOS_MCP_TOOL_CAPABILITY_MATRIX.md`
- **Safe Rollback Command:**
```powershell
node -e "const fs = require('fs'); fs.mkdirSync('audit/eos_state_audit_2026', {recursive: true}); fs.copyFileSync('.quarantine/2026-08-21/audit-eos_state_audit_2026/EOS_MCP_TOOL_CAPABILITY_MATRIX.md', 'audit/eos_state_audit_2026/EOS_MCP_TOOL_CAPABILITY_MATRIX.md');"
```

---

### Candidate QCAND-005
- **Source Path:** `audit/eos_state_audit_2026/EOS_P2_OFFLINE_GATE_REVIEW.md`
- **Source SHA-256:** `445a4a5bb865293bbba4d35e165b4c10c1fcefa7ca0874e449c25603c70f3f61` (2,320 bytes)
- **Git Tracking Status:** `UNTRACKED_FILE`
- **Canonical Target SSOT Path:** `docs/governance/EOS_P2_OFFLINE_GATE_REVIEW.md`
- **Canonical Target SHA-256:** `445a4a5bb865293bbba4d35e165b4c10c1fcefa7ca0874e449c25603c70f3f61` (2,320 bytes)
- **SSOT Verified on Disk:** `YES (Exact byte-for-byte match)`
- **Live Code / Manifest References:** `0`
- **Proposed Quarantine Path:** `.quarantine/2026-08-21/audit-eos_state_audit_2026/EOS_P2_OFFLINE_GATE_REVIEW.md`
- **Safe Rollback Command:**
```powershell
node -e "const fs = require('fs'); fs.mkdirSync('audit/eos_state_audit_2026', {recursive: true}); fs.copyFileSync('.quarantine/2026-08-21/audit-eos_state_audit_2026/EOS_P2_OFFLINE_GATE_REVIEW.md', 'audit/eos_state_audit_2026/EOS_P2_OFFLINE_GATE_REVIEW.md');"
```

---

## 3. Preconditions for Future Execution (Fase C — Isolated Worktree Only)

La ejecución física de este manifiesto de cuarentena está **ESTRICTAMENTE BLOQUEADA** hasta que el Director emita una autorización específica (`APPROVED_FOR_PHASE_C`) con los siguientes requisitos:
1. Creación de un worktree local efímero y aislado (prohibido ejecutar sobre `main`).
2. Movimiento atómico de los 5 archivos a `.quarantine/2026-08-21/`.
3. Verificación de no-regresión: `verify-eos.js` (277/277), `validate_schemas.js` (16/16) y suite completa (849/849).
4. Verificación de inmutabilidad de `PRJ-FUNDACION` ($\Delta = 0$).
5. Prueba y verificación del script de rollback atómico.
