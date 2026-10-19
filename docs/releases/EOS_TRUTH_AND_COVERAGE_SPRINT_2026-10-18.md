# EOS Truth & Coverage Sprint — 2026-10-18

**Status:** EXECUTED (Phase 0 slice)
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0 (untouched)

---

## 1. Truth corrections

| Surface | Before | After |
| --- | --- | --- |
| `CURRENT_MISSION.evidence.strict_verifier` | `914/914` | `913/913` |
| `CURRENT_STATE.strict_checks` | `914/914` | `913/913` |
| Active branch | `main` | `cline/vznrcqrq` |
| Default tests in state | absent | `1460/1460` |
| Coverage baseline in state | absent | lines 73.58% · branches 67.02% · functions 72.62% |

The freeze pin (`78141c3`) was **not** advanced: that requires a separate tip-refresh
mission and must not be claimed as current by this sprint.

---

## 2. New quality sensors

| Command | Purpose |
| --- | --- |
| `npm run coverage` | Runs the slim suite with Node coverage and fails below thresholds |
| `npm run bench` | Latency budgets for doctor, HUD (`--no-verify`), `verify:strict` |
| `npm run test:lab` | Cross-platform L0 discovery of remaining `EOS-Lab` tests |
| CI wiring | Prepared but **not pushed**: the GitHub App token lacks `workflows` permission. Apply the patch below with a PO token. |

CI patch to apply manually after `.github/workflows/ci.yml` `npm test` step:

```yaml
      - name: Coverage gate
        run: npm run coverage
      - name: Lab tests
        run: npm run test:lab
      - name: Performance baseline
        run: npm run bench
```

**Coverage thresholds (locked baseline):** lines ≥ 73%, branches ≥ 66%, functions ≥ 72%.
**Bench budgets:** doctor ≤ 1000 ms, HUD ≤ 1500 ms, verify ≤ 3000 ms.

---

## 3. Measured baseline

```text
Coverage:  lines 73.58% · branches 67.02% · functions 72.62%
doctor:    98 ms
HUD:       124 ms
verify:    281 ms
Lab tests: 31/31 pass
Default:   1460/1460 pass
Strict:    913/913 pass
```

---

## 4. Non-claims

- Coverage gate is a regression ratchet, not proof of correctness.
- Bench budgets are generous local/CI guards, not production SLOs.
- CI still uses Node 22; the coverage runner was validated on the workspace Node 24.
- `PRODUCTION_READY` remains NO.
