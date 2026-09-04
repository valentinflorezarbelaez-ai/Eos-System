# EOS MISSION RUNTIME PRUNING & LEAN REFACTORING PLAN
**Document ID:** `PLAN-EOS-RUNTIME-PRUNING-2026`  
**Classification:** `ARCHITECTURE_PRUNING_PLAN`  

---

## 1. Context and Objective

`src/core/runtime/mission-runtime.js` currently instantiates 40+ specialized engines in its constructor, consuming unnecessary memory and adding massive cognitive noise.

### The Problem:
```javascript
// BEFORE (Bloated Constructor in mission-runtime.js):
constructor(options = {}) {
  this.raftEngine = new RaftDistributedConsensusEngine(...);
  this.bytecodeVm = new MiniBytecodeVmEngine(...);
  this.lsmTree = new LsmTreeStorageEngine(...);
  this.sreChaos = new SreChaosSloEngine(...);
  this.virtualKernel = new VirtualKernelJournalingFs(...);
  // ... 35+ more instances!
}
```

---

## 2. Target Clean Lean Architecture

### A. The Core 8 Engines (Active Critical Path Only):
1. `AuthorityTruthSource` (FSM State & Snapshot Owner)
2. `HitlGatekeeper` (Approval Receipt Validator)
3. `SchemaValidator` (JSON Contract Validator)
4. `CanonicalRulesIndex` (Constitution & Rules Resolver)
5. `EOSContextCompiler` (Token & Secrets Guard)
6. `EOSKabbalahLedger` (DAG Ledger Storage)
7. `UniversalTechnicalDiscoveryEngine` (Project Stack Scanner)
8. `FdirSelfHealingEngine` (Baseline Restorer)

### B. Lazy-Loading Strategy for Secondary Tools:
All other supporting tools (e.g. Scaffolder, TDD Executor, Scraper, Blueprint Engine) are instantiated on-demand via getters or separate factory methods only when their corresponding CLI command or MCP tool is invoked:

```javascript
// AFTER (Lean Core Constructor):
constructor(options = {}) {
  this.baseDir = options.baseDir || process.cwd();
  this.missionsRoot = path.join(this.baseDir, '.missions');
  this.ats = options.ats || new AuthorityTruthSource({ missionsRoot: this.missionsRoot });
  this.hitl = options.hitl || new HitlGatekeeper();
  this.schemas = options.schemas || new SchemaValidator();
  this.rules = options.rules || new CanonicalRulesIndex();
  this.compiler = new EOSContextCompiler(options.compilerConfig);
  this.ledger = new EOSKabbalahLedger(path.join(this.missionsRoot, 'events.jsonl'));
}

// Lazy accessor for secondary engines:
get tdd() {
  if (!this._tdd) this._tdd = new EOSTDDExecutor();
  return this._tdd;
}
```

---

## 3. Quarantining Non-Operational Simulation Engines
The following academic modules are moved from `src/core/pilot/one_percent/` to `EOS-Lab/simulations/` and excluded from production runtime packaging:
- `raft-distributed-consensus-engine.js`
- `mini-bytecode-vm-engine.js`
- `lsm-tree-storage-engine.js`
- `sre-chaos-slo-engine.js`
- `virtual-kernel-journaling-fs.js`
- `staff-strategic-rfc-engine.js`
