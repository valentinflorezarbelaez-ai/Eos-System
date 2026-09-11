# Security Policy

## Reporting Security Vulnerabilities

**Do NOT file public issues or pull requests for security vulnerabilities.**

If you discover a security vulnerability in Eos-, please report it privately:

### Email
```
Email: security@eos-system.dev
Subject: [SECURITY] Vulnerability Report
Include: Description, proof-of-concept (if safe), impact assessment
```

### Response Timeline
- **Within 24 hours:** Acknowledge receipt
- **Within 7 days:** Security team assesses and begins remediation
- **Within 30 days:** Patch released or remediation plan provided
- **Within 90 days:** Public disclosure after patch release

## Vulnerability Disclosure

We follow [coordinated disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). After patching, we:

1. Announce the vulnerability in a security advisory
2. Credit the reporter (unless they request anonymity)
3. Update SECURITY.md and CHANGELOG.md
4. Tag a new release with the fix

## Threat Model

Eos- is designed to defend against:

### **Intentional Attacks**
- ✅ **Arbitrary file writes** via path traversal
- ✅ **State tampering** (ledger, snapshots)
- ✅ **Replay attacks** (nonce exhaustion)
- ✅ **Bypass of constitutional rules** (barrier circumvention)
- ✅ **Evidence destruction** (immutability violation)

### **Unintended Harm**
- ✅ **Portability issues** (Windows/Linux path handling)
- ✅ **Resource leaks** (file handles, memory)
- ✅ **Race conditions** (concurrent mission access)
- ✅ **Partial failures** (corrupt ledger recovery)

### **Out of Scope**
- ❌ Cryptographic weakness (we use Node.js built-ins, not custom crypto)
- ❌ Compromised MCP client (agent runtime security is client's responsibility)
- ❌ Malicious operator (on-disk state tampering detected, not prevented)
- ❌ Network eavesdropping (MCP is JSON-RPC 2.0 over transport's TLS/encryption)

## Security Baselines

### Code Quality
- ✅ Zero external dependencies in `src/` (eliminates supply chain attacks)
- ✅ No `eval()`, `require()` from user input, or other code injection vectors
- ✅ All file I/O uses path validation (`/^[A-Za-z0-9._-]+$/` for IDs)
- ✅ All ledger operations are append-only (no delete, no truncate)

### Testing
- ✅ **Bypass battery:** 25 intentional attacks, all denied, mutation-tested
- ✅ **Clean-clone reproducibility:** Fresh clone on Linux must pass 772/772 tests
- ✅ **E2E audits:** Real missions executed with reject/remediate/accept flows
- ✅ **Mutation testing:** Removing a barrier kills specific test cases

### Governance
- ✅ **Foundation layer** changes require 2 approvals + ADR
- ✅ **Cryptographic anchors** (snapshots, integrity manifest) pre-checked before every transition
- ✅ **Constitutional barriers** enforced before state transitions (not after-the-fact)
- ✅ **Immutable ledger** prevents event reordering or deletion

## Known Limitations

### Local-Only Threat Model
Eos- assumes a **trusted local operator**. We defend against:
- Bugs that create vulnerabilities
- Incorrect rule application
- Accidental state corruption

We do NOT defend against:
- Operator writing arbitrary bytes to `authority-snapshot.json` (privilege escalation)
- Operator executing ledger appends outside the runtime
- Operator modifying `src/` between test execution and deployment

This is documented in `src/authority/THREAT_MODEL.md`.

### Ledger Integrity vs. Ledger Confidentiality
The ledger is **integrity-checked** (tampering detected) but **not encrypted** (contents are readable by local users). For sensitive data:
- Store in encrypted form before recording
- Or use isolated `.missions/` directories with OS-level file permissions

## Supported Versions

| Version | Status | Security Fixes Until |
|---------|--------|---------------------|
| 0.6.x | Current | 2027-09-11 |
| 0.5.x | EOL | 2026-12-11 |
| <0.5 | EOL | No support |

## Dependencies

Eos- has **zero npm dependencies** by design (see `package.json`).

Dependencies include only:
- **Node.js built-ins** (crypto, fs, path, etc.) — covered by Node.js security patches
- **Dev dependencies** (test runners, linters) — not in production bundle

## Compliance

- **OWASP Top 10:** Address injection, broken auth, sensitive data, XML attacks, broken access control, misconfig, XSS, insecure deserial, using known vulnerable components, insufficient logging
- **CWE Coverage:** Path traversal (CWE-22), replay attacks (CWE-252), state tampering (CWE-564)
- **NIST Cybersecurity Framework:** Align with Identify, Protect, Detect, Respond, Recover

## Security Checklist for Contributors

Before opening a PR:

- [ ] No new external dependencies added
- [ ] All user inputs validated (paths, IDs, enums)
- [ ] No hardcoded credentials or secrets
- [ ] Cryptographic operations use Node.js built-ins only
- [ ] File I/O uses `.missions/` or validated paths
- [ ] Ledger operations are append-only
- [ ] Tests cover both success and attack scenarios
- [ ] Mutation tests included for critical logic
- [ ] Documentation updated (SECURITY.md, ADR, etc.)

## Resources

- **Architecture:** `docs/ARCHITECTURE.md` — System design & threat model
- **Governance:** `docs/architecture/adrs/ADR-0001-*.md` — Layers & barriers
- **Testing:** `tests/security/bypass-battery.test.js` — Attack scenarios
- **Threat Model:** `src/authority/THREAT_MODEL.md` — Detailed assumptions

---

**Thank you for helping keep Eos- secure.** 🔒
