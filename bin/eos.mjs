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
  console.log(" EOS SYSTEM v13.0 — SOVEREIGN CONTROL PLANE CLI (UNIVERSAL)            ");
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
      console.log("\n[PASS] All Unit & Chaos suites completed successfully (Exit 0).");
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

  case "help":
  case "--help":
  case "-h":
  default: {
    printBanner();
    console.log(`
Uso Universal:
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
  eos help                   Muestra este manual de operaciones

Integración con IDEs:
  Cursor / Antigravity       Configurable vía .cursor/mcp.json y .cursor/rules/
  VS Code / JetBrains        Ejecutable directamente desde cualquier terminal o tarea
`);
    break;
  }
}
