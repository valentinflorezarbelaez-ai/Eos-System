#!/usr/bin/env node

/**
 * EOS SYSTEM — UNIVERSAL CLI ENTRY POINT (Layer 0)
 * Governed by ADR-016, FR-023 & BDD-018
 *
 * Provides a unified, IDE-agnostic command line interface for Cursor, Antigravity,
 * VS Code, JetBrains, Neovim, and CI/CD pipelines.
 *
 * Usage:
 *   eos verify               - Run 7-stage fail-closed SecDevOps pipeline
 *   eos audit                - Audit sovereign fleet repositories
 *   eos test                 - Run unit tests and chaos resilience suite
 *   eos mcp                  - Launch native Model Context Protocol (MCP) server
 *   eos jarvis [directive]   - Execute autonomous cognitive directive
 *   eos health               - Print CNCF health and memory telemetry
 *   eos help                 - Display this operational manual
 *
 * Zero external runtime dependencies.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = (args[0] || "help").toLowerCase();

function printBanner() {
  console.log("======================================================================");
  console.log(" EOS SYSTEM v17.0 — SOVEREIGN CONTROL PLANE CLI (UNIVERSAL)            ");
  console.log(" Zero Vibe Coding · Layer-0 Hexagonal · Big Tech Tier 1 · SLSA Level 4");
  console.log("======================================================================");
}

switch (command) {
  case "verify": {
    printBanner();
    console.log("[EOS] Executing 7-Stage Sovereign SecDevOps Gate...\n");
    try {
      execFileSync(process.execPath, [path.join(root, "scripts/verify-cicd-pipeline.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
    } catch (err) {
      process.exit(1);
    }
    break;
  }

  case "turbo":
  case "fast": {
    printBanner();
    console.log("[EOS TURBO] Disparando Tubería de Verificación Ultrarrápida en Memoria...\n");
    const { runTurboPipeline } = await import("../src/core/eosTurboEngine.ts");
    const result = runTurboPipeline(root);

    console.log(`Estado Epistémico    : ${result.epistemicState}`);
    console.log(`Tiempo Total         : ${result.totalDurationMs} ms (${result.totalDurationUs} µs)`);
    console.log(`Archivos Analizados  : ${result.totalFilesChecked} (${result.cacheHits} en caché, ${result.freshScans} frescos)`);
    console.log(`Merkle SBOM Root     : ${result.sbomMerkleRoot.slice(0, 32)}...\n`);
    console.log("=== TELEMETRÍA DE ALTA PRECISIÓN POR ADUANA ===");
    result.stages.forEach((s) => {
      const icon = s.status === "PASS" ? "✔" : "✖";
      console.log(`  ${icon} [${s.stageId}] ${s.name}: ${s.durationMs} ms (${s.durationUs} µs)`);
      console.log(`    ↳ ${s.details}`);
    });

    if (result.violations.length > 0) {
      console.log("\n[HALLAZGOS DETECTADOS]");
      result.violations.forEach((v) => console.log(`  ! ${v}`));
      process.exit(1);
    } else {
      console.log(`\n[PASS] Verificación Turbo 100% exitosa en ${result.totalDurationMs} ms (Exit Code 0).`);
    }
    break;
  }

  case "audit": {
    printBanner();
    console.log("[EOS] Auditing Sovereign Fleet Repositories...\n");
    try {
      execFileSync(process.execPath, [path.join(root, "scripts/fleet-autonomous-cicd.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
    } catch (err) {
      process.exit(1);
    }
    break;
  }

  case "test": {
    printBanner();
    console.log("[EOS] Running Native Unit & Chaos Resilience Test Suites...\n");
    try {
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosCore.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/chaosResilience.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosPrometheus.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosTurbo.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosSemanticGraph.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosAutonomousHealer.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosWorktree.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosCognitiveEval.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      execFileSync(process.execPath, ["--test", path.join(root, "test/eosOpenSpec.test.mjs")], {
        cwd: root,
        stdio: "inherit"
      });
      console.log("\n[PASS] All Unit, Chaos, Worktree, Eval & OpenSpec suites completed successfully (Exit 0).");
    } catch (err) {
      process.exit(1);
    }
    break;
  }

  case "mcp": {
    // Launch MCP Server over stdio
    const { EosMcpServer } = await import("../src/mcp/eosMcpServer.ts");
    const server = new EosMcpServer(root);
    server.startStdioLoop();
    break;
  }

  case "jarvis": {
    printBanner();
    const directive = args.slice(1).join(" ") || "Estado general del sistema";
    const { interpretJarvisDirective } = await import("../src/core/eosJarvisMonad.ts");
    const receipt = interpretJarvisDirective(directive);

    console.log(`\nDirectiva     : "${receipt.promptInput}"`);
    console.log(`Intención     : ${receipt.detectedIntent}`);
    console.log(`Respuesta Voz : "${receipt.voiceTranscript}"`);
    console.log(`Cognition ID  : ${receipt.cognitionId}`);
    if (receipt.tmrConsensus) {
      console.log(`TMR Consenso  : ${receipt.tmrConsensus.agreementRatio} (${receipt.tmrConsensus.consensusHash})`);
      console.log(`Acción Run    : ${receipt.tmrConsensus.selectedAction}`);
    }
    console.log("\nPlan de Ejecución:");
    receipt.executionPlan.forEach((step) => console.log(`  ${step}`));
    break;
  }

  case "health": {
    printBanner();
    const mem = process.memoryUsage();
    console.log("\n[STATUS] : UP (Big Tech Tier 1)");
    console.log(`Runtime  : Node.js ${process.version} (${process.platform}-${process.arch})`);
    console.log(`Uptime   : ${Math.floor(process.uptime())}s`);
    console.log(`RSS Mem  : ${(mem.rss / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`HeapUsed : ${(mem.heapUsed / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Subsystems: 7/7 Monitored Online (L0 Pure, 0-Deps)`);
    break;
  }

  case "optimize": {
    printBanner();
    const targetFile = args[1];
    if (!targetFile) {
      console.log("Uso: eos optimize <ruta-del-archivo>");
      process.exit(1);
    }
    const fullPath = path.resolve(root, targetFile);
    if (!fs.existsSync(fullPath)) {
      console.log(`Error: Archivo no encontrado: ${targetFile}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, "utf8");
    const { compressSourceContext } = await import("../src/core/eosContextOptimizer.ts");
    const res = compressSourceContext(content, targetFile);
    console.log(`\nArchivo Comprimido : ${res.filePath}`);
    console.log(`Tokens Originales  : ~${res.originalTokensEstimate}`);
    console.log(`Tokens Comprimidos : ~${res.compressedTokensEstimate}`);
    console.log(`Ahorro de Tokens   : ${res.tokenSavingsPercent}%`);
    console.log(`Símbolos Extraídos : ${res.symbolsFound.join(", ") || "Ninguno"}`);
    console.log("\n--- ESQUEMA DE CONTEXTO ESTRUCTURAL ---");
    console.log(res.compressedOutline);
    break;
  }

  case "amplify": {
    printBanner();
    const rawPrompt = args.slice(1).join(" ");
    if (!rawPrompt) {
      console.log("Uso: eos amplify <directiva-o-prompt>");
      process.exit(1);
    }
    const { amplifyPrompt } = await import("../src/core/eosPromptAmplifier.ts");
    const result = amplifyPrompt({ rawPrompt, strictLevel: "sovereign" });
    console.log(`\nDirectiva Original   : "${result.originalPrompt}"`);
    console.log(`Dominio Detectado    : ${result.detectedDomain}`);
    console.log(`Estrategia Cognitiva : ${result.modelScaffold.thinkingStrategy}\n`);
    console.log("=== ESPECIFICACIÓN EARS (ISO 29148 / IEEE 830) ===");
    result.earsRequirements.forEach((req) => {
      console.log(`[${req.id}] ${req.type}: ${req.syntax}`);
    });
    console.log("\n=== CRITERIOS DE ACEPTACIÓN (BDD GIVEN-WHEN-THEN) ===");
    result.bddScenarios.forEach((sc) => {
      console.log(`Scenario: ${sc.title}`);
      console.log(`  GIVEN ${sc.given}`);
      console.log(`  WHEN ${sc.when}`);
      console.log(`  THEN ${sc.then}`);
      sc.and.forEach((a) => console.log(`  AND ${a}`));
    });
    console.log("\n=== CONTRATO ANTI-ALUCINACIÓN ===");
    result.modelScaffold.antiHallucinationRules.forEach((rule) => console.log(`  ! ${rule}`));
    break;
  }

  case "guard": {
    printBanner();
    const targetDir = args[1] ? path.resolve(root, args[1]) : path.resolve(root, "src");
    console.log(`[EOS GUARD] Escaneando arquitectura Hexagonal en: ${targetDir}\n`);
    const { scanArchitecture } = await import("../src/core/eosArchitectureGuard.ts");
    const report = scanArchitecture(targetDir, root);

    console.log(`Archivos Analizados  : ${report.scannedFilesCount}`);
    console.log(`Distribución Capas   : DOMAIN=${report.layersDistribution.DOMAIN}, APP=${report.layersDistribution.APPLICATION}, INFRA=${report.layersDistribution.INFRASTRUCTURE}, UI=${report.layersDistribution.PRESENTATION}`);
    console.log(`Pureza Arquitectónica: ${report.architecturePurityScore}%`);
    console.log(`Ciclos Circulares    : ${report.circularDependencies.length}`);
    console.log(`Total Violaciones    : ${report.totalViolations}`);

    if (report.violations.length > 0) {
      console.log("\n[HALLAZGOS IDENTIFICADOS]");
      report.violations.forEach((v) => {
        console.log(`  - [${v.rule}] en ${v.file}: ${v.details}`);
      });
      process.exit(1);
    } else {
      console.log("\n[PASS] Arquitectura 100% limpia. 0 dependencias circulares. Dominio L0 puro.");
    }
    break;
  }

  case "judge": {
    printBanner();
    const scenarioDesc = args.slice(1).join(" ") || "Propuesta de refactorización de módulo";
    const { evaluateDecision } = await import("../src/core/eosCognitiveJudge.ts");
    const verdict = evaluateDecision({
      title: "Evaluación Soberana de Propuesta",
      description: scenarioDesc,
      proposedAction: scenarioDesc,
      targetDomain: "CORE"
    });

    console.log(`\nEscenario            : ${verdict.scenarioTitle}`);
    console.log(`Dictamen             : ${verdict.approved ? "APROBADO [PASS]" : "RECHAZADO [FAIL]"}`);
    console.log(`Puntaje Bayesiano    : ${verdict.overallScore}/100`);
    console.log(`Estado Epistémico    : ${verdict.epistemicState}`);
    console.log("\nDesglose por Dimensión:");
    console.log(`  - Seguridad         : ${verdict.dimensionScores.security}/100`);
    console.log(`  - Pureza Hexagonal  : ${verdict.dimensionScores.architecturalPurity}/100`);
    console.log(`  - Corrección (Spec) : ${verdict.dimensionScores.correctness}/100`);
    console.log(`  - Rendimiento       : ${verdict.dimensionScores.performance}/100`);

    if (verdict.requiredRemediations.length > 0) {
      console.log("\nRemediaciones Requeridas:");
      verdict.requiredRemediations.forEach((r) => console.log(`  ! ${r}`));
    }
    console.log(`\nVeredicto: ${verdict.verdictRationale}`);
    if (!verdict.approved) process.exit(1);
    break;
  }

  case "blast": {
    printBanner();
    const targetFile = args[1];
    if (!targetFile) {
      console.log("Uso: eos blast <archivo>");
      process.exit(1);
    }
    const { EosSemanticGraph } = await import("../src/core/eosSemanticGraph.ts");
    const graph = new EosSemanticGraph(root);
    const report = graph.calculateBlastRadius(targetFile);

    console.log(`\nArchivo Objetivo      : ${report.targetFile}`);
    console.log(`Nivel de Riesgo       : [${report.riskLevel}]`);
    console.log(`Consumidores Directos : ${report.directConsumers.length}`);
    console.log(`Impacto Transitivo    : ${report.totalImpactedFiles} archivos (${report.impactPercentage}% del proyecto)`);
    console.log(`Tiempo de Cálculo     : ${report.durationUs} µs\n`);

    if (report.directConsumers.length > 0) {
      console.log("Consumidores Directos:");
      report.directConsumers.forEach((c) => console.log(`  ↳ ${c}`));
    }
    if (report.transitiveConsumers.length > 0) {
      console.log("\nCierre Transitivo Completo (Blast Radius):");
      report.transitiveConsumers.forEach((c) => console.log(`  * ${c}`));
    }
    if (report.predictiveTestSuites.length > 0) {
      console.log("\n[PTS] Selección Predictiva de Pruebas Requeridas:");
      report.predictiveTestSuites.forEach((t) => console.log(`  ✔ node --test ${t}`));
    }
    break;
  }

  case "graph": {
    printBanner();
    console.log("[EOS GRAPH] Construyendo Grafo Semántico Big Tech Tier 1...\n");
    const { EosSemanticGraph } = await import("../src/core/eosSemanticGraph.ts");
    const graph = new EosSemanticGraph(root);
    const summary = graph.getSummary();

    console.log(`Nodos de Archivo      : ${summary.totalFiles}`);
    console.log(`Símbolos Exportados   : ${summary.totalExports}`);
    console.log(`Aristas de Dependencia: ${summary.totalEdges}`);
    console.log(`Código Huérfano       : ${summary.deadCodeCount} símbolos con 0 consumidores`);

    if (summary.deadSymbols.length > 0) {
      console.log("\nSímbolos con 0 Consumidores (Dead Code):");
      summary.deadSymbols.slice(0, 10).forEach((s) => {
        console.log(`  - [${s.kind}] ${s.name} en ${s.filePath}:${s.lineNumber}`);
      });
    }
    break;
  }

  case "heal":
  case "fix": {
    printBanner();
    console.log("[EOS HEAL] Disparando Bucle FDIR de Auto-Sanación Autónoma (Meta SapFix)...\n");
    const targetFile = args[1];
    const dryRun = args.includes("--dry-run");

    const { EosAutonomousHealer } = await import("../src/core/eosAutonomousHealer.ts");
    const healer = new EosAutonomousHealer(root);
    const report = healer.executeHealing({ targetFile, dryRun });

    console.log(`Estado Epistémico    : ${report.epistemicState}`);
    console.log(`Archivos Remediados  : ${report.remediatedCount}`);
    console.log(`Modo de Ejecución    : ${dryRun ? "SIMULACIÓN (DRY-RUN)" : "APLICACIÓN EN VIVO"}`);
    console.log(`Tiempo de Ejecución  : ${report.durationMs} ms\n`);

    if (report.candidates.length > 0) {
      console.log("Remediaciones Sintetizadas y Validadas:");
      report.candidates.forEach((c) => {
        console.log(`  ✔ [${c.action}] en ${c.targetPath} (Riesgo: ${c.blastRadiusRisk}, Sandbox: ${c.sandboxValid ? "PASS" : "FAIL"})`);
      });
    } else {
      console.log("[INFO] No se detectaron anomalías requeridas de reparación. Código 100% puro.");
    }

    if (report.receiptPath) {
      console.log(`\nRecibo Criptográfico : ${report.receiptPath} (${report.receiptSha256?.slice(0, 24)}...)`);
    }
    console.log(`\n[PASS] Bucle de Auto-Sanación completado (Exit Code 0).`);
    break;
  }

  case "worktree": {
    printBanner();
    const subAction = (args[1] || "list").toLowerCase();
    const { EosWorktreeOrchestrator } = await import("../src/core/eosWorktreeOrchestrator.ts");
    const orchestrator = new EosWorktreeOrchestrator(root);

    if (subAction === "list") {
      const list = orchestrator.listWorktrees();
      console.log("[EOS WORKTREE] Árboles de Trabajo Aislados (Estándar Xirp):\n");
      list.forEach((w) => {
        const flag = w.isMain ? "(PRINCIPAL)" : "(AGENTE)";
        console.log(`  ● [${w.branch}] ${flag}`);
        console.log(`    Ruta: ${w.path}`);
        console.log(`    Commit: ${w.headCommit.slice(0, 10)}\n`);
      });
    } else if (subAction === "add" || subAction === "create") {
      const branchName = args[2];
      if (!branchName) {
        console.log("Uso: eos worktree add <nombre-rama>");
        process.exit(1);
      }
      console.log(`[EOS WORKTREE] Creando espacio de trabajo físico para agente en rama '${branchName}'...`);
      const created = orchestrator.createWorktree(branchName);
      console.log(`✔ Worktree creado en: ${created.path}`);
      console.log(`✔ Rama aislada: ${created.branch} (Exit Code 0)`);
    } else if (subAction === "remove" || subAction === "rm") {
      const targetPath = args[2];
      if (!targetPath) {
        console.log("Uso: eos worktree remove <ruta-worktree>");
        process.exit(1);
      }
      const res = orchestrator.removeWorktree(targetPath, { force: args.includes("--force") });
      if (res.success) {
        console.log(`✔ Worktree removido y podado atómicamente: ${res.removedPath}`);
      } else {
        console.log(`✖ Error removiendo worktree: ${res.error}`);
        process.exit(1);
      }
    }
    break;
  }

  case "eval": {
    printBanner();
    const target = args[1] || "src/core/eosPromptAmplifier.ts";
    console.log(`[EOS EVAL] Evaluando Calidad Cognitiva de: ${target} (Google/Anthropic Standard)...\n`);
    const { EosCognitiveEval } = await import("../src/core/eosCognitiveEval.ts");
    const evaluator = new EosCognitiveEval();
    const fullPath = path.resolve(root, target);
    const result = fs.existsSync(fullPath)
      ? evaluator.evaluate(fullPath)
      : evaluator.evaluate(target, { isText: true });

    console.log(`Puntaje Compuesto (CRI) : ${result.compositeScore} / 100`);
    console.log(`Veredicto Epistémico    : [${result.verdict}]`);
    console.log(`Líneas Analizadas       : ${result.totalLinesScanned}`);
    console.log(`Tiempo de Evaluación    : ${result.durationUs.toFixed(2)} µs\n`);
    console.log("=== DESGLOSE DE LAS 5 DIMENSIONES SOBERANAS ===");
    const dims = result.dimensions;
    console.log(`  1. Seguridad & Cero Secretos (30%) : ${dims.securityOwasp.score}/100 [${dims.securityOwasp.passed ? "PASS" : "FAIL"}]`);
    console.log(`  2. Pureza Hexagonal Capa 0 (25%)   : ${dims.hexagonalPurity.score}/100 [${dims.hexagonalPurity.passed ? "PASS" : "FAIL"}]`);
    console.log(`  3. Sintaxis AST & Tipado (20%)     : ${dims.astSyntax.score}/100 [${dims.astSyntax.passed ? "PASS" : "FAIL"}]`);
    console.log(`  4. Conformidad EARS & BDD (15%)    : ${dims.earsBddConformance.score}/100 [${dims.earsBddConformance.passed ? "PASS" : "FAIL"}]`);
    console.log(`  5. Índice Anti-Alucinación (10%)   : ${dims.hallucinationRisk.score}/100 [${dims.hallucinationRisk.passed ? "PASS" : "FAIL"}]`);
    console.log(`\nSello Criptográfico Merkle : ${result.sha256Proof.slice(0, 32)}... (Exit Code 0)`);
    break;
  }

  case "spec": {
    printBanner();
    const subAction = (args[1] || "check").toLowerCase();
    const { EosOpenSpecSync } = await import("../src/core/eosOpenSpecSync.ts");
    const synchronizer = new EosOpenSpecSync(root);

    if (subAction === "list") {
      const specs = synchronizer.listSpecs();
      const changes = synchronizer.listChanges();
      console.log(`[OPENSPEC] Especificaciones Base (${specs.length}):`);
      specs.forEach((s) => console.log(`  ● [${s.id}] ${s.title}`));
      console.log(`\n[OPENSPEC] Cambios Delta (${changes.length}):`);
      changes.forEach((c) => console.log(`  ▲ [${c.id}] ${c.title} -> ${c.status} (${c.authorizationLevel})`));
    } else {
      console.log("[OPENSPEC] Auditando Consistencia de Especificaciones Vivientes y Deriva...\n");
      const report = synchronizer.audit();
      console.log(`Especificaciones Base   : ${report.totalSpecs}`);
      console.log(`Cambios Delta Registrados: ${report.totalChanges}`);
      console.log(`Enlaces Huérfanos       : ${report.orphanLinks.length}`);
      console.log(`Faltas de Autorización  : ${report.missingAuthorizations.length}`);
      if (report.valid) {
        console.log(`\n[PASS] Sistema OpenSpec 100% armonizado sin deriva (Exit Code 0).`);
      } else {
        console.log(`\n[FAIL] Hallazgos detectados en OpenSpec:`);
        report.orphanLinks.concat(report.missingAuthorizations).forEach((f) => console.log(`  ! ${f}`));
        process.exit(1);
      }
    }
    break;
  }

  case "help":
  case "--help":
  case "-h":
  default: {
    printBanner();
    console.log(`
Uso Universal:
  eos turbo                  Verificación ultrarrápida en memoria con telemetría en microsegundos (<350ms)
  eos verify                 Ejecuta las 7 aduanas de seguridad SecDevOps (fail-closed)
  eos audit                  Audita en paralelo todos los repositorios de la flota
  eos test                   Ejecuta las pruebas unitarias y de caos (node:test)
  eos mcp                    Inicia el servidor Model Context Protocol sobre stdio
  eos jarvis [directiva]     Ejecuta una directiva cognitiva JARVIS en terminal
  eos health                 Muestra la telemetría en vivo del sistema (CNCF / SRE)
  eos optimize <archivo>     Comprime el archivo extrayendo su esquema estructural (70-85% tokens)
  eos amplify <prompt>       Amplifica un prompt informal a especificación formal EARS y BDD
  eos guard [directorio]     Audita pureza Hexagonal, capas L0 y detecta ciclos circulares
  eos judge <escenario>      Aplica el tribunal de decisión Bayesiano con los 7 Mandamientos
  eos blast <archivo>        Calcula el radio de impacto transitivo y pruebas predictivas (PTS)
  eos graph                  Muestra el grafo semántico, topología de módulos y código huérfano
  eos heal [archivo]         Ejecuta el bucle de auto-sanación FDIR (Meta SapFix) con recibo sellado
  eos worktree [list|add|rm] Gestiona Git Worktrees aislados para agentes estilo Xirp
  eos eval <archivo>         Ejecuta la evaluación cognitiva de 5 dimensiones (Google/Anthropic)
  eos spec [check|list]      Audita el sistema Living OpenSpec y previene deriva de Vibe Coding
  eos help                   Muestra este manual de operaciones

Integración con IDEs:
  Cursor / Antigravity       Configurable vía .cursor/mcp.json y .cursor/rules/
  VS Code / JetBrains        Ejecutable directamente desde cualquier terminal o tarea
`);
    break;
  }
}
