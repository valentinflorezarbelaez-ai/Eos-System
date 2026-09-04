# EOS DO-NOT-BUILD REGISTER (MANDATORY LEAN CONSTRAINTS)
**Document ID:** `REG-EOS-DO-NOT-BUILD-2026`  
**Standard:** Minimalist Systems Architecture & Anti-Bloat Governance  

---

## 1. Permanent Rejections & Prohibitions

| Rejected Architectural Feature | Why NOT Needed | What Would it Cost? | What Problem Does it NOT Solve? |
|---|---|---|---|
| **External Database Engine (SQLite, Postgres, Redis)** | Local JSONL + Sefirotic DAG (`node:fs`) provides instant inspection, zero runtime daemon overhead, and native versionability. | Adds binary dependencies, C++ build toolchains, migration scripts, and operational fragility. | Does not improve local single-operator mission tracking. |
| **Distributed Consensus in Production (Raft / Paxos)** | EOS is a local control plane executing inside Cursor/Electron/IDE. There is no cluster of nodes requiring distributed leader election. | Inflates runtime heap by 15-20MB, creates false network partitions, and complicates simple local transitions. | Does not solve single-machine local mission governance. |
| **External NPM Frameworks / Libraries** | The L0 Node.js native contract (`dependencies: {}`) guarantees zero supply-chain vulnerability and 100-year bit-rot immunity. | Reintroduces `node_modules` bloat, lockfile conflicts, and dependency CVE vulnerabilities. | Does not add capability that native Node `crypto`, `fs`, and `readline` cannot deliver. |
| **Separate Microservice Daemons for Simple Rules** | In-process synchronous AST / regex validation (`EOSTescohanAuditor`) executes in <10ms. Running detached daemons wastes OS sockets. | IPC latency, port collision risks, orphan background process leaks. | Does not improve code quality beyond what in-process validation provides. |
| **Over-Engineered Multi-Agent Voting Councils for Deterministic Tasks** | Deterministic linters, test runners, and schema validators give exact binary answers (0 or 1). Voting councils introduce non-deterministic hallucinations. | Burns thousands of LLM tokens per step and slows execution by orders of magnitude. | Does not eliminate bugs that formal unit tests catch deterministically. |
