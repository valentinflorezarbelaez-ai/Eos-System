# OpenSpec runtime (Control Plane)

How to use the LIDR Specboot / OpenSpec **folder layout** in this repo without breaking L0 purity or the Mission CLI.

**Discipline:** `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`  
**SDD vs DIRECT:** `docs/manuals/EOS_OPERATOR_MANUAL_LOCAL.md`

## Layout

```text
openspec/
  config.yaml          # schema + context (points at docs/base-standards.md, docs/backend-standards.md, ai-specs/)
  specs/               # current-behavior specs (delta target)
  changes/             # one folder per change
    <change>/
      .openspec.yaml
      proposal.md
      design.md
      tasks.md
      specs/<domain>/spec.md
ai-specs/              # agent + skill pointers (not a Gentle-AI copy)
.cursor/commands/      # LIDR cycle slash-command docs
```

Historical EOS specs stay in `docs/specs/`. Do not relocate them.

## Slash commands vs Mission CLI

| Surface | What it is | What it is not |
| --- | --- | --- |
| `.cursor/commands/` (`/enrich-us`, `/propose`, `/ff`, `/apply`, `/verify`, `/adversarial-review`, `/archive`, `/commit`) | Operator vocabulary for the Specboot cycle | Not `npm run verify`, not Mission OS |
| Official OpenSpec Cursor form (if you later run `openspec init`) | `/opsx-propose`, `/opsx-apply`, … | Optional; do not require it for EOS work |
| Mission CLI | `node bin/eos.js` / `npm run eos:mission` | Unchanged. Do not wrap, replace, or import OpenSpec into it |

`/verify` in this cycle means **spec verification** (BUILDER ≠ VERIFIER). Workspace health remains `npm run verify` / `verify:strict`.

## CLI install (docs only — optional)

The Control Plane **does not** add `@fission-ai/openspec` to root `package.json`. That would violate `NODE_BUILTINS_ONLY`.

If a human wants the official CLI on **their machine** (not in `src/core/`):

```bash
# optional, host-level — not part of L0 clone reproducibility
npm install -g @fission-ai/openspec@latest
openspec --version
```

Or `npx @fission-ai/openspec@latest` on a networked machine. CI and clean-clone exams must keep working **without** that install.

Repo helper (shells out; never `npm install`s; never imports the package):

```bash
node scripts/openspec-cli.js --version
# or
npm run openspec:cli -- --version
```

If `openspec` is not on `PATH`, the helper exits `2` and points here. That is expected on L0 clones.

Do **not** run `openspec init` in CI. The committed `openspec/` tree is the project structure.

## Organic routing reminder

File/diff size alone does not force this ceremony. Use SDD when the human asks, a proposal is accepted, or the change is substantial (ADR-0010).
