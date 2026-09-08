# OWASP Top 10 (2021) — EOS Security Audit Checklist

> **Source:** OWASP Foundation. Mapped to EOS Security Auditor dimensions.  
> **Usage:** Quick reference during Dimension 3 (Injection & Input Validation) audit.

---

## A01:2021 — Broken Access Control

**Risk:** Users acting outside intended permissions.

| Check | Command / Pattern | Severity |
|---|---|---|
| Missing authorization middleware on protected routes | `grep -rn "router\.\(get\|post\|put\|delete\)" --include="*.{js,ts}" . \| grep -v "auth\|middleware\|protect"` | CRITICAL |
| Direct object references without ownership verification | `grep -rn "params\.id\|params\.\w*Id" --include="*.{js,ts}" .` | CRITICAL |
| Missing function-level access control | Review role/permission checks on admin endpoints | HIGH |
| CORS misconfiguration allowing untrusted origins | `grep -rn "origin.*\*" --include="*.{js,ts}" .` | HIGH |
| Directory traversal in file operations | `grep -rn "path\.join\|readFile\|writeFile" --include="*.{js,ts}" . \| grep "req\."` | CRITICAL |

**Remediation:** Deny by default. Implement RBAC. Validate object ownership on every access.

---

## A02:2021 — Cryptographic Failures

**Risk:** Exposure of sensitive data due to weak or missing encryption.

| Check | Command / Pattern | Severity |
|---|---|---|
| Sensitive data transmitted without TLS | Check for `http://` URLs in API calls | HIGH |
| Deprecated hash algorithms (MD5, SHA1) for security | `grep -rn "createHash.*md5\|createHash.*sha1" --include="*.{js,ts}" .` | HIGH |
| Hardcoded encryption keys | `grep -rn "encrypt\|cipher\|aes" --include="*.{js,ts}" . \| grep -v node_modules` | CRITICAL |
| Passwords stored without proper hashing | Check for bcrypt/argon2 usage in user models | CRITICAL |

**Remediation:** Use TLS everywhere. Hash passwords with bcrypt/argon2. Use AES-256-GCM for encryption at rest.

---

## A03:2021 — Injection

**Risk:** Untrusted data sent to an interpreter as part of a command or query.

| Check | Command / Pattern | Severity |
|---|---|---|
| SQL injection (raw queries) | `grep -rn "query\|execute" --include="*.{js,ts}" . \| grep -v "parameterized\|prepared"` | CRITICAL |
| Command injection (shell exec) | `grep -rn "exec\|execSync\|spawn" --include="*.{js,ts}" . \| grep -v node_modules` | CRITICAL |
| NoSQL injection (MongoDB) | `grep -rn "\$where\|\$regex" --include="*.{js,ts}" . \| grep -v node_modules` | HIGH |
| Template injection (SSTI) | `grep -rn "template\|render\|ejs\|pug\|handlebars" --include="*.{js,ts}" .` | HIGH |
| Code injection (eval) | `grep -rn "eval\|Function(" --include="*.{js,ts}" . \| grep -v node_modules` | CRITICAL |

**Remediation:** Use parameterized queries. Never pass user input to exec/eval. Use allowlists for input validation.

---

## A04:2021 — Insecure Design

**Risk:** Missing or ineffective security controls at the design level.

| Check | Description | Severity |
|---|---|---|
| Missing threat model | No documented threat model for the application | MEDIUM |
| No rate limiting on sensitive endpoints | Login, registration, password reset without throttling | HIGH |
| Missing business logic validation | E.g., negative quantities, price manipulation | HIGH |

**Remediation:** Establish threat modeling practice. Implement rate limiting. Add business rule validation in domain layer.

---

## A05:2021 — Security Misconfiguration

**Risk:** Missing hardening, default credentials, unnecessary features enabled.

| Check | Command / Pattern | Severity |
|---|---|---|
| Debug mode in production | `grep -rn "DEBUG\|debug.*true\|NODE_ENV.*development" --include="*.{js,ts,json}" .` | HIGH |
| Default credentials | `grep -rn "admin.*admin\|password.*password\|test.*test" --include="*.{js,ts,json}" .` | CRITICAL |
| Stack traces exposed to users | `grep -rn "stack\|stackTrace\|err\.message" --include="*.{js,ts}" .` | MEDIUM |
| Unnecessary HTTP methods enabled | Check for PUT/DELETE/TRACE on public endpoints | LOW |

**Remediation:** Automated hardening checklist. Remove defaults. Use environment-specific configuration.

---

## A06:2021 — Vulnerable and Outdated Components

**Risk:** Using components with known vulnerabilities.

| Check | Command | Severity |
|---|---|---|
| Known CVEs in dependencies | `npm audit --json` | Varies (check CVSS) |
| Outdated packages | `npm outdated --json` | MEDIUM |
| Lockfile integrity | `npm ci --dry-run` | HIGH |
| Deprecated packages | Check npm deprecation warnings | LOW |

**Remediation:** Regular dependency updates. Automated audit in CI/CD. Pin versions in lockfile.

---

## A07:2021 — Identification and Authentication Failures

**Risk:** Confirmation of user identity, authentication, and session management weaknesses.

| Check | Command / Pattern | Severity |
|---|---|---|
| Weak password policy | Check password validation regex/rules | MEDIUM |
| Missing brute-force protection | Check for login rate limiting | HIGH |
| Session fixation | Check session regeneration after login | HIGH |
| Insecure "remember me" | Check token storage and expiration | MEDIUM |

**Remediation:** Implement MFA. Use proven auth libraries. Regenerate session IDs after authentication.

---

## A08:2021 — Software and Data Integrity Failures

**Risk:** Code and infrastructure without integrity verification.

| Check | Description | Severity |
|---|---|---|
| CI/CD pipeline injection | Review GitHub Actions / CI configs for untrusted inputs | HIGH |
| Missing Subresource Integrity (SRI) | Check CDN script tags for `integrity` attribute | MEDIUM |
| Unsigned updates/packages | Verify package signatures | MEDIUM |
| Deserialization attacks | `grep -rn "JSON\.parse\|deserialize\|unserialize" --include="*.{js,ts}" .` | HIGH |

**Remediation:** Use SRI for CDN resources. Verify CI/CD pipeline integrity. Validate all deserialized data.

---

## A09:2021 — Security Logging and Monitoring Failures

**Risk:** Insufficient logging to detect, escalate, or respond to active breaches.

| Check | Description | Severity |
|---|---|---|
| No logging on authentication events | Login success/failure not logged | MEDIUM |
| No logging on access control failures | 403 responses not captured | MEDIUM |
| Logs contain sensitive data | PII, tokens, or passwords in log output | HIGH |
| No alerting on suspicious patterns | No automated anomaly detection | LOW |

**Remediation:** Log all security-relevant events. Never log sensitive data. Implement alerting for anomalous patterns.

---

## A10:2021 — Server-Side Request Forgery (SSRF)

**Risk:** Application fetches remote resources without validating user-supplied URLs.

| Check | Command / Pattern | Severity |
|---|---|---|
| URL fetch from user input | `grep -rn "fetch\|axios\|http\.get\|request" --include="*.{js,ts}" . \| grep "req\.\|user\.\|body\."` | HIGH |
| Internal network access | Check for `localhost`, `127.0.0.1`, `169.254.` in allowed URLs | CRITICAL |
| DNS rebinding | Verify URL validation includes DNS resolution check | HIGH |

**Remediation:** Validate and sanitize all user-supplied URLs. Deny requests to internal networks. Use allowlists for permitted domains.
