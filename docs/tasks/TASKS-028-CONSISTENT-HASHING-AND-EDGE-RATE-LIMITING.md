# TASKS-028: ATOMIC TASK DECOMPOSITION (SPEC-036)

## 1. Atomic Tasks DAG

- [x] **TASK-028-1**: Formal SDD Specification Package (INTAKE-029, SPEC-036, CHANGE-029, PLAN-029, TASKS-028).
- [ ] **TASK-028-2**: Implement `src/core/eosConsistentHashRing.ts` with 64 vnodes and $O(\log(N \times V))$ bisect.
- [ ] **TASK-028-3**: Implement `src/core/eosAntiEntropyMerkleSync.ts` with hierarchical Merkle tree delta identification.
- [ ] **TASK-028-4**: Implement `src/core/eosTokenBucketRateLimiter.ts` with nanosecond monotonic token refill.
- [ ] **TASK-028-5**: Create comprehensive unit test suite `test/eosConsistentHashingRateLimiter.test.mjs` (BDD-094..097).
- [ ] **TASK-028-6**: Register CLI commands in `bin/eos.mjs` (`hashring`, `antientropy`, `ratelimit`).
- [ ] **TASK-028-7**: Register MCP tools in `src/mcp/eosMcpServer.ts` (`eos_hash_ring_lookup`, `eos_merkle_sync_diff`, `eos_token_bucket_check`).
- [ ] **TASK-028-8**: Update CI/CD pipelines (`scripts/verify-cicd-pipeline.mjs`, `scripts/verify-landing.mjs`), bump version to `v43.0.0`, update `AGENTS.md` (38 specs), and verify exit code 0.
