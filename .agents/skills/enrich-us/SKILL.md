---
name: enrich-us
description: Analyze and enhance user stories with complete, implementation-ready technical detail from direct ticket input or Jira.
---

# enrich-us Skill

Use when refining raw user stories or requirements into implementation-ready specifications.

## Instructions

Analyze and enrich the target ticket or user story: `$ARGUMENTS`.

Follow these steps:

1. **Determine Input Source**:
   - **Direct input mode (default):** Use ticket content provided in prompt/chat.
   - **Jira mode (optional):** If Jira key/ID is provided, fetch via Jira MCP if available.

2. **Role & Mindset**:
   - Act as a senior product architect with deep domain and technical systems knowledge.
   - Ground all analysis in the project's architecture, data model, and API contracts.

3. **Analysis & Completeness Verification**:
   Verify that the user story includes:
   - Full functional description and user value proposition (Jobs to be Done).
   - Comprehensive list of fields, data structures, and state transitions.
   - Required API contracts, endpoints, and HTTP semantics.
   - Affected modules/layers adhering to Clean Architecture.
   - Acceptance criteria formatted in Given-When-Then (BDD) scenarios.
   - Non-functional requirements (security, auth, performance, observability).
   - Definition of Done (TDD tests, manual curl execution, docs update).

4. **Enhancement**:
   If the story lacks technical detail, produce an enhanced version in markdown.

5. **Output Format**:
   Always format output with:
   - `## Original`
   - `## Enhanced`
     - `### Value Proposition & Scope`
     - `### Acceptance Criteria (Given-When-Then)`
     - `### Technical Contracts & Data Shapes`
     - `### Impacted Components & Modules`
     - `### Verification & Testing Mandate`
