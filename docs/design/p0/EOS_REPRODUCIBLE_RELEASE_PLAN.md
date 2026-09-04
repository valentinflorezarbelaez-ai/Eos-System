# EOS REPRODUCIBLE RELEASE & CLEAN-ROOM BUILD PLAN
**Document ID:** `REL-EOS-REPRODUCIBLE-BUILD-2026`  
**Classification:** `RELEASE_GOVERNANCE_PLAN`  

---

## 1. The Clean-Room Release Chain

Every release of EOS must be deterministically reproducible from a clean remote git clone:

$$\boxed{\text{git clone}} \longrightarrow \boxed{\text{node scripts/verify-eos.js}} \longrightarrow \boxed{\text{npm test:core}} \longrightarrow \boxed{\text{npm run package:runtime}} \longrightarrow \boxed{\text{EVD-VERIFIED}}$$

### Invariants:
1. **Zero External Installs:** No `npm install` required to run core tests or MCP server. `package.json` specifies `dependencies: {}`.
2. **Deterministic Provenance Receipt:** `scripts/generate-dist-receipt.js` computes the SHA-256 tree of all files under `dist/runtime-core/` and seals `docs/audits/EOS_DISTRIBUTION_CANARY_RECEIPT.json`.
3. **Automated Release Gate:** `npm run deploy:canary` executes 4 sequential gates (Static Invariants $\rightarrow$ MCP Stdio Smoke $\rightarrow$ Standalone Package $\rightarrow$ Cryptographic Receipt). If any gate fails, the release is aborted.
