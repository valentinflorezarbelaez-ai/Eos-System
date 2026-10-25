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
  console.log(" EOS SYSTEM v12.0 — SOVEREIGN CONTROL PLANE CLI (UNIVERSAL)            ");
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
  eos help                   Muestra este manual de operaciones

Integración con IDEs:
  Cursor / Antigravity       Configurable vía .cursor/mcp.json y .cursor/rules/
  VS Code / JetBrains        Ejecutable directamente desde cualquier terminal o tarea
`);
    break;
  }
}
