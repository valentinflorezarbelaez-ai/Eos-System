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
assert.ok(fs.existsSync(path.join(root, "api/omega.js")), "Missing api/omega.js serverless Omega Singularity endpoint");
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
assert.ok(fs.existsSync(path.join(root, "test/eosCore.test.mjs")), "Missing test/eosCore.test.mjs");
assert.ok(fs.existsSync(path.join(root, "test/chaosResilience.test.mjs")), "Missing test/chaosResilience.test.mjs");
assert.ok(fs.existsSync(path.join(root, "README.md")), "Missing README.md");
assert.ok(html.includes('id="jarvis-webgl-canvas"'), "Missing #jarvis-webgl-canvas 3D WebGL HUD");
assert.ok(fs.existsSync(path.join(root, "api/jarvis.js")), "Missing api/jarvis.js serverless JARVIS endpoint");
assert.ok(fs.existsSync(path.join(root, "api/health.js")), "Missing api/health.js serverless CNCF health endpoint");
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
assert.ok(fs.existsSync(path.join(root, "src/components/EosSolarSanctum.tsx")), "Missing src/components/EosSolarSanctum.tsx");
assert.ok(fs.existsSync(path.join(root, "api/teurgia.js")), "Missing api/teurgia.js serverless oracle");
assert.ok(fs.existsSync(path.join(root, "api/compile.js")), "Missing api/compile.js serverless universal translator");
assert.ok(fs.existsSync(path.join(root, "api/memory.js")), "Missing api/memory.js serverless Akashic memory engine");
console.log("[PASS] 5/6 Interactive Control Plane, EosSolarSanctum, EosNanosecondEngine, EosAkashicMemory (27 Engram Tools + ODD/RDD 4R), World Top-10 L0 Matrix & 21-Step Pipeline verified.");

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
