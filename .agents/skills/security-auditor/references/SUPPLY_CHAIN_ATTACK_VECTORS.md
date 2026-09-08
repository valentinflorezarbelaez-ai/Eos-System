# Supply Chain Attack Vectors — Detection & Mitigation Catalog

> **Source:** Industry research (Snyk, Veracode, OWASP, Socket.dev). Updated Sep 2026.  
> **Usage:** Reference during Dimension 2 (Dependency Audit) and Dimension 9 (AI Code Risk) audits.

---

## Attack Vector Taxonomy

```text
SUPPLY CHAIN ATTACKS
├── 1. PACKAGE ECOSYSTEM ATTACKS
│   ├── 1.1 Typosquatting
│   ├── 1.2 Dependency Confusion
│   ├── 1.3 Starjacking
│   └── 1.4 Package Hijacking
├── 2. MAINTAINER ATTACKS
│   ├── 2.1 Account Takeover
│   ├── 2.2 Social Engineering
│   └── 2.3 Insider Threat
├── 3. BUILD & CI/CD ATTACKS
│   ├── 3.1 CI Pipeline Poisoning
│   ├── 3.2 Build Artifact Tampering
│   └── 3.3 Registry Compromise
└── 4. AI-SPECIFIC VECTORS (2025+)
    ├── 4.1 Hallucinated Package Injection
    ├── 4.2 Training Data Poisoning
    └── 4.3 Prompt Injection via Dependencies
```

---

## 1. Package Ecosystem Attacks

### 1.1 Typosquatting

**Description:** Publishing malicious packages with names similar to popular ones (e.g., `lodahs` instead of `lodash`, `expres` instead of `express`).

**Detection:**
```bash
# Check for common typosquat patterns in package.json
# Look for packages with very low download counts
npm view <suspicious-package> --json 2>&1 | grep -E "(name|downloads|created)"

# Verify package publisher matches expected maintainer
npm view <package> maintainers --json 2>&1

# Check package age — less than 30 days is suspicious
npm view <package> time.created 2>&1
```

**Mitigation:**
- Use `npm install --ignore-scripts` for initial install, then review scripts
- Pin exact versions in lockfile
- Use `socket.dev` or `npm` provenance checks

---

### 1.2 Dependency Confusion

**Description:** Exploiting internal package name resolution by publishing a public package with the same name as a private/internal one but with a higher version number.

**Detection:**
```bash
# List all packages and check for unexpected sources
npm ls --json 2>&1 | head -100

# Check if any packages resolve to unexpected registries
grep -n "resolved" package-lock.json | grep -v "registry.npmjs.org" | head -20

# Check for scoped vs unscoped naming conflicts
grep -n '"name"' package.json | head -5
```

**Mitigation:**
- Always use scoped packages for internal libraries (`@org/package-name`)
- Configure `.npmrc` to map scopes to private registries
- Use `registry` field in `.npmrc` per scope

---

### 1.3 Starjacking

**Description:** Cloning a popular repo, publishing the clone as a new package, and inheriting the star count/reputation to appear legitimate.

**Detection:**
- Verify `repository` field in `package.json` matches the actual GitHub repo
- Check if the npm package author matches the GitHub repo owner
- Compare publish dates between npm package and GitHub repo

---

### 1.4 Package Hijacking

**Description:** Taking over a package name after the original maintainer abandons it or their account is compromised.

**Detection:**
- Monitor for ownership changes on critical dependencies
- Use `npm audit signatures` to verify package provenance
- Check for sudden version jumps or unexpected publish patterns

---

## 2. Maintainer Attacks

### 2.1 Account Takeover

**Description:** Compromising a maintainer's npm/PyPI account through credential stuffing, phishing, or leaked credentials.

**Real-world examples:**
- `ua-parser-js` (2021): Maintainer account compromised, cryptominer injected
- `event-stream` (2018): Social engineering to gain maintainer access

**Detection:**
```bash
# Check for sudden maintainer changes
npm view <package> maintainers --json

# Verify latest publish matches expected release cadence
npm view <package> time --json 2>&1 | tail -5
```

