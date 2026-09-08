---
name: security-auditor
description: "Comprehensive security audit skill covering OWASP Top 10, supply chain, secrets, dependency vulnerabilities, API security, and AI-generated code risks."
---

# Security Auditor Skill

## Purpose

Enforces **Security by Design** across all EOS-managed codebases and control plane operations. This skill provides a systematic, 10-dimension security audit procedure with concrete commands, evidence requirements, and severity classifications.

> **Governing Principle:** No codebase may be declared `PRODUCTION_READY` without a clean security audit across all 10 dimensions. Any finding produces a `RISK` or `FINDINGS_IDENTIFIED` classification until remediated and re-verified.

---

## Inputs

- Source code files and directory structure
- `.env` files and environment configuration
- `package.json`, `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- API route handlers and middleware
- Authentication and session management code
- CI/CD pipeline configurations
- Docker / container configurations (if applicable)

---

## The 10-Dimension Security Audit

### Dimension 1: Secret Scanning

**Goal:** Zero hardcoded secrets in source code, configuration, or git history.

**Procedure:**
1. Scan source for hardcoded credentials:
   ```bash
   # API keys, tokens, passwords in source
   grep -rn --include="*.{js,ts,jsx,tsx,py,json,yaml,yml,env,md}" \
     -E "(api[_-]?key|secret|password|token|bearer|private[_-]?key|auth)" .
   
   # Base64-encoded secrets (common obfuscation)
   grep -rn -E "[A-Za-z0-9+/]{40,}={0,2}" --include="*.{js,ts,json}" .
   
   # AWS access keys pattern
   grep -rn -E "AKIA[0-9A-Z]{16}" .
   
   # Private keys
   grep -rn "BEGIN.*PRIVATE KEY" .
   ```

2. Verify `.env` files are gitignored:
   ```bash
   # Check .gitignore includes .env patterns
   grep -n "\.env" .gitignore
   
   # Verify no .env files are tracked
   git ls-files | grep -i "\.env"
   ```

3. Scan git history for leaked secrets:
   ```bash
   # Search recent commits for secret patterns
   git log -p --all -S "password" --since="6 months ago" -- "*.{js,ts,json}" | head -100
   git log -p --all -S "api_key" --since="6 months ago" -- "*.{js,ts,json}" | head -100
   ```

4. Verify environment variable usage:
   ```bash
   # Find process.env references and verify they use proper config loaders
   grep -rn "process\.env\." --include="*.{js,ts}" . | head -50
   ```

**Evidence:** Command output logs stored in `docs/evidence/SEC-SECRET-XXXX.json`.  
**Severity:** CRITICAL — any hardcoded secret is an immediate STOP condition.

---

### Dimension 2: Dependency Audit & Supply Chain

**Goal:** Zero known vulnerabilities in direct and transitive dependencies. No typosquatted or hijacked packages.

**Procedure:**
1. Run native package audit:
   ```bash
   npm audit --json 2>&1 | head -200
   # or
   yarn audit --json 2>&1 | head -200
   ```

2. Check for outdated packages with known CVEs:
   ```bash
   npm outdated --json 2>&1 | head -100
   ```

3. Verify lockfile integrity:
   ```bash
   # Ensure lockfile matches package.json
   npm ci --dry-run 2>&1 | tail -20
   
   # Check for lockfile tampering (integrity hashes present)
   grep -c "integrity" package-lock.json
   ```

4. Detect suspicious packages:
   ```bash
   # Check for recently published packages (< 30 days) — typosquatting risk
   # Check for packages with very few downloads
   # Check for packages with install/preinstall/postinstall scripts
   grep -A2 '"scripts"' node_modules/*/package.json 2>/dev/null | grep -E "(preinstall|postinstall|install)" | head -20
   ```

5. License scan (see Dimension 10).

**Evidence:** `npm audit --json` output stored in `docs/evidence/SEC-DEP-XXXX.json`.  
**Severity:** HIGH for known CVEs, CRITICAL for actively exploited vulnerabilities.

> **See also:** `references/SUPPLY_CHAIN_ATTACK_VECTORS.md` for detailed attack pattern catalog.

---

### Dimension 3: OWASP Top 10 — Injection & Input Validation

**Goal:** All user inputs validated, sanitized, and bounded. Zero injection vectors.

**Procedure:**
1. **A03:2021 Injection (SQL, NoSQL, Command, LDAP):**
   ```bash
   # Find raw SQL queries (should use parameterized queries)
   grep -rn --include="*.{js,ts}" -E "(query|exec|execute)\s*\(" . | grep -v node_modules | head -30
   
   # Find shell command execution
   grep -rn --include="*.{js,ts}" -E "(exec|execSync|spawn|execFile)\s*\(" . | grep -v node_modules | head -20
   
   # Find eval and Function constructor (code injection)
   grep -rn --include="*.{js,ts}" -E "(eval|Function)\s*\(" . | grep -v node_modules | head -20
   ```

2. **A07:2021 XSS (Cross-Site Scripting):**
   ```bash
   # Find innerHTML assignments (DOM XSS)
   grep -rn --include="*.{js,ts,jsx,tsx}" "innerHTML" . | grep -v node_modules | head -20
   
   # Find dangerouslySetInnerHTML (React)
   grep -rn --include="*.{jsx,tsx}" "dangerouslySetInnerHTML" . | grep -v node_modules | head -20
   
   # Find document.write
   grep -rn --include="*.{js,ts}" "document\.write" . | grep -v node_modules | head -10
   ```

3. **Input validation patterns:**
   ```bash
   # Find request body/query/param access without validation
   grep -rn --include="*.{js,ts}" -E "(req\.body|req\.query|req\.params)" . | grep -v node_modules | head -30
   ```

**Evidence:** Finding logs with file:line references.  
**Severity:** CRITICAL for SQL injection, HIGH for XSS, MEDIUM for unvalidated inputs.

> **See also:** `references/OWASP_TOP_10_CHECKLIST.md` for the full A01–A10 checklist.

---

### Dimension 4: Authentication & Session Management

**Goal:** Secure authentication flows, proper token management, no session fixation vulnerabilities.

**Procedure:**
1. **JWT validation:**
   ```bash
   # Find JWT usage and verify proper validation
   grep -rn --include="*.{js,ts}" -E "(jwt|jsonwebtoken|jose)" . | grep -v node_modules | head -20
   
   # Check for JWT secret in code (should be env var)
   grep -rn --include="*.{js,ts}" -E "jwt\.(sign|verify)\s*\(" . | grep -v node_modules | head -20
   ```

2. **Password handling:**
   ```bash
   # Find password comparisons (should use constant-time comparison)
   grep -rn --include="*.{js,ts}" -E "(password|passwd)" . | grep -v node_modules | head -20
   
   # Verify bcrypt/argon2/scrypt usage (not MD5/SHA for passwords)
   grep -rn --include="*.{js,ts}" -E "(bcrypt|argon2|scrypt)" . | grep -v node_modules | head -10
   grep -rn --include="*.{js,ts}" -E "(md5|sha1|sha256)\s*\(" . | grep -v node_modules | head -10
   ```

3. **Session management:**
   ```bash
   # Find session configuration
   grep -rn --include="*.{js,ts}" -E "(session|cookie)" . | grep -v node_modules | grep -i -E "(secure|httponly|samesite|maxage|expires)" | head -20
   ```

**Evidence:** Auth flow analysis with findings documented.  
**Severity:** CRITICAL for authentication bypass, HIGH for weak password hashing.

---

### Dimension 5: HTTP Security Headers & CORS

**Goal:** Proper security headers on all responses. Restrictive CORS policy.

**Procedure:**
1. **Security headers check:**
   ```bash
   # Find CORS configuration
   grep -rn --include="*.{js,ts}" -E "(cors|Access-Control)" . | grep -v node_modules | head -20
   
   # Check for wildcard CORS (dangerous)
   grep -rn --include="*.{js,ts}" -E "origin.*\*|'*'" . | grep -v node_modules | head -10
   
   # Find helmet or manual security header setup
   grep -rn --include="*.{js,ts}" -E "(helmet|X-Frame-Options|X-Content-Type|Strict-Transport|Content-Security-Policy|Referrer-Policy|Permissions-Policy)" . | grep -v node_modules | head -20
   ```

2. **Required headers checklist:**
   - `Content-Security-Policy` (CSP) — prevents XSS and data injection
   - `Strict-Transport-Security` (HSTS) — enforces HTTPS
   - `X-Frame-Options: DENY` — prevents clickjacking
   - `X-Content-Type-Options: nosniff` — prevents MIME sniffing
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` — restricts browser features

**Evidence:** Header configuration audit log.  
**Severity:** HIGH for missing CSP, MEDIUM for missing secondary headers.

---

### Dimension 6: API Security

**Goal:** APIs protected against mass assignment, BOLA/IDOR, excessive data exposure, and abuse.

**Procedure:**
1. **Mass assignment / over-posting:**
   ```bash
   # Find direct spread of request body into database operations
   grep -rn --include="*.{js,ts}" -E "\.\.\.(req\.body|body)" . | grep -v node_modules | head -20
   
   # Find create/update operations without explicit field selection
   grep -rn --include="*.{js,ts}" -E "(create|update|insert)\s*\(.*req\.body" . | grep -v node_modules | head -20
   ```

2. **BOLA/IDOR (Broken Object Level Authorization):**
   ```bash
   # Find routes with ID parameters — verify authorization checks
   grep -rn --include="*.{js,ts}" -E "(params\.id|params\.\w+Id)" . | grep -v node_modules | head -20
   ```

3. **Rate limiting:**
   ```bash
   # Check for rate limiting middleware
   grep -rn --include="*.{js,ts}" -E "(rate.*limit|throttle|express-rate-limit)" . | grep -v node_modules | head -10
   ```

4. **Response filtering:**
   ```bash
   # Check for password/secret fields in API responses
   grep -rn --include="*.{js,ts}" -E "(\.toJSON|\.toObject|select\()" . | grep -v node_modules | head -20
   ```

**Evidence:** API endpoint audit with authorization matrix.  
**Severity:** CRITICAL for BOLA, HIGH for mass assignment, MEDIUM for missing rate limiting.

---

### Dimension 7: Cryptography Audit

**Goal:** No deprecated algorithms. Proper entropy. Secure TLS configuration.

**Procedure:**
1. **Deprecated algorithms:**
   ```bash
   # Find MD5 usage (broken for security purposes)
   grep -rn --include="*.{js,ts}" -E "createHash\s*\(\s*['\"]md5['\"]" . | grep -v node_modules | head -10
   
   # Find SHA1 usage (deprecated for signatures)
   grep -rn --include="*.{js,ts}" -E "createHash\s*\(\s*['\"]sha1['\"]" . | grep -v node_modules | head -10
   
   # Find DES/3DES/RC4 usage
   grep -rn --include="*.{js,ts}" -E "(des|3des|rc4|blowfish)" . | grep -v node_modules | head -10
   ```

2. **Random number generation:**
   ```bash
   # Find Math.random() for security-sensitive operations (should use crypto)
   grep -rn --include="*.{js,ts}" "Math\.random" . | grep -v node_modules | head -20
   
   # Verify crypto.randomBytes / crypto.randomUUID usage
   grep -rn --include="*.{js,ts}" -E "(randomBytes|randomUUID|getRandomValues)" . | grep -v node_modules | head -10
   ```

**Evidence:** Cryptographic algorithm inventory.  
**Severity:** HIGH for MD5/SHA1 in security contexts, MEDIUM for Math.random in token generation.

---

### Dimension 8: Container & Infrastructure Security

**Goal:** Secure container images, no root execution, minimal attack surface.

**Procedure (when Dockerfiles exist):**
1. ```bash
   # Check for root user in Dockerfiles
   grep -rn "USER root" Dockerfile* docker-compose* 2>/dev/null
   
   # Check for latest tag (should pin versions)
   grep -rn "FROM.*:latest" Dockerfile* 2>/dev/null
   
   # Check for secrets in build args
   grep -rn "ARG.*PASSWORD\|ARG.*SECRET\|ARG.*KEY" Dockerfile* 2>/dev/null
   ```

**Evidence:** Container security checklist.  
**Severity:** HIGH for root execution, MEDIUM for unpinned base images.

---

### Dimension 9: AI-Generated Code Risk

**Goal:** AI-suggested dependencies and code patterns verified before adoption.

**Procedure:**
1. **Hallucinated package detection:**
   ```bash
   # For each dependency in package.json, verify it exists on npm
   # Check download counts — very low counts may indicate typosquatting
   npm view <package-name> --json 2>&1 | head -20
   ```

2. **AI code patterns to flag:**
   - Dependencies added without explicit human request
   - Import statements for packages not in package.json
   - Overly permissive regex patterns
   - Hard-coded URLs or endpoints
   - Disabled security features (e.g., `rejectUnauthorized: false`)

3. **Verify imports match lockfile:**
   ```bash
   # Find all import/require statements
   grep -rn --include="*.{js,ts}" -E "(require|import)\s" . | grep -v node_modules | head -50
   
   # Cross-reference against package.json dependencies
   ```

**Evidence:** AI dependency review log.  
**Severity:** HIGH for unverified packages, MEDIUM for suspicious patterns.

---

### Dimension 10: License Compliance

**Goal:** No GPL/copyleft contamination in proprietary projects. All licenses auditable.

**Procedure:**
1. ```bash
   # List all dependency licenses
   npx license-checker --json 2>&1 | head -100
   
   # Check for copyleft licenses (GPL, AGPL, LGPL, MPL)
   npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0" 2>&1 | tail -20
   ```

2. **Generate SBOM (Software Bill of Materials):**
   ```bash
   # CycloneDX format
   npx @cyclonedx/cyclonedx-npm --output-file sbom.json 2>&1 | tail -10
   ```

**Evidence:** License audit report + SBOM artifact.  
**Severity:** HIGH for GPL in proprietary projects, LOW for permissive license review.

---

## Audit Execution Protocol

### Pre-Audit Checklist
1. Identify project type (Node.js, Python, Go, etc.)
2. Identify deployment target (browser, server, edge, container)
3. Identify data sensitivity level (PII, financial, health, public)
4. Review existing security documentation or prior audits

### Audit Flow
```text
DIMENSION 1 (Secrets) → DIMENSION 2 (Dependencies) → DIMENSION 3 (OWASP/Injection)
    → DIMENSION 4 (Auth) → DIMENSION 5 (Headers) → DIMENSION 6 (API)
    → DIMENSION 7 (Crypto) → DIMENSION 8 (Container) → DIMENSION 9 (AI Risk)
    → DIMENSION 10 (Licenses) → SYNTHESIS → EVIDENCE REPORT
```

### Severity Classification

| Level | Definition | Response |
|---|---|---|
| **CRITICAL** | Active exploit path, exposed secrets, auth bypass | Immediate STOP. Fix before any other work. |
| **HIGH** | Known CVE, missing critical header, weak crypto | Block merge. Fix in current sprint. |
| **MEDIUM** | Missing best practice, potential vector | Track as RISK. Fix before production. |
| **LOW** | Informational, hardening recommendation | Document. Fix when convenient. |

### Evidence Requirements

All audit findings MUST be stored in `docs/evidence/` using this format:

```json
{
  "id": "SEC-AUDIT-XXXX",
  "timestamp": "ISO-8601",
  "project": "<project-name>",
  "dimension": "<1-10>",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "finding": "<description>",
  "file": "<path:line>",
  "evidence": "<command output or grep result>",
  "remediation": "<fix description>",
  "status": "OPEN|REMEDIATED|ACCEPTED_RISK"
}
```

### Post-Audit States

- **CLEAN**: Zero findings across all 10 dimensions → `VERIFIED`
- **FINDINGS_OPEN**: One or more findings → `FINDINGS_IDENTIFIED` → `REMEDIATION_REQUIRED`
- **ACCEPTED_RISK**: Finding acknowledged by PO with documented justification
- **BLOCKED**: Cannot complete audit (missing access, environment) → `BLOCKED`
