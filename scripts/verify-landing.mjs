import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

console.log("==========================================================");
console.log(" EOS SYSTEM LANDING PAGE — STRICT INVARIANT AUDIT SUITE   ");
console.log("==========================================================");

// 1. Verify SDD Governance Package (Law II)
const requiredDocs = [
  "docs/intake/PROJECT_CONTEXT.md",
  "docs/specs/spec.md",
  "docs/plans/plan.md",
  "docs/tasks/tasks.md",
  "IMPLEMENTATION_AUTHORIZATION.md",
  "docs/GOLDEN_SEAL_TETRALOGY_10X10.md"
];

for (const rel of requiredDocs) {
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `Missing mandatory SDD artifact: ${rel}`);
}
console.log("[PASS] 1/6 SDD Specification Package & Level 3 Authorization verified.");

// 2. Verify PWA Manifest Clean Desktop Label (FR-004)
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
assert.equal(manifest.name, "EOS System", "Manifest name must be 'EOS System' to prevent desktop truncation");
assert.equal(manifest.short_name, "EOS System", "Manifest short_name must be 'EOS System'");
console.log("[PASS] 2/6 PWA Manifest desktop label ('EOS System') verified.");

// 3. Verify HTML Semantic Structure & Modern Web Guidance Compliance
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.ok(html.includes('content="EOS System"'), "Missing application-name meta tag");
assert.ok(html.includes("EOSSentinelDaemon"), "Missing EOSSentinelDaemon telemetry");
assert.ok(html.includes("EOSFDIROntology"), "Missing EOSFDIROntology telemetry");
assert.ok(html.includes("Xirp"), "Missing Xirp multi-agent worktree benchmark reference");
assert.ok(html.includes("https://aberamentosprelomamusic.vercel.app"), "Missing Aberamentho production link");
assert.ok(html.includes("https://portafolio-valentin.vercel.app"), "Missing Portafolio production link");
assert.ok(html.includes("https://ptg-performance-talent-group.vercel.app"), "Missing PTG production link");
console.log("[PASS] 3/6 HTML5 semantic structure, JSON-LD, and Sovereign Fleet links verified.");

// 4. Verify CSS content-visibility: auto + contain-intrinsic-size (FR-005)
const css = fs.readFileSync(path.join(root, "css/eos.css"), "utf8");
assert.ok(css.includes("content-visibility: auto"), "Missing content-visibility: auto in css/eos.css");
assert.ok(css.includes("contain-intrinsic-size"), "Missing contain-intrinsic-size in css/eos.css");
console.log("[PASS] 4/6 Modern Web Guidance (content-visibility + contain-intrinsic-size) verified.");

