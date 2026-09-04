# [DELTA-SPEC-XXXX]: Change Proposal — [Change Name]

* **Target Domain / Living Spec**: `specs/[domain]/spec.md`
* **Change ID**: `[change-slug]`
* **Status**: `[PROPOSED | APPROVED | APPLIED | ARCHIVED]`

---

## 1. Intent & Motivation
[Describe why this change is needed and what problem it solves in 1-2 paragraphs.]

---

## 2. Delta Requirements (Diff View)

```diff
  ### Requirement: [Requirement Name]
- The system SHALL [old behavior to be removed or replaced].
+ The system SHALL [new updated behavior].

  #### Scenario: [Scenario Name]
  - GIVEN [precondition]
- - WHEN [old trigger]
+ - WHEN [new trigger]
  - THEN [expected outcome]

+ #### Scenario: [New Added Scenario]
+ - GIVEN [new condition]
+ - WHEN [action occurs]
+ - THEN [system responds safely]
```

---

## 3. Impact Assessment
* **Affected Modules**: `[List of files and layers affected]`
* **Breaking Changes**: `[YES / NO - details if YES]`
* **Database / Schema Migrations**: `[None / Required migrations]`
* **Traceability Update**: `[Updated tests to be created or modified]`
