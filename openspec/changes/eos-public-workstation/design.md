# Design — EOS public workstation

## Placement

| Concern | Path | Why |
| --- | --- | --- |
| Public page | `site/` | No existing public site. Static files stay out of `src/core/`. |
| Local preview | `scripts/serve-public-site.js` | `node:http` only. Not a dependency. |
| Atomic state | `src/shield/atomic-state.js` | Non-kernel. Callers opt in. |
| Payload gate | `src/shield/payload-gate.js` | Non-kernel boundary. Does not replace `SchemaValidator` or `EOSMCPSchemaValidator`. |
| Promotion story | `docs/releases/VERIFY_FAILS_BLOCK_PROMOTION.md` | Documents jobs that already exist. Does not edit `.github/workflows/`. |
| Kernel adoption | Spec plus scaffold test only | EosMemory and the MCP schema catalog stay frozen. |

## Atomic state

`readJsonState(filePath)`:

1. `readFileSync` inside try/catch.
2. `ENOENT` returns `{ ok: true, state: null, reason: 'ENOENT' }`.
3. Other errors return `{ ok: false }` and do not invent a document.
4. Empty or invalid JSON is not a successful contract state.

`writeJsonState(filePath, value)`:

1. Serialize JSON.
2. Write a sibling temp file in the same directory.
3. `renameSync` onto the destination.
4. On rename failure, attempt to remove the temp file and surface the error.
5. No existence probe before the read or the write. No `fileHandle.lock`.

Directory creation, when needed, uses `mkdirSync` with `{ recursive: true }` on the parent directory. That is not a check-then-act on the state file.

## Payload gate

`acceptContractPayload(payload, schema)` accepts only a plain object that matches a caller-supplied object schema:

- `type: "object"`
- `properties` with primitive `type` of `string`, `number`, `boolean`, or `array` of primitives
- `required`
- `additionalProperties: false` is the default when the field is omitted (fail closed)

Rejection code: `SCHEMA_VIOLATION`. The returned value includes `contract` only when `ok` is true. A rejected payload is not a contract.

`acceptMcpToolPayload(message, schema)` requires a non-empty string `method` and validates `params` (default `{}`) with the same gate. It does not dispatch a tool and does not consult the kernel catalog.

## Site

Mobile-first. One `h1`. Skip link. Visible focus. `prefers-reduced-motion`. Spanish UI. English identifiers stay English (EOS, IDE names, `verify:strict`, `LEVEL_2`).

Sections: what EOS is, who it is for, works-with, gates (spec, tests, human approval), how a failing verify blocks promotion. Footer trademark notice. Letter marks are original SVG tiles, not vendor logos.

Honesty line on the page: `PRODUCTION_READY` is not declared. Autonomy is supervised. No invented metrics.

## Promotion

Existing workflows already fail the check when their steps fail:

- `.github/workflows/ci.yml` jobs `verify` (`node scripts/verify-eos.js --strict`), `test` (`npm test`), `syntax`, `governance-gates`, `seam-pack`. No `continue-on-error` on those steps.
- `.github/workflows/cd-release-gate.yml` runs strict verify and tests, sets `production_deploy: false`, and does not deploy.

A red job is not a license for an agent to merge or to rewrite `main`. Merge stays human. This design does not add branch protection in GitHub; that control is outside the repo and is named as `NOT VERIFIED` here.

## Tests

`tests/eos-public-workstation-shield.test.js` covers the shield, the site contract strings, the promotion note, and the kernel non-adoption scaffold. Node built-in test runner.
