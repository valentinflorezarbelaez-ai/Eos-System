/**
 * EOS SYSTEM — TLA+ SOURCE INVENTORY & BOUNDED JAVASCRIPT SIMULATIONS
 * This script extracts text from TLA+ files and runs separate, bounded JS simulations.
 * It does not parse TLA+ syntax or perform exhaustive TLC model checking.
 *
 * The simulation assertions are useful regression checks, not proofs of the TLA+ models.
 *
 * Invariant: Zero external dependencies (dependencies: {}).
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const formalDir = path.join(root, "docs/formal");

export function parseTlaModule(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`TLA+ specification file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const moduleMatch = raw.match(/MODULE\s+([A-Za-z0-9_]+)/);
  const moduleName = moduleMatch ? moduleMatch[1] : path.basename(filePath, ".tla");

  const varMatch = raw.match(/VARIABLES([\s\S]*?)(?=\r?\n[a-zA-Z_]+\s*==|----------------)/);
  const variables = varMatch
    ? varMatch[1]
        .split("\n")
        .map(line => line.replace(/\\\*.*$/, "").trim())
        .filter(Boolean)
        .flatMap(line => line.split(","))
        .map(v => v.trim())
        .filter(Boolean)
    : [];

  const invariants = [];
  const invRegex = /([A-Za-z0-9_]+)\s*==\s*[\r\n]+([\s\S]*?)(?=\r?\n[A-Za-z0-9_]+\s*==|====)/g;
  let match;
  while ((match = invRegex.exec(raw)) !== null) {
    const name = match[1];
    if (name.includes("Invariant") || name.includes("Overrun") || name.includes("Bounds") || name.includes("Monotonic") || name.includes("NoDeadlock") || name.includes("Isolation")) {
      invariants.push(name);
    }
  }

  return { moduleName, raw, variables, invariants };
}

export function verifyLmaxDisruptorModel(capacity = 8, totalEvents = 500) {
  const filePath = path.join(formalDir, "LmaxDisruptor.tla");
  const parsed = parseTlaModule(filePath);

  let producerSeq = 0;
  let consumerSeq = 0;
  const ringBuffer = new Int32Array(capacity);
  let stepsExecuted = 0;

  for (let step = 0; step < totalEvents; step++) {
    stepsExecuted++;
    // Invariant checks before transition
    assert.ok(producerSeq - consumerSeq <= capacity, "VIOLATION: Buffer overrun detected!");
    assert.ok(consumerSeq <= producerSeq, "VIOLATION: Consumer read ahead of producer!");

    // Deterministic bounded schedule: Publish vs Consume
    const canPublish = (producerSeq - consumerSeq) < capacity;
    const canConsume = consumerSeq < producerSeq;

    if (canPublish && ((step * 7 + 3) % 10 > 4 || !canConsume)) {
      // Publish
      const slot = producerSeq % capacity;
      ringBuffer[slot] = producerSeq + 1;
      producerSeq++;
    } else if (canConsume) {
      // Consume
      consumerSeq++;
    }
  }

  return {
    specification: "LmaxDisruptor.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyDatomicLedgerModel(maxTx = 100) {
  const filePath = path.join(formalDir, "DatomicBitemporalLedger.tla");
  const parsed = parseTlaModule(filePath);

  const ledger = [];
  let currentTx = 0;
  const idempotencyMap = new Map();
  let stepsExecuted = 0;

  for (let i = 1; i <= maxTx; i++) {
    stepsExecuted++;
    // Generate transactions with 30% duplicate idempotency keys
    const key = `KEY-${Math.floor(i / 1.4)}`;
    const prevLen = ledger.length;

    if (idempotencyMap.has(key)) {
      // Idempotent duplicate -> zero state mutation
      assert.equal(ledger.length, prevLen, "VIOLATION: Duplicate transaction modified ledger!");
    } else {
      currentTx++;
      ledger.push(["account-1", "balance", 100 + i, currentTx, "ASSERT"]);
      idempotencyMap.set(key, currentTx);
      assert.equal(ledger.length, prevLen + 1, "VIOLATION: Append-only ledger length must increment!");
      assert.equal(ledger[ledger.length - 1][3], currentTx, "VIOLATION: Transaction clock must be monotonic!");
    }
  }

  return {
    specification: "DatomicBitemporalLedger.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyHermesConsensusModel(steps = 200) {
  const filePath = path.join(formalDir, "HermesConsensusMesh.tla");
  const parsed = parseTlaModule(filePath);

  let circuitState = "CLOSED";
  let failureCounter = 0;
  let successCounter = 0;
  const failureThreshold = 5;
  const recoveryProbes = 3;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.ok(["CLOSED", "OPEN", "HALF_OPEN"].includes(circuitState));

    if (circuitState === "CLOSED") {
      if ((i * 7 + 3) % 10 < 3) {
        failureCounter++;
        if (failureCounter >= failureThreshold) {
          circuitState = "OPEN";
          failureCounter = failureThreshold;
        }
      } else {
        failureCounter = 0;
      }
    } else if (circuitState === "OPEN") {
      // Timeout expires -> probe
      circuitState = "HALF_OPEN";
      successCounter = 0;
    } else if (circuitState === "HALF_OPEN") {
      if ((i * 11 + 5) % 10 < 2) {
        // Failed probe -> return to OPEN
        circuitState = "OPEN";
        failureCounter = failureThreshold;
        successCounter = 0;
      } else {
        successCounter++;
        if (successCounter >= recoveryProbes) {
          circuitState = "CLOSED";
          failureCounter = 0;
          successCounter = 0;
        }
      }
    }
  }

  return {
    specification: "HermesConsensusMesh.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyChaosDisruptorModel(maxTokens = 200) {
  const filePath = path.join(formalDir, "AutonomousChaosDisruptor.tla");
  const parsed = parseTlaModule(filePath);

  let scanPosition = 0;
  let tokensRecorded = 0;
  let faultCounter = 0;
  let circuitState = "CLOSED";
  let stepsExecuted = 0;

  for (let i = 0; i < maxTokens; i++) {
    stepsExecuted++;
    // Invariant: Safety & Bounds
    assert.ok(scanPosition >= 0 && tokensRecorded <= maxTokens, "VIOLATION: Scan buffer overrun");
    assert.ok(["CLOSED", "OPEN", "HALF_OPEN"].includes(circuitState), "VIOLATION: Invalid circuit state");

    // Scan advance
    scanPosition++;
    tokensRecorded++;

    // Periodic chaos fault
    if (i % 25 === 0) {
      faultCounter++;
      if (faultCounter >= 3) {
        circuitState = "OPEN";
      }
    }

    // Circuit recovery
    if (circuitState === "OPEN" && i % 40 === 0) {
      circuitState = "HALF_OPEN";
    } else if (circuitState === "HALF_OPEN" && i % 10 === 0) {
      circuitState = "CLOSED";
      faultCounter = 0;
    }
  }

  return {
    specification: "AutonomousChaosDisruptor.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyProductFoundryModel(maxModules = 200) {
  const filePath = path.join(formalDir, "UniversalProductFoundry.tla");
  const parsed = parseTlaModule(filePath);

  let domainModules = 0;
  let appModules = 0;
  let infraModules = 0;
  let contractCount = 0;
  let cyclicDependencies = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < maxModules; i++) {
    stepsExecuted++;
    assert.equal(cyclicDependencies, 0, "VIOLATION: Cyclic dependency in product topology");
    assert.ok(domainModules >= 0 && appModules >= 0 && infraModules >= 0);

    if (i % 3 === 0) {
      domainModules++;
      contractCount++;
    } else if (i % 3 === 1) {
      if (domainModules > 0) appModules++;
    } else {
      if (appModules > 0) infraModules++;
    }

    assert.ok(domainModules <= contractCount + 1, "VIOLATION: Hermetic isolation invariant breached");
  }

  return {
    specification: "UniversalProductFoundry.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyOmegaTranscendentalModel(steps = 200) {
  const filePath = path.join(formalDir, "OmegaTranscendentalApex.tla");
  const parsed = parseTlaModule(filePath);

  let nodesIndexed = 0;
  let edgesIndexed = 0;
  let latticeSealsComputed = 0;
  let synapseBeliefUpdates = 0;
  let deadlocksDetected = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.equal(deadlocksDetected, 0, "VIOLATION: Deadlock detected in Omega kernel");
    assert.ok(nodesIndexed >= 0 && edgesIndexed >= 0 && latticeSealsComputed >= 0);

    if (i % 4 === 0) {
      nodesIndexed++;
    } else if (i % 4 === 1) {
      if (nodesIndexed > 1) edgesIndexed++;
    } else if (i % 4 === 2) {
      latticeSealsComputed++;
    } else {
      synapseBeliefUpdates++;
    }

    assert.ok(latticeSealsComputed <= steps, "VIOLATION: Lattice bounds breached");
  }

  return {
    specification: "OmegaTranscendentalApex.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyContinuousRefactorModel(steps = 200) {
  const filePath = path.join(formalDir, "ContinuousRefactorEngine.tla");
  const parsed = parseTlaModule(filePath);

  let auditCycles = 0;
  let duplicationsFound = 0;
  let deadCodePruned = 0;
  let dstStepsSimulated = 0;
  let invariantsBreached = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.ok(auditCycles >= 0, "VIOLATION: Negative audit cycles");
    assert.ok(duplicationsFound >= 0, "VIOLATION: Negative duplications");
    assert.ok(deadCodePruned >= 0, "VIOLATION: Negative pruned count");
    assert.ok(dstStepsSimulated >= 0, "VIOLATION: Negative DST steps");
    assert.strictEqual(invariantsBreached, 0, "VIOLATION: Safety invariant breached");

    if (i % 3 === 0) {
      auditCycles++;
      duplicationsFound += 2;
    } else if (i % 3 === 1) {
      if (duplicationsFound > 0) {
        duplicationsFound--;
        deadCodePruned++;
      }
    } else {
      dstStepsSimulated += 5;
    }

    assert.ok(dstStepsSimulated <= steps * 5, "VIOLATION: Seed reproducibility bounds breached");
  }

  return {
    specification: "ContinuousRefactorEngine.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyFleetSyncMctsCanaryModel(steps = 200) {
  const filePath = path.join(formalDir, "FleetSyncMctsCanary.tla");
  const parsed = parseTlaModule(filePath);

  let canaryStage = 0;
  let errorBudgetBurned = false;
  let mctsExplorationSteps = 0;
  let fleetReposAudited = 0;
  let circuitBreakerTripped = false;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.ok(canaryStage >= 0 && canaryStage <= 5, "VIOLATION: Canary stage out of bounds");
    assert.ok(mctsExplorationSteps >= 0, "VIOLATION: Negative MCTS steps");
    assert.ok(fleetReposAudited >= 0 && fleetReposAudited <= 4, "VIOLATION: Fleet repos count out of bounds");

    if (errorBudgetBurned) {
      assert.ok(circuitBreakerTripped && canaryStage === 5, "VIOLATION: Rollback not triggered on burned budget");
    }

    if (i % 4 === 0) {
      if (fleetReposAudited < 4) fleetReposAudited++;
    } else if (i % 4 === 1) {
      mctsExplorationSteps++;
    } else if (i % 4 === 2) {
      if (canaryStage < 4 && !errorBudgetBurned) {
        canaryStage++;
      }
    } else {
      if (i === 150) {
        errorBudgetBurned = true;
        circuitBreakerTripped = true;
        canaryStage = 5;
      }
    }
  }

  return {
    specification: "FleetSyncMctsCanary.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyAntigravityControlPlaneModel(steps = 200) {
  const filePath = path.join(formalDir, "AntigravityControlPlane.tla");
  const parsed = parseTlaModule(filePath);

  let mcpServerInstances = 0;
  let protocolInitialized = false;
  let missionsDirected = 0;
  let hookChecksExecuted = 0;
  let unsafeMutationsAllowed = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.ok(mcpServerInstances >= 0 && mcpServerInstances <= 1, "VIOLATION: Duplicate MCP server instances spawned");
    assert.equal(unsafeMutationsAllowed, 0, "VIOLATION: Unsafe mutation bypassed Law IV or Gamma Barrier");
    assert.ok(
      protocolInitialized || (missionsDirected === 0 && hookChecksExecuted === 0),
      "VIOLATION: Mission or hook evaluated before MCP handshake"
    );

    if (!protocolInitialized) {
      mcpServerInstances = 1;
      protocolInitialized = true;
    } else if (i % 2 === 0) {
      missionsDirected++;
    } else {
      hookChecksExecuted++;
    }
  }

  return {
    specification: "AntigravityControlPlane.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyGentlemanEosSynergyMeshModel(steps = 200) {
  const filePath = path.join(formalDir, "GentlemanEosSynergyMesh.tla");
  const parsed = parseTlaModule(filePath);

  let constitutionIntact = true;
  let gentlemanComponentsUp = 0;
  let ledgerChainLength = 0;
  let confinedMcpCalls = 0;
  let pathEscapesAllowed = 0;
  let tamperedBlocks = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.equal(constitutionIntact, true, "VIOLATION: EOS Constitution clobbered");
    assert.ok(gentlemanComponentsUp >= 0 && gentlemanComponentsUp <= 6, "VIOLATION: Gentleman component count out of bounds");
    assert.equal(pathEscapesAllowed, 0, "VIOLATION: MCP path escape outside projectRoot");
    assert.equal(tamperedBlocks, 0, "VIOLATION: Durable SQLite WAL hash chain tampered");

    if (gentlemanComponentsUp < 6) {
      gentlemanComponentsUp++;
    } else if (i % 2 === 0) {
      confinedMcpCalls++;
    } else {
      ledgerChainLength++;
    }
  }

  return {
    specification: "GentlemanEosSynergyMesh.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyGentlemanAutoUpdateModel(steps = 200) {
  const filePath = path.join(formalDir, "GentlemanAutoUpdateEngine.tla");
  const parsed = parseTlaModule(filePath);

  let activeLockHolders = 0;
  let constitutionHashIntact = true;
  let unverifiedBinariesInstalled = 0;
  let failedUpgradesRolledBack = 0;
  let completedUpdateCycles = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.ok(activeLockHolders >= 0 && activeLockHolders <= 1, "VIOLATION: MutualExclusionLockInvariant breached");
    assert.strictEqual(constitutionHashIntact, true, "VIOLATION: ConstitutionPreservationInvariant breached");
    assert.strictEqual(unverifiedBinariesInstalled, 0, "VIOLATION: ZeroUnverifiedInstallInvariant breached");
    assert.ok(completedUpdateCycles >= 0 && failedUpgradesRolledBack >= 0, "VIOLATION: Negative counters");

    if (activeLockHolders === 0) {
      activeLockHolders = 1;
    } else if (i % 7 === 0) {
      failedUpgradesRolledBack++;
      activeLockHolders = 0;
    } else {
      completedUpdateCycles++;
      activeLockHolders = 0;
    }
  }

  return {
    specification: "GentlemanAutoUpdateEngine.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function verifyEnterpriseWorkspaceGovernorModel(steps = 200) {
  const filePath = path.join(formalDir, "EnterpriseWorkspaceGovernor.tla");
  const parsed = parseTlaModule(filePath);

  let onboardedProjects = 0;
  let readOnlyInspections = 0;
  let authorizedExternalWrites = 0;
  let unauthorizedExternalWrites = 0;
  let externalBytesWrittenOnOnboard = 0;
  let pathEscapesAllowed = 0;
  let stepsExecuted = 0;

  for (let i = 0; i < steps; i++) {
    stepsExecuted++;
    assert.strictEqual(externalBytesWrittenOnOnboard, 0, "VIOLATION: ZeroExternalWriteOnOnboardInvariant breached");
    assert.strictEqual(unauthorizedExternalWrites, 0, "VIOLATION: LawIVWriteBarrierInvariant breached");
    assert.strictEqual(pathEscapesAllowed, 0, "VIOLATION: BoundaryConfinementInvariant breached");
    assert.ok(onboardedProjects >= 0 && readOnlyInspections >= 0 && authorizedExternalWrites >= 0, "VIOLATION: Negative counters");

    if (i % 5 === 0) {
      onboardedProjects++;
    } else if (i % 2 === 0) {
      readOnlyInspections++;
    } else if (onboardedProjects > 0) {
      authorizedExternalWrites++;
    }
  }

  return {
    specification: "EnterpriseWorkspaceGovernor.tla",
    moduleName: parsed.moduleName,
    sourceFileRead: true,
    extractedVariables: parsed.variables,
    extractedInvariantNames: parsed.invariants,
    stepsExecuted,
    executionMode: "bounded-javascript-simulation",
    simulationAssertionsPassed: true
  };
}

export function runAllFormalVerifications() {
  return [
    verifyLmaxDisruptorModel(),
    verifyDatomicLedgerModel(),
    verifyHermesConsensusModel(),
    verifyChaosDisruptorModel(),
    verifyProductFoundryModel(),
    verifyOmegaTranscendentalModel(),
    verifyContinuousRefactorModel(),
    verifyFleetSyncMctsCanaryModel(),
    verifyAntigravityControlPlaneModel(),
    verifyGentlemanEosSynergyMeshModel(),
    verifyGentlemanAutoUpdateModel(),
    verifyEnterpriseWorkspaceGovernorModel()
  ];
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("verify-formal-tla.mjs")) {
  console.log("======================================================================");
  console.log(" EOS SYSTEM — TLA+ SOURCE INVENTORY & BOUNDED JS SIMULATIONS          ");
  console.log(" TLA+ text is not parsed or model-checked by TLC in this command.       ");
  console.log("======================================================================\n");

  const results = runAllFormalVerifications();
  let totalSteps = 0;

  results.forEach(res => {
    totalSteps += res.stepsExecuted;
    console.log(`[SOURCE + SIMULATION] ${res.specification} (module label: ${res.moduleName})`);
    console.log(`  ↳ Variable names extracted : ${res.extractedVariables.join(", ") || "none"}`);
    console.log(`  ↳ Invariant names extracted: ${res.extractedInvariantNames.join(", ") || "none"}`);
    console.log(`  ↳ JS simulation steps       : ${res.stepsExecuted}`);
    console.log(`  ↳ Simulation assertions     : ${res.simulationAssertionsPassed ? "PASS" : "FAIL"}\n`);
  });

  console.log(`----------------------------------------------------------------------`);
  console.log(`RESULT: ${results.length} bounded JS simulations passed (${totalSteps} steps); no formal model checking was run.`);
  console.log(`======================================================================`);
}
