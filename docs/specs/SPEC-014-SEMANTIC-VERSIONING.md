# SPEC-014: Semantic Versioning & Changelog Engine

* **Status:** SPECIFICATION_APPROVED
* **Author:** Lead Systems Architect & Valentin Florez
* **Version:** 1.0.0
* **Created:** 2026-10-25T17:03:30-05:00

---

## Functional Requirements (EARS Syntax)

### FR-014-01 (Ubiquitous)
THE SYSTEM SHALL represent software versions using an immutable `SemanticVersion` domain entity adhering to the SemVer 2.0.0 specification (MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]).

### FR-014-02 (Event-Driven)
WHEN a version string is parsed, THE SYSTEM SHALL validate the syntactic components and return a structured `SemanticVersion` instance.

### FR-014-03 (Error-Driven)
IF an invalid version string is provided to `SemanticVersion.parse()`, THEN THE SYSTEM SHALL throw an Error describing the syntactic violation.

### FR-014-04 (Event-Driven)
WHEN `bumpMajor()`, `bumpMinor()`, or `bumpPatch()` is invoked on a `SemanticVersion`, THE SYSTEM SHALL return a new `SemanticVersion` instance with the target component incremented and subordinate components reset to zero.

### FR-014-05 (Event-Driven)
WHEN raw git commit messages are provided to `ConventionalCommitParser.parse()`, THE SYSTEM SHALL extract type, scope, breaking flag, subject, and optional footers.

### FR-014-06 (State-Driven)
WHILE analyzing a collection of parsed conventional commits, THE SYSTEM SHALL recommend the semantic bump level: MAJOR if any commit is breaking, MINOR if any feature is present, or PATCH otherwise.

### FR-014-07 (Event-Driven)
WHEN the command `eos release` is executed, THE SYSTEM SHALL calculate the next version, format changelog entries, update `package.json`, and write or prepend to `CHANGELOG.md`.

---

## Non-Functional Requirements

| NFR | Constraint |
|:---|:---|
| NFR-014-01 | Domain models (`SemanticVersion.ts`, `ConventionalCommitParser.ts`) must have 0 external dependencies |
| NFR-014-02 | 100% line coverage in unit test suite with `vitest` |
| NFR-014-03 | Conventional Commit regex execution must process 1,000 commits in < 50ms |
| NFR-014-04 | Generated `CHANGELOG.md` must follow Keep a Changelog formatting standards |

---

## Acceptance Criteria (BDD)

### SC-014-01: SemVer Increment Invariants
```gherkin
SCENARIO: Bumping version components
  GIVEN an initial SemanticVersion of "2.0.0"
  WHEN bumpPatch is called
  THEN the new version is "2.0.1"
  WHEN bumpMinor is called on "2.0.1"
  THEN the new version is "2.1.0"
  WHEN bumpMajor is called on "2.1.0"
  THEN the new version is "3.0.0"
```

### SC-014-02: Breaking Change Increment Recommendation
```gherkin
SCENARIO: Breaking commit triggers MAJOR bump
  GIVEN a commit list containing "feat(core)!: redesign domain boundary"
  WHEN ConventionalCommitParser recommends the next release increment
  THEN the recommended increment is "MAJOR"
```

### SC-014-03: Feature Commit Increment Recommendation
```gherkin
SCENARIO: Feature commit triggers MINOR bump
  GIVEN a commit list containing "feat(mcp): add dashboard tool" and "fix: typo in readme"
  WHEN ConventionalCommitParser recommends the next release increment
  THEN the recommended increment is "MINOR"
```
