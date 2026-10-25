# CLAUDE.md — SPOTIFY HONK AGENT DIRECTIVES
<!-- Governed by OpenSpec SPEC-012 & Spotify Agentic SDLC -->

## Build & Test Commands
- Full Strict SecDevOps Gate: `npm run verify:strict`
- Unit & Chaos Tests: `node --test test/*.test.mjs`
- Go Accelerator Benchmark: `node bin/eos.mjs go benchmark`
- Honk Background Dispatch: `node bin/eos.mjs honk dispatch --directive "<directive>"`
- Xirp Context Sync: `node bin/eos.mjs xirp sync`

## Code & Architecture Standards
- Domain logic must remain completely pure in `src/core/` with zero framework imports.
- Functions must be deterministically verifiable with automated tests in `test/`.
- Pull Requests authored by agents must include blameless root-cause analysis and Merkle proof seals.
