# Design — Defensive intelligence finding

## Placement

| Concern | Path | Why |
| --- | --- | --- |
| Finding record | `src/shield/intelligence-finding.js` | Non-kernel. Callers opt in. Node built-ins only. |
| Operator-visible boundary | `bin/eos-doctor.js` | The CLI operators already run. It may append text. It does not change the kernel formatter. |
| Kernel doctor | `src/core/runtime/operator-doctor.js` | Frozen. This change does not edit it and does not import the shield into it. |

## Finding record

`recordIntelligenceFinding(input)` accepts a plain object with only these fields:

- `source` — `https://` URL, no spaces, at most 300 characters
- `observedOn` — `YYYY-MM-DD`
- `confidence` — `LOW`, `MEDIUM`, or `HIGH`
- `humanGate` — must be the string `REQUIRED`
- `repo` — optional name, letters, digits, `.`, `_`, `-`, at most 80 characters
- `impact` — optional single-line string, at most 240 characters

Anything else is untrusted input: non-objects, arrays, and unknown fields return `{ ok: false, code: 'UNTRUSTED_INPUT' }` and no `finding`. A missing or different human gate returns `HUMAN_GATE_REQUIRED`. A string that looks like a private key or an assignment of `api_key`, `password`, `secret`, or `token` returns `SECRET_HANDLING` and the value is not copied into the result.

The module does not fetch a network, clone a repository, or store a procedure.

## Doctor CLI

`formatDoctorBoundaryBlock()` returns four lines: `SECRET_HANDLING`, `UNTRUSTED_INPUT`, `HUMAN_GATE`, and a `NON-CLAIM` that this check does not certify superiority over any lab.

`bin/eos-doctor.js` writes that block after the kernel text report. If `--json` is present, the process writes only the kernel JSON so the stream stays parseable.

## What this does not do

The kernel report object is unchanged. A green doctor run is still presence/light only. It is not `verify:strict` and it is not a statement that EOS surpassed a public research lab.
