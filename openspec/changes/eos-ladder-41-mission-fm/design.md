# Design — Mission FM Ladder 41 Seam-Pack Consolidation & Closeout

**Status:** READY · authorized post-#581 merge (`f5948926`). FI/FJ/FK/FL are MEASURED; FM is the last L41 satellite.

## Pattern

Mirror Mission FH (L40 seam-pack / SPEC-0170 / ADR-0153) and Mission FC (L39 seam-pack / SPEC-0165 / ADR-0147) → a `ladder41-seam-*` triad + a hermetic FM1–FM17 suite. Same shape, same fail-closed posture, same slim-exclude discipline.

## Architecture

Pure Layer-0 triad under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`FM-RCPT-*`) with opaque `seamDigest`; freeze soft-observe `f5948926` (`tipRewriteRefused`, `tipSealInProductRefused`, `l41AutoCloseRefused`, `l40ReopenRefused`…`l30ReopenRefused`, `liveHttpEgressRefused`, `wallClockAuthorityRefused`, `schemaJsonAddRefused`); `seamHold` marks hermetic in-memory / fail-closed / read-only / observed-chain flags.
2. **Policy gate** — fail-closed preconditions for the seam ritual. DENY on Fundacion target, secret-looking fields, plain secret tokens, hard delete, mass prune, PRODUCTION_READY flip, L30–L40 reopen, **L41 auto-close without `humanGateHeld`**, **tip-seal-in-product**, tip rewrite, schema-json add, network write, GHE claim, live HTTP egress, wall-clock authority, satellite-as-seam elevation, auto-seal without human gate.
3. **Port** — `Ladder41SeamPort` with `seam({observed})` + `verifyTrail()`; chains `FM-RCPT-*` with `seamDigest` + `prevReceiptHash`; PASS seals a consolidation decision over the four observed satellite flags only.

## Soft-observe contract

```js
softObserveFi()  → { present: boolean, module?, kind?, productionReady: 'NO' }
softObserveFj()  → …
softObserveFk()  → …
softObserveFl()  → …
```

Each helper attempts a dynamic soft-import; absence is `present: false` and **must not** throw. The seam decision records `chain: { fi, fj, fk, fl }` as booleans plus the ordered chain labels — never module internals, never payloads.

## Decision table

| Condition | Decision |
| --- | --- |
| all four satellites observed AND `humanGateHeld` on a closeout claim | PASS (`FM-RCPT-*`) |
| closeout claimed WITHOUT `humanGateHeld` | DENY `L41_AUTO_CLOSE_FORBIDDEN` |
| tip-seal claimed inside the product package | DENY `TIP_SEAL_IN_PRODUCT_FORBIDDEN` |
| any partial chain, seam requested in HOLD mode | HOLD (no-op, zero mutation) |
| any governance violation (secret, Fundacion, PR flip, reopen, schema add…) | DENY |

## Seam digest

`seamDigest = sha256(canonical JSON of {
  chain: { fi, fj, fk, fl }, chainOrder: ['FI','FJ','FK','FL'],
  seamClass, satelliteSpecs: ['SPEC-0171','SPEC-0172','SPEC-0173','SPEC-0174'],
  desiredSeal: 'SEAM_PACK'|'HOLD', observedChainComplete: boolean
})`

Opaque booleans, labels and spec ordinals only — no ids, no digests of payloads, no secrets.

## Non-goals

Tip-refresh / tip-seal / Formal L41 CLOSED / PRODUCTION_READY flip / schema-json add / FI–FL overwrite / GHE / CloudAgent.
