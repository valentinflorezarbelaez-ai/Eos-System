# Tasks — EOS public workstation

## 1. Spec this change

- [x] `proposal.md`, `design.md`, this file, and delta specs exist before product code.
- Done when the four OpenSpec names are on the branch.

## 2. Atomic state (TDD)

- [x] Failing test: missing file returns empty state on `ENOENT`; write round-trips; module source has no `existsSync` and no `fileHandle.lock`.
- [x] Minimal `src/shield/atomic-state.js`.
- Evidence command: `node --test tests/eos-public-workstation-shield.test.js`

## 3. Payload gate (TDD)

- [x] Failing test: malformed payloads return `SCHEMA_VIOLATION` and no `contract`; a matching payload returns `contract`.
- [x] Minimal `src/shield/payload-gate.js`.
- Evidence command: same test file.

## 4. Kernel scaffold only

- [x] Test asserts `src/core/memory.js` and `src/core/runtime/mcp-schema-validator.js` do not import `src/shield`.
- [x] Do not edit those files.

## 5. Promotion note

- [x] `docs/releases/VERIFY_FAILS_BLOCK_PROMOTION.md` states that a failing verify blocks promotion, cites the workflow files, and forbids auto-merge and unsupervised repair.
- [x] Do not edit `.github/workflows/`.

## 6. Public site

- [x] `site/index.html`, `site/styles.css`, `site/main.js`.
- [x] `scripts/serve-public-site.js` for local preview (Node built-ins).
- [x] Test asserts required copy and the absence of PTG, fake superiority claims, and `PRODUCTION_READY` as an affirmative claim.

## 7. Verify

- [x] `node --test tests/eos-public-workstation-shield.test.js` — 12 pass, 0 fail, exit 0. The same command before `src/shield/` existed exited 1 (`ERR_MODULE_NOT_FOUND`).
- [x] `node --check` on `src/shield/atomic-state.js`, `src/shield/payload-gate.js`, `scripts/serve-public-site.js`, `site/main.js` — exit 0.
- [x] `node scripts/verify-eos.js --strict` — 913 checks, 0 failures, exit 0.
