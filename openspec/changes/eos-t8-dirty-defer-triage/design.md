# Design — T8 Dirty DEFER triage + L8 closeout

## Decision

**Catalog + selective IGNORE + tip pin + L8 closeout.** No mass delete. DEFER stubs (foreign agents + SpecBoot thin guides) remain on disk unstaged unless IGNORE applies. PROMOTE only triage/closeout/SSOT machinery.

## Dispositions

| Disposition | Meaning | This pass |
| --- | --- | --- |
| PROMOTE | Track intentional EOS governance docs | Triage note, closeout, ritual, lock, tests, tip pin |
| DEFER | Leave unstaged; reconfirm reason | Foreign ai-specs agents; SpecBoot thin `docs/*standards` / development_guide stubs |
| IGNORE | gitignore noise; files may remain on disk | `EOS-Lab/Transmission-Live/`; `archive/quarantine/docs/evolution/`; unreferenced `docs/audits/atp_*.png` |
| DISCARD | Delete | **None** without PO names |

## Tip pin

Live main after T7 #89 = `1b48ff5c386e83667d2caae78be29f3ad5a5efbb`. Pin freeze `main_tip` + matrix `evaluated_tip` + m4 EXPECTED_TIP. Matrix T2–T8 MEASURED; L8 CLOSED for local governed use; PRODUCTION_READY=NO.

## Fail-closed lock

Lock requires triage + ritual + closeout needles, PRODUCTION_READY=NO, explicit no-mass-delete / Fundacion Delta=0 language, and forbids claiming DISCARD executed when none named.

## AT_CEILING

No new `docs/schemas/**/*.json`.