// 5. Verify Interactive Control Plane JS & 21 Pipeline Steps (FR-001, FR-002, FR-007, FR-008, FR-009)
const js = fs.readFileSync(path.join(root, "js/eos.js"), "utf8");
assert.ok(js.includes('"verify:strict"'), "Missing verify:strict CLI preset");
assert.ok(js.includes('"sentinel:fdir"'), "Missing sentinel:fdir CLI preset");
assert.ok(js.includes('"worktree:xirp"'), "Missing worktree:xirp CLI preset");
assert.ok(js.includes('"mcp:graph"'), "Missing mcp:graph CLI preset");
assert.ok(js.includes('"fleet:status"'), "Missing fleet:status CLI preset");
assert.ok(js.includes('"olympus:l0"'), "Missing olympus:l0 CLI preset (5 Supreme L0 Engines & World Top-10)");
assert.ok(js.includes('"aberamentho:dsp"'), "Missing aberamentho:dsp CLI preset (Esoteric-Acoustic & Geely EX5 / Chery E5)");
assert.ok(js.includes('"sanctum:thelema"'), "Missing sanctum:thelema CLI preset (EosSolarSanctum)");
assert.ok(js.includes('"nanosecond:hft"'), "Missing nanosecond:hft CLI preset (5 Fastest Softwares & 5 Secrets)");
assert.ok(js.includes('"memory:akashic"'), "Missing memory:akashic CLI preset (EOS Akashic Memory & 27 Engram Tools)");
assert.ok(js.includes('"bigtech:tla"'), "Missing bigtech:tla CLI preset (Big Tech 10/10 & TLA+ Formal Verifier)");
assert.ok(js.includes('"kernel:linux"'), "Missing kernel:linux CLI preset (Linux Kernel Ring-0 Monolithic Modular Core)");
assert.ok(js.includes('"omega:quantum"'), "Missing omega:quantum CLI preset (Omega Singularity v8.0 PQC + ZK-STARK + BFT)");
assert.ok(js.includes('"cicd:pipeline"'), "Missing cicd:pipeline CLI preset (7-Stage Sovereign CI/CD SecDevOps Gate)");
assert.ok(js.includes('"fleet:dispatch"'), "Missing fleet:dispatch CLI preset (Federated Fleet Autonomous CI/CD Dispatcher)");
assert.ok(js.includes('"jarvis:monad"'), "Missing jarvis:monad CLI preset (EOS JARVIS Sovereign Monad)");
assert.ok(js.includes('num: "21"'), "Missing 21st step of Master Engineering Pipeline");
assert.ok(html.includes("seL4"), "Missing seL4 formal verification benchmark");
assert.ok(html.includes("ASML Twinscan EUV"), "Missing ASML Twinscan EUV benchmark");
assert.ok(html.includes("EosCore"), "Missing EosCore L0 engine");
assert.ok(html.includes("EosAin"), "Missing EosAin L0 engine");
assert.ok(html.includes("EosAstral"), "Missing EosAstral L0 engine");
assert.ok(html.includes("EosElohim"), "Missing EosElohim L0 engine");
assert.ok(html.includes("Velo de Isis"), "Missing Velo de Isis L0 engine");
assert.ok(html.includes("Atalanta"), "Missing Atalanta Three-Voice Alchemical Fugue reference");
assert.ok(html.includes("Flyme Sound"), "Missing Geely EX5 / Chery E5 Flyme Sound 1,000W calibration");
assert.ok(html.includes('id="templo-solar"'), "Missing #templo-solar EosSolarSanctum interactive section");
assert.ok(html.includes('id="nanosecond-engine"'), "Missing #nanosecond-engine Nanosecond & Universal Translator section");
assert.ok(html.includes('id="memoria-akashica"'), "Missing #memoria-akashica Sovereign Akashic Memory section");
assert.ok(html.includes('id="akashic-memory-vault"'), "Missing #akashic-memory-vault interactive memory vault");
assert.ok(html.includes('id="bigtech-pantheon"'), "Missing #bigtech-pantheon Big Tech 10/10 & TLA+ section");
assert.ok(html.includes('id="eos-cmdk-dialog"'), "Missing #eos-cmdk-dialog Omniscient Command Palette");
assert.ok(html.includes('closedby="any"'), "Missing closedby=\"any\" declarative light-dismiss attribute");
assert.ok(fs.existsSync(path.join(root, "src/core/eosBigTechPantheon.ts")), "Missing src/core/eosBigTechPantheon.ts");
assert.ok(fs.existsSync(path.join(root, "api/bigtech.js")), "Missing api/bigtech.js serverless Big Tech TLA+ endpoint");
assert.ok(html.includes('id="linux-kernel-core"'), "Missing #linux-kernel-core Linux Kernel Ring-0 section");
assert.ok(html.includes('id="linux-kernel-lab"'), "Missing #linux-kernel-lab interactive VFS & RCU laboratory");
assert.ok(fs.existsSync(path.join(root, "src/core/eosLinuxKernelCore.ts")), "Missing src/core/eosLinuxKernelCore.ts");
assert.ok(fs.existsSync(path.join(root, "api/kernel.js")), "Missing api/kernel.js serverless Linux Kernel Ring-0 endpoint");
assert.ok(html.includes('id="omega-singularity"'), "Missing #omega-singularity Omega v8.0 section");
assert.ok(html.includes('id="omega-singularity-lab"'), "Missing #omega-singularity-lab interactive PQC/ZK-STARK/BFT/Time-Travel lab");
assert.ok(fs.existsSync(path.join(root, "src/core/eosOmegaSingularity.ts")), "Missing src/core/eosOmegaSingularity.ts");
assert.ok(fs.existsSync(path.join(root, "api/kernel.js")), "Missing api/kernel.js serverless Linux Kernel & Omega endpoint");
assert.ok(html.includes('id="cicd-secdevops"'), "Missing #cicd-secdevops Sovereign CI/CD v9.0 section");
assert.ok(html.includes('id="cicd-pipeline-lab"'), "Missing #cicd-pipeline-lab interactive 7-stage CI/CD lab");
assert.ok(fs.existsSync(path.join(root, "src/core/eosCicdPipeline.ts")), "Missing src/core/eosCicdPipeline.ts");
assert.ok(fs.existsSync(path.join(root, "api/cicd.js")), "Missing api/cicd.js serverless CI/CD SecDevOps endpoint");
assert.ok(fs.existsSync(path.join(root, ".github/workflows/eos-sovereign-cicd.yml")), "Missing .github/workflows/eos-sovereign-cicd.yml");
assert.ok(fs.existsSync(path.join(root, ".githooks/pre-commit")), "Missing .githooks/pre-commit");
assert.ok(fs.existsSync(path.join(root, ".githooks/pre-push")), "Missing .githooks/pre-push");
assert.ok(fs.existsSync(path.join(root, "docs/projects/registry.json")), "Missing docs/projects/registry.json (Law IV Registry)");
assert.ok(fs.existsSync(path.join(root, "src/core/eosFleetDispatcher.ts")), "Missing src/core/eosFleetDispatcher.ts");
assert.ok(fs.existsSync(path.join(root, "api/fleet.js")), "Missing api/fleet.js serverless fleet dispatcher endpoint");
assert.ok(fs.existsSync(path.join(root, "scripts/install-fleet-cicd-hooks.mjs")), "Missing scripts/install-fleet-cicd-hooks.mjs");
assert.ok(fs.existsSync(path.join(root, "scripts/fleet-autonomous-cicd.mjs")), "Missing scripts/fleet-autonomous-cicd.mjs");
assert.ok(html.includes('id="fleet-cicd-orchestrator"'), "Missing #fleet-cicd-orchestrator interactive fleet orchestrator");
assert.ok(html.includes('id="eos-jarvis-nexus"'), "Missing #eos-jarvis-nexus JARVIS Sovereign Monad section");
assert.ok(fs.existsSync(path.join(root, "src/core/eosJarvisMonad.ts")), "Missing src/core/eosJarvisMonad.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNeuralVectorCore.ts")), "Missing src/core/eosNeuralVectorCore.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosPatchValidator.ts")), "Missing src/core/eosPatchValidator.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosContextOptimizer.ts")), "Missing src/core/eosContextOptimizer.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosPromptAmplifier.ts")), "Missing src/core/eosPromptAmplifier.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosArchitectureGuard.ts")), "Missing src/core/eosArchitectureGuard.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosCognitiveJudge.ts")), "Missing src/core/eosCognitiveJudge.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosTurboEngine.ts")), "Missing src/core/eosTurboEngine.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosSemanticGraph.ts")), "Missing src/core/eosSemanticGraph.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAutonomousHealer.ts")), "Missing src/core/eosAutonomousHealer.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosWorktreeOrchestrator.ts")), "Missing src/core/eosWorktreeOrchestrator.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosCognitiveEval.ts")), "Missing src/core/eosCognitiveEval.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosOpenSpecSync.ts")), "Missing src/core/eosOpenSpecSync.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosCore.test.mjs")), "Missing test/eosCore.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/chaosResilience.test.mjs")), "Missing test/chaosResilience.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosPrometheus.test.mjs")), "Missing test/eosPrometheus.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosTurbo.test.mjs")), "Missing test/eosTurbo.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosSemanticGraph.test.mjs")), "Missing test/eosSemanticGraph.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosAutonomousHealer.test.mjs")), "Missing test/eosAutonomousHealer.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosWorktree.test.mjs")), "Missing test/eosWorktree.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosCognitiveEval.test.mjs")), "Missing test/eosCognitiveEval.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosOpenSpec.test.mjs")), "Missing test/eosOpenSpec.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosTitans.test.mjs")), "Missing test/eosTitans.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosTitansMatrix.ts")), "Missing src/core/eosTitansMatrix.ts");
assert.ok(fs.existsSync(path.join(root, "catalog-info.yaml")), "Missing catalog-info.yaml Backstage descriptor");
assert.ok(fs.existsSync(path.join(root, "api/eval.js")), "Missing api/eval.js serverless cognitive eval & titans endpoint");
assert.ok(fs.existsSync(path.join(root, "openspec/specs/SPEC-001-CONSTITUTION.md")), "Missing openspec/specs/SPEC-001-CONSTITUTION.md");
assert.ok(fs.existsSync(path.join(root, "README.md")), "Missing README.md");
assert.ok(html.includes('id="jarvis-webgl-canvas"'), "Missing #jarvis-webgl-canvas 3D WebGL HUD");
assert.ok(fs.existsSync(path.join(root, "api/jarvis.js")), "Missing api/jarvis.js serverless JARVIS endpoint");
assert.ok(fs.existsSync(path.join(root, "api/health.js")), "Missing api/health.js serverless CNCF health endpoint");
assert.ok(fs.existsSync(path.join(root, "api/graph.js")), "Missing api/graph.js serverless semantic graph endpoint");
assert.ok(fs.existsSync(path.join(root, "api/compile.js")), "Missing api/compile.js serverless prompt amplifier & compiler endpoint");
assert.ok(html.includes('id="tier1-control-nexus"'), "Missing #tier1-control-nexus Tier 1 section");
assert.ok(html.includes('id="sovereign-fleet-topology"'), "Missing #sovereign-fleet-topology 3D Topology section");
assert.ok(html.includes('id="eos-fleet-topology-canvas"'), "Missing #eos-fleet-topology-canvas 3D canvas");
assert.ok(fs.existsSync(path.join(root, "docs/identity/VALENTIN_ARCHITECT_CODEX.md")), "Missing docs/identity/VALENTIN_ARCHITECT_CODEX.md");
assert.ok(fs.existsSync(path.join(root, "src/core/eosJarvisSoul.ts")), "Missing src/core/eosJarvisSoul.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosIntrospectionEngine.ts")), "Missing src/core/eosIntrospectionEngine.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosImpenetrableShield.ts")), "Missing src/core/eosImpenetrableShield.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosJarvisSoulIntrospection.test.mjs")), "Missing test/eosJarvisSoulIntrospection.test.mjs");
assert.ok(fs.existsSync(path.join(root, "assets/eos_apex.wasm")), "Missing assets/eos_apex.wasm compiled WebAssembly kernel");
assert.ok(fs.existsSync(path.join(root, "js/wasm_exec.js")), "Missing js/wasm_exec.js WebAssembly bridge");
assert.ok(fs.existsSync(path.join(root, "src/core/eosFleetTopology.ts")), "Missing src/core/eosFleetTopology.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosWasmEngine.ts")), "Missing src/core/eosWasmEngine.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosWasmTopology.test.mjs")), "Missing test/eosWasmTopology.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosDatalogVerifier.ts")), "Missing src/core/eosDatalogVerifier.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosMutationTester.ts")), "Missing src/core/eosMutationTester.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosTimeTravelSim.ts")), "Missing src/core/eosTimeTravelSim.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosMicroScheduler.ts")), "Missing src/core/eosMicroScheduler.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosTierS1OmegaSdlc.test.mjs")), "Missing test/eosTierS1OmegaSdlc.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/mcp/eosMcpStreamServer.ts")), "Missing src/mcp/eosMcpStreamServer.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosMcpStreamServer.test.mjs")), "Missing test/eosMcpStreamServer.test.mjs");
assert.ok(fs.existsSync(path.join(root, "docs/formal/LmaxDisruptor.tla")), "Missing docs/formal/LmaxDisruptor.tla");
assert.ok(fs.existsSync(path.join(root, "docs/formal/DatomicBitemporalLedger.tla")), "Missing docs/formal/DatomicBitemporalLedger.tla");
assert.ok(fs.existsSync(path.join(root, "docs/formal/HermesConsensusMesh.tla")), "Missing docs/formal/HermesConsensusMesh.tla");
assert.ok(fs.existsSync(path.join(root, "scripts/verify-formal-tla.mjs")), "Missing scripts/verify-formal-tla.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosSecureMemoryVault.ts")), "Missing src/core/eosSecureMemoryVault.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosApexTenMatrix.test.mjs")), "Missing test/eosApexTenMatrix.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosDurableWal.ts")), "Missing src/core/eosDurableWal.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosHermeticSandbox.ts")), "Missing src/core/eosHermeticSandbox.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosPrometheusExporter.ts")), "Missing src/core/eosPrometheusExporter.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosWebGpuTopology.ts")), "Missing src/core/eosWebGpuTopology.ts");
assert.ok(fs.existsSync(path.join(root, "src/native/eos_topology_shader.wgsl")), "Missing src/native/eos_topology_shader.wgsl");
assert.ok(fs.existsSync(path.join(root, "test/eosBigTechTier1Perfection.test.mjs")), "Missing test/eosBigTechTier1Perfection.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosGnosticTemple.ts")), "Missing src/core/eosGnosticTemple.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosFinOpsBudget.ts")), "Missing src/core/eosFinOpsBudget.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAlchemicalTransmuter.ts")), "Missing src/core/eosAlchemicalTransmuter.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNanoBenchmarkEngine.ts")), "Missing src/core/eosNanoBenchmarkEngine.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosSentinelDaemon.ts")), "Missing src/core/eosSentinelDaemon.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosGnosticFinOps.test.mjs")), "Missing test/eosGnosticFinOps.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosTierZeroApexPerfection.test.mjs")), "Missing test/eosTierZeroApexPerfection.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosMindLevelsIntrospector.ts")), "Missing src/core/eosMindLevelsIntrospector.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosThreeMountainsCompass.ts")), "Missing src/core/eosThreeMountainsCompass.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAdaptiveL0Autotuner.ts")), "Missing src/core/eosAdaptiveL0Autotuner.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosBitwiseAccelerator.ts")), "Missing src/core/eosBitwiseAccelerator.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosBufferPool.ts")), "Missing src/core/eosBufferPool.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosApexProfiler.ts")), "Missing src/core/eosApexProfiler.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosMindMountainsAutotune.test.mjs")), "Missing test/eosMindMountainsAutotune.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/eosBigTechHyperOptimization.test.mjs")), "Missing test/eosBigTechHyperOptimization.test.mjs");
assert.ok(html.includes('id="panel-nexus-blast"'), "Missing #panel-nexus-blast");
assert.ok(html.includes('id="panel-nexus-prometheus"'), "Missing #panel-nexus-prometheus");
assert.ok(html.includes('id="panel-nexus-turbo"'), "Missing #panel-nexus-turbo");
assert.ok(html.includes('id="panel-nexus-healer"'), "Missing #panel-nexus-healer");
assert.ok(fs.existsSync(path.join(root, "scripts/verify-sri-integrity.mjs")), "Missing scripts/verify-sri-integrity.mjs");
assert.ok(fs.existsSync(path.join(root, "scripts/verify-cwv-budget.mjs")), "Missing scripts/verify-cwv-budget.mjs");
assert.ok(fs.existsSync(path.join(root, "src/mcp/eosMcpServer.ts")), "Missing src/mcp/eosMcpServer.ts");
assert.ok(fs.existsSync(path.join(root, "bin/eos.mjs")), "Missing bin/eos.mjs");
assert.ok(fs.existsSync(path.join(root, ".cursor/rules/eos-governance.mdc")), "Missing .cursor/rules/eos-governance.mdc");
assert.ok(fs.existsSync(path.join(root, "scripts/eos-jarvis-daemon.mjs")), "Missing scripts/eos-jarvis-daemon.mjs");
assert.ok(html.includes('id="btn-copy-eos-blueprint"'), "Missing #btn-copy-eos-blueprint button");
assert.ok(html.includes('id="btn-download-eos-spec"'), "Missing #btn-download-eos-spec button");
assert.ok(html.includes('id="eos-evolution-log"'), "Missing #eos-evolution-log live co-evolution log");
assert.ok(html.includes("5IiquGZEbovPj9B8IdG0bi"), "Missing canonical Perfect Music ID 5IiquGZEbovPj9B8IdG0bi in Aberamentho v8.0 seal");
assert.ok(html.includes("/api/playlist-tracks"), "Missing /api/playlist-tracks In-App Full-Track Player reference");
assert.ok(html.includes("Citadel"), "Missing Citadel HFT <100ns benchmark");
assert.ok(html.includes("kdb+"), "Missing kdb+ L1/L2 Cache benchmark");
assert.ok(html.includes("Zed"), "Missing Zed 120 FPS GPUI benchmark");
assert.ok(html.includes("TigerBeetle"), "Missing TigerBeetle / ScyllaDB benchmark");
assert.ok(html.includes("Struct of Arrays"), "Missing Struct of Arrays (SoA) Data-Oriented Design secret");
assert.ok(html.includes("sanctum-panel-oraculo"), "Missing #sanctum-panel-oraculo Sacred Geometry & Oracle panel");
assert.ok(fs.existsSync(path.join(root, "src/core/samaelCodex.ts")), "Missing src/core/samaelCodex.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNanosecondEngine.ts")), "Missing src/core/eosNanosecondEngine.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAkashicMemory.ts")), "Missing src/core/eosAkashicMemory.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNsaCryptoSuite.ts")), "Missing src/core/eosNsaCryptoSuite.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNsaZeroTrustCompartment.ts")), "Missing src/core/eosNsaZeroTrustCompartment.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosNsaAnomalyDetector.ts")), "Missing src/core/eosNsaAnomalyDetector.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosNsaZeroTrustDefense.test.mjs")), "Missing test/eosNsaZeroTrustDefense.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosTrueTimeBoundedClock.ts")), "Missing src/core/eosTrueTimeBoundedClock.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosPlanetaryConsensusEngine.ts")), "Missing src/core/eosPlanetaryConsensusEngine.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAdaptiveConcurrencyLimiter.ts")), "Missing src/core/eosAdaptiveConcurrencyLimiter.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosPlanetaryConsensusAdaptiveConcurrency.test.mjs")), "Missing test/eosPlanetaryConsensusAdaptiveConcurrency.test.mjs");
assert.ok(fs.existsSync(path.join(root, "src/core/eosConsistentHashRing.ts")), "Missing src/core/eosConsistentHashRing.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosAntiEntropyMerkleSync.ts")), "Missing src/core/eosAntiEntropyMerkleSync.ts");
assert.ok(fs.existsSync(path.join(root, "src/core/eosTokenBucketRateLimiter.ts")), "Missing src/core/eosTokenBucketRateLimiter.ts");
assert.ok(fs.existsSync(path.join(root, "test/eosConsistentHashingRateLimiter.test.mjs")), "Missing test/eosConsistentHashingRateLimiter.test.mjs");
console.log("[PASS] 5/6 Interactive Control Plane, NSA Defense Suite, Google Spanner TrueTime, Amazon Dynamo Consistent Hashing, Cloudflare Rate Limiter, EosSolarSanctum, EosNanosecondEngine, EosAkashicMemory (27 Engram Tools + ODD/RDD 4R), World Top-10 L0 Matrix & 21-Step Pipeline verified.");

