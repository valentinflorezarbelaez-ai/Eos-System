# Design — Mission AY AST & Semantic Graph Reasoning Port (SPEC-0056)

## Architecture

```
reason({ sourceText, artifactPath, allowlist, query })
  ├─ policy gate (path allowlist, query safety, Fundacion ALWAYS_DENY)
  ├─ PARSE      — hermetic regex/tokenizer extract facts
  ├─ BUILD_GRAPH — nodes (symbol/module/import/export/call) + edges
  └─ QUERY      — symbols | imports | exports | deps | calls | resolve | summary
       └─ sealed reasoning receipt (sha256, NON-CLAIM flags)
```

## Hermetic parser

Minimal JS-oriented extractor (node builtins only):

- `import` / `require` → IMPORT nodes + DEPENDENCY edges
- `export function|class|const` / `export default` / `export { }` → EXPORT
- `function` / `class` / arrow → SYMBOL
- call sites `ident(` → CALL + CALLS edges

No acorn, babel, typescript, or network. Soft syntax check: balanced
braces/parens/strings; fail → `SYNTAX_ERROR`.

## Injectable hooks (optional)

- `ports.axEngine` — AX inject surface (metadata only; do not rewrite AX)
- `ports.agTools` — AG compose annotate (non-blocking; do not rewrite AG)

## Fail-closed DENY

`PATH_NOT_ALLOWLISTED`, `SYNTAX_ERROR`, `MALFORMED_GRAPH`, `UNSAFE_QUERY`,
`INVALID_REQUEST`, `QUERY_EMPTY`, `FUNDACION_DENY` — each emits sealed receipt.

## Law VI

Never embed forbidden provider secret prefix contiguous literals; sanitize
dumps; vendor-style prefixes synthesized via `['s','k','-'].join('')` only.
