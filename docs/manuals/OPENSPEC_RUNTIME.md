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
| Official OpenSpec / Adonis aliases (same ceremony) | `opsx:propose`, `opsx:apply`, `opsx:archive` (Cursor: `/opsx-propose`, …) | Optional CLI spelling; not a second pipeline |
| Planning skills (reference only) | `openspec-ff-change`, `openspec-continue-change` | Do not vendor skill bodies |
| Mission CLI | `node bin/eos.js` / `npm run eos:mission` | Unchanged. Do not wrap, replace, or import OpenSpec into it |

`/verify` in this cycle means **spec verification** (BUILDER ≠ VERIFIER). Workspace health remains `npm run verify` / `verify:strict`.

After `/apply` and **before** `/archive`, update OpenSpec artifacts first so they match the code. Do not archive a code-only tree.

Spec syntax: prefer Given/When/Then. EARS is an EOS/local IEEE-inspired convention if it appears — not a LIDR Specboot import. Gentleman Scope Rule (shared if ≥2 features) is NON-core on L0 Mission OS unless a frontend satellite is in scope.

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

U6 fail-closed HOLD (optional this quarter): see `docs/harness/OPENSPEC_CLI_HOLD_RITUAL.md` and evidence `docs/releases/EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md`. Gate: `node scripts/ci/openspec-cli-hold-gate.js`. Do **not** invent install success when ABSENT.

Do **not** run `openspec init` in CI. The committed `openspec/` tree is the project structure.

## Organic routing reminder

File/diff size alone does not force this ceremony. Use SDD when the human asks, a proposal is accepted, or the change is substantial (ADR-0010).

## Enforcement surfaces (Tranche C)

ADR-0010 is enforced in code (not only docs). Operator path:

| Decision | How to act |
| --- | --- |
| **DIRECT** | Local already-scoped fix, docs/formatting, no new contract, no external write. Do **not** spawn `/ff` / OpenSpec / mission SDD ceremony. |
| **DELEGATED_DIRECT** | Same honesty as DIRECT, executed by a delegated actor (Mission OS local plan). Size still ignored. |
| **SDD** | Human asked for OpenSpec/Specboot, proposal accepted, new feature/subsystem/contract, or external write. Then `/enrich-us` → `/ff` or `/propose` → `/apply` → `/verify`. |

**Accidental SDD spawn** (ceremony without explicit request / accepted proposal / substantial trigger) is **fail-closed**. Override only with `forceSddOverride` / `eos mission plan --spawn-sdd --sdd-override` (or `--explicit-sdd`).

### Where the gate lives

| Surface | Module |
| --- | --- |
| Classify + spawn gate | `src/core/sdd/organic-routing-gate.js` (`classifyOrganicRoute`, `assertSddCeremonyAuthorized`) |
| TDD receipts | `src/core/sdd/tdd-evidence-receipt.js` (`createTddPhaseReceipt`, `evaluateApplyClaim`, `auditTddReceipts`) |
| RDD informational | `src/core/governance/rdd-review-stance.js` |
| Mission plan / verify | `src/core/runtime/mission-runtime.js` (`planMission` spawn flag, `verifyMission` TDD audit) |
| `/apply`–`/verify`–`/adversarial-review` adapter | `scripts/engine/spec-driven-product-loop.js` |
| Workspace verifier | `scripts/verify-eos.js --strict` (organic gate, TDD claim, RDD deny, L0 purity) |
| Independent harness | `scripts/engine/independent-verification-harness.js` (`auditStrictTddReceipts`) |

### How to supply TDD evidence

For `/apply` or any apply-complete claim when tests exist or `strict_tdd` is set:

1. Record **RED** (`exit_code !== 0`) then **GREEN** (`exit_code === 0`) with the command (`node --test <file>`).
2. Record **TRIANGULATE** (second example / negative case) when Strict TDD is in scope.
3. Record **REFACTOR** only if you claim a refactor pass.
4. Put receipts on the apply call (`tddReceipts`) or under `.missions/<id>/evidence/tdd/*.json`.
5. Do **not** stamp `VERIFIED` on builder receipts. `/verify` audits receipts; missing receipts fail the verify gate.

Rules: `R-ORGANIC-01`, `R-TDD-01`, `R-RDD-01` in `docs/rules/CANONICAL_RULES_INDEX.json`.