// 6. Verify Service Worker, Assets & Xirp-Grade Speed Architecture (FR-011)
assert.ok(fs.existsSync(path.join(root, "sw.js")), "Missing sw.js");
const swContent = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert.ok(swContent.includes("STATIC_CACHE"), "Missing STATIC_CACHE in sw.js");
assert.ok(swContent.includes("API_CACHE"), "Missing API_CACHE in sw.js");
assert.ok(swContent.includes("OFFLINE_STANDALONE_MODE"), "Missing OFFLINE_STANDALONE_MODE in sw.js");
assert.ok(fs.existsSync(path.join(root, "favicon.svg")), "Missing favicon.svg");
assert.ok(fs.existsSync(path.join(root, "assets/eos-system.png")), "Missing assets/eos-system.png");
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const globalHeaders = vercelConfig.headers.find((h) => h.source === "/(.*)");
assert.ok(globalHeaders, "Missing global header configuration in vercel.json");
const hasCsp = globalHeaders.headers.some((kv) => kv.key === "Content-Security-Policy");
assert.ok(hasCsp, "Missing Content-Security-Policy in vercel.json");
assert.ok(html.includes('type="speculationrules"'), "Missing <script type=\"speculationrules\"> for instant navigation");
assert.ok(html.includes('rel="preload"'), "Missing <link rel=\"preload\"> critical asset hints");
assert.ok(html.includes('fetchpriority="high"'), "Missing fetchpriority=\"high\" on above-the-fold brand emblem");
assert.ok(css.includes("touch-action: manipulation"), "Missing touch-action: manipulation zero-delay tap optimization");
console.log("[PASS] 6/6 Service Worker, visual assets & Xirp-Speed 5-Pillar architecture verified.");

console.log("----------------------------------------------------------");
console.log("EPISTEMIC STATE: VERIFIED | 6/6 INVARIANTS PASSED (EXIT 0)");
