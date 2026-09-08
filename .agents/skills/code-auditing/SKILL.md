---
name: code-auditing
description: Systematic 6-phase code quality audit covering dead code, anti-patterns, security, performance, type safety, and library best practices.
---

# Code Auditing Skill

Comprehensive methodology for systematic code quality audits and pre-release assessments.

## When to Use
- Pre-release code reviews and technical debt sweeps
- Quality and security audits before major milestone releases
- Dead code detection and dependency hygiene checks
- Performance bottleneck identification

## Audit Phases Overview

### Phase 0: Pre-Analysis Setup
1. Identify project configuration (`package.json`, `tsconfig.json`, linters).
2. Run existing linters and test suites to establish an evidence baseline.
3. Consult library documentation for current best practices.

### Phase 1: Discovery & Scope Mapping
1. Catalog all source files by module and architecture layer.
2. Prioritize domain kernel logic over outer presentation or adapter wrappers.

### Phase 2: Systematic File-by-File Analysis
For each file, inspect:
- **Dead code**: Unused exports, functions, variables, unreferenced files.
- **Code smells**: Overly complex functions, deeply nested conditionals (>3 levels).
- **Security**: Hardcoded secrets, injection vectors, unvalidated inputs.
- **Performance**: Blocking calls, memory leaks, N+1 query patterns.
- **Type Safety**: Unsafe casts, implicit `any`, loose contracts.

### Phase 3: Best Practices Verification
Compare library and framework usage against current official specifications.

### Phase 4: Architectural Pattern Detection
Identify cross-cutting duplication, anti-patterns, and layer leakage.

### Phase 5: Ecosystem & Library Recommendations
Audit external dependencies for vulnerabilities, bloat, or native alternatives (Ponytail Tier 1).

### Phase 6: Prioritized Audit Report
Generate comprehensive findings classified by severity:
- **Critical**: Vulnerabilities, security defects, broken contracts.
- **High**: Performance bottlenecks, major complexity.
- **Medium**: Code quality, architectural deviations.
- **Low / Quick Wins**: Style, minor dead code cleanup (<30 min).

## References & Methodologies
- Detailed procedure: [`references/audit-methodology.md`](references/audit-methodology.md)
- Dead code analysis: [`references/dead-code-methodology.md`](references/dead-code-methodology.md)
