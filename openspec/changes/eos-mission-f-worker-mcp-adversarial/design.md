# Design — Mission F (SPEC-0010-ADV)

## Threat model (worker boundary)

| ID | Threat | Control |
|----|--------|---------|
| F1 | Malformed / numeric `@needs` | `sanitizeMcpTaskText` → `MCP_CAPABILITY_REJECTED` |
| F2 | Prototype pollution tokens | Forbidden token set |
| F3 | Path traversal in task text | `assertNoPathTraversal` + percent-decode checks |
| F4 | Multi-`@needs` ambiguity | Document router first-match; union via comma list |
| F5–F6 | DEFICIENT + enforceMcp | Abort before `applyDiff` |
| F7 | Profile spoof L0+write | Reject at plan build + seal |
| F8 | Tampered `mcp_envelope` | Seal re-resolve / structural checks |
| F9 | CLI exit contract | exit 4 DEFICIENT; exit 2 validation/traversal |
| F10 | Apply failure | Existing rollback path unchanged |

## Non-goals

No `src/core` mutation. Router first-match `@needs` behavior stays documented, not rewritten (scope = worker fortify).