**Mitigation:**
- Enable 2FA on all package registry accounts
- Use `npm publish --provenance` for supply chain attestation
- Monitor critical dependencies with `npm audit signatures`

---

### 2.2 Social Engineering

**Description:** Gaining trust of a maintainer over months/years, then being granted publish access and injecting malicious code.

**Mitigation:**
- Require multiple maintainer approval for publishes
- Use automated publishing via CI/CD (not individual accounts)
- Review all new contributor access requests

---

## 3. Build & CI/CD Attacks

### 3.1 CI Pipeline Poisoning

**Description:** Injecting malicious code through CI/CD pipelines (GitHub Actions, GitLab CI).

**Detection:**
```bash
# Check GitHub Actions for untrusted inputs
grep -rn "github.event" .github/workflows/*.yml 2>/dev/null | head -20

# Check for `pull_request_target` trigger (dangerous)
grep -rn "pull_request_target" .github/workflows/*.yml 2>/dev/null

# Check for `actions/checkout` with unsafe ref
grep -A3 "actions/checkout" .github/workflows/*.yml 2>/dev/null | head -20

# Check for script injection via expressions
grep -rn '\$\{\{' .github/workflows/*.yml 2>/dev/null | grep -v "secrets\." | head -20
```

**Mitigation:**
- Pin all GitHub Actions to commit SHAs, not tags
- Never use `pull_request_target` with `actions/checkout` of PR code
- Use OIDC for cloud authentication instead of long-lived secrets
- Restrict `GITHUB_TOKEN` permissions with `permissions:` key

---

### 3.2 Build Artifact Tampering

**Description:** Modifying build outputs between compilation and distribution.

**Mitigation:**
- Use reproducible builds
- Sign build artifacts
- Verify checksums in deployment pipelines

---

## 4. AI-Specific Vectors (2025+)

### 4.1 Hallucinated Package Injection

**Description:** AI coding assistants suggest importing packages that don't exist. Attackers register those names and publish malicious packages.

**Real-world evidence:** Research shows AI models consistently hallucinate the same package names, making them predictable targets for attackers.

**Detection:**
```bash
# For each dependency, verify it exists and has meaningful downloads
npm view <package-name> --json 2>&1 | grep -E "(name|downloads|description)"

# Check if package was created recently (potential response to AI hallucination)
npm view <package-name> time.created 2>&1
```

**Mitigation:**
- Always verify AI-suggested dependencies exist before `npm install`
- Check download counts — legitimate packages have >1000 weekly downloads
- Review package source code before adding to project
- Use `socket.dev` for automated AI dependency risk scoring

---

### 4.2 Training Data Poisoning

**Description:** Injecting malicious code patterns into public repos that AI models are trained on, so the model learns to reproduce the vulnerable pattern.

**Mitigation:**
- Always review AI-generated code for security patterns (eval, exec, innerHTML)
- Apply the same security audit dimensions to AI-generated code as human-written code
- Cross-reference AI suggestions against known-good patterns

---

## SBOM Generation

Generate a Software Bill of Materials for your project to maintain a complete dependency inventory:

```bash
# CycloneDX format (industry standard)
npx @cyclonedx/cyclonedx-npm --output-file sbom.cdx.json

# SPDX format (alternative standard)
npx @spdx/sbom-generator --output sbom.spdx.json

# Verify SBOM contents
cat sbom.cdx.json | python -m json.tool | head -50
```

---

## Quick Detection Checklist

| # | Check | Command | Risk Level |
|---|---|---|---|
| 1 | Lockfile has integrity hashes | `grep -c "integrity" package-lock.json` | If 0: HIGH |
| 2 | No install scripts in dependencies | `grep -r "preinstall\|postinstall" node_modules/*/package.json \| wc -l` | Review any |
| 3 | All packages have provenance | `npm audit signatures 2>&1` | If failures: MEDIUM |
| 4 | No private scope confusion | Check `.npmrc` for scope registry mapping | If missing: HIGH |
| 5 | CI Actions pinned to SHAs | `grep -c "@v" .github/workflows/*.yml` | If found: MEDIUM |
| 6 | SBOM exists and is current | Check `sbom.cdx.json` timestamp | If missing: LOW |
