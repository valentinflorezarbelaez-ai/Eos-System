# Tasks — Defensive intelligence finding

## 1. Spec this change

- [x] `proposal.md`, `design.md`, this file, and `specs/cyberintel-finding/spec.md` exist before the shield module.
- Done when those OpenSpec names are on the branch.

## 2. Failing test

- [ ] `tests/eos-cyberintel-finding.test.js` fails because `src/shield/intelligence-finding.js` is absent.
- Evidence command: `node --test tests/eos-cyberintel-finding.test.js`

## 3. Smallest check

- [ ] `recordIntelligenceFinding` and `formatDoctorBoundaryBlock` match the spec.
- [ ] `bin/eos-doctor.js` prints the boundary on `--help` and leaves `--json` as kernel JSON.
- [ ] `src/core/runtime/operator-doctor.js` is not edited.
- Evidence command: same test file, exit 0.

## 4. Verify

- [ ] `node --check` on the new module and `bin/eos-doctor.js`.
- [ ] Do not add a package dependency. Do not edit `site/`, `Fundacion/`, constitution files, `DEPENDENCY_POLICY_L0.md`, or `src/core/`.
