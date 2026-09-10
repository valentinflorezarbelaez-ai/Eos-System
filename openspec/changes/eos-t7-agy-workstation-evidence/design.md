# Design — T7 Antigravity eos-workstation evidence

## Decision

Deliver **docs + smoke lock** that are green when the daemon is **ABSENT**, without Admin elevation, and **fail-closed** if evidence pretends the daemon is installed. Live Admin install remains HITL operator (out of this change set).

## Approach

1. Checklist documents operator steps: confirm local `agy`, optional OpenSpec CLI, optional Admin `agy-daemon.cmd install --name eos-workstation`, `status` honesty, CloudAgent out of SpecBoot default path.
2. Evidence note records an honest snapshot (PRESENT/ABSENT) for local agy + daemon + OpenSpec CLI; never claims INSTALLED without status proof.
3. Lock fail-closed on: missing checklist/evidence, missing required needles, PRODUCTION_READY≠NO, missing CloudAgent-out-of-path language, or **dishonest INSTALLED claim** when probe/status text says Not installed / ABSENT.
4. Smoke gate is observational: may run `agy-daemon.cmd status` / probe `agy` on Windows without elevation; **never** runs install/uninstall/restart that needs Admin.
5. verify:strict uses doc-honesty path (CI-safe; `skipLiveProbe` default) so Linux CI does not require Windows daemon tooling.

## Modes

| Mode | Meaning | Lock PASS when |
| --- | --- | --- |
| `DAEMON_ABSENT` | Honest: Not installed / Admin HITL pending | Evidence declares ABSENT/Not installed; no pretend INSTALLED |
| `DAEMON_PRESENT` | Honest: status shows installed instance | Evidence declares PRESENT/INSTALLED **and** probe/status corroborates (when probed) |

## Risks

Low — docs + lock + smoke only. Accidental Admin install prevented by smoke NON-MUTATING + checklist FORBIDDEN pretend.

## AT_CEILING

No new `docs/schemas/**/*.json`.
