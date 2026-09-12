# Proposal — Mission AU: Law VI Secret Runtime Broker / Env Gate (SPEC-0052)

## Why

Ladder 17 audit ranks **Law VI Secret Runtime Broker / Env Gate** after
AT (MEASURED). Law VI today is env-only with zero provider-secret prefix
literals in repo; there is no typed **runtime broker / env gate** that
injects secrets only at call time into allowlisted adapters and DENYs
persist into EVD / federation / repo — without claiming vault / KMS /
secret-manager SaaS / cloud IAM.

## What

1. `src/core/secrets/secret-runtime-broker.js` —
   `createSecretRuntimeBroker`; kind
   `eos-law-vi-secret-runtime-broker`;
   `resolveSecret` / `injectToAdapter` / `attemptPersist` /
   `writeFundacion` / `getState` / `sealReceipt`; injectable
   `{ env, envGate, hash, now }`; fail-closed `OK` / `DENY` /
   `MISSING_ENV` / `ADAPTER_NOT_ALLOWLISTED` /
   `ENV_KEY_NOT_ALLOWLISTED` / `SECRET_LEAK_FORBIDDEN` /
   `INVALID_REQUEST` / `MISSING_DEP` / `FUNDACION_DENIED`;
   `AU_PRODUCTION_READY='NO'`.
2. Thin `env-gate.js` + `secret-leak-guard.js` + `broker-receipt.js` —
   allowlist gate, leak DENY, sealed receipts (hashes/presence only).
3. Suite `tests/eos-au-law-vi-secret-runtime-broker.test.js`
   (AU1–AU20) hermetic; **no static vendor-key prefix substring**
   (fake tokens / runtime synth); slim-exclude;
   `npm run test:law-vi-broker` / `test:secret-runtime-broker` /
   `test:mission-au`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## NON-CLAIM

- runtime broker ≠ vault / KMS / secret-manager SaaS / cloud IAM
- not AV/AW
- Fundacion Δ=0; AU_PRODUCTION_READY=NO; Antigravity-first
