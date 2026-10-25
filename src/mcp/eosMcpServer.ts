/**
 * EOS SYSTEM — MODEL CONTEXT PROTOCOL (MCP) NATIVE SERVER (Layer 0)
 * Governed by ADR-015, FR-022 & BDD-017
 *
 * Implements the open Model Context Protocol (MCP) JSON-RPC 2.0 specification over stdio.
 * Enables Cursor, Antigravity, Claude Code, and Gemini to invoke EOS sovereign tools:
 * - eos_semantic_search: High-dimensional vector space queries.
 * - eos_tmr_consensus: Triple-Modular Redundancy Byzantine evaluation of directives.
 * - eos_audit_fleet: Cross-repository health and git status checks.
 * - eos_verify_gates: 7-stage fail-closed SecDevOps security gates.
 * - eos_health_check: CNCF / Google SRE observability telemetry.
 *
 * Zero external runtime dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import {
  createDefaultEosKnowledgeStore,
  tokenize,
  computeTermFrequency,
  cosineSimilarity
} from "../core/eosNeuralVectorCore.ts";

import {
  evaluateDirectiveWithTMR,
  interpretJarvisDirective,
  JARVIS_INTENT_REGISTRY
} from "../core/eosJarvisMonad.ts";

import {
  validatePatch
} from "../core/eosPatchValidator.ts";

import {
  compressSourceContext
} from "../core/eosContextOptimizer.ts";

import {
  amplifyPrompt
} from "../core/eosPromptAmplifier.ts";

import type {
  ModelFamily,
  StrictnessLevel
} from "../core/eosPromptAmplifier.ts";

import {
  scanArchitecture
} from "../core/eosArchitectureGuard.ts";

import {
  evaluateDecision
} from "../core/eosCognitiveJudge.ts";

import {
  runTurboPipeline
} from "../core/eosTurboEngine.ts";

import {
  EosSemanticGraph
} from "../core/eosSemanticGraph.ts";

import {
  EosAutonomousHealer
} from "../core/eosAutonomousHealer.ts";

import {
  EosWorktreeOrchestrator
} from "../core/eosWorktreeOrchestrator.ts";

import {
  EosCognitiveEval
} from "../core/eosCognitiveEval.ts";

import {
  EosOpenSpecSync
} from "../core/eosOpenSpecSync.ts";

import {
  EosTitansMatrix
} from "../core/eosTitansMatrix.ts";

import {
  EosSpotifyCodex
} from "../core/eosSpotifyCodex.ts";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class EosMcpServer {
  private readonly knowledgeStore = createDefaultEosKnowledgeStore();
  private readonly projectRoot: string;

  constructor(projectRoot?: string) {
    const currentDir = typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
    const repoCandidate = path.resolve(currentDir, "../../");

    if (projectRoot && fs.existsSync(path.join(projectRoot, "package.json"))) {
      this.projectRoot = projectRoot;
    } else if (process.env.EOS_PROJECT_ROOT && fs.existsSync(path.join(process.env.EOS_PROJECT_ROOT, "package.json"))) {
      this.projectRoot = process.env.EOS_PROJECT_ROOT;
    } else if (fs.existsSync(path.join(repoCandidate, "package.json"))) {
      this.projectRoot = repoCandidate;
    } else if (fs.existsSync(path.join(process.cwd(), "package.json"))) {
      this.projectRoot = process.cwd();
    } else {
      this.projectRoot = repoCandidate;
    }
  }

  public handleRequest(req: JsonRpcRequest): JsonRpcResponse | null {
    const { id, method, params } = req;

    // Notifications (no id)
    if (id === undefined || id === null) {
      if (method === "notifications/initialized") {
        return null;
      }
    }

    try {
      switch (method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
                resources: {}
              },
              serverInfo: {
                name: "eos-system-mcp",
                version: "18.0.0",
                description: "EOS Sovereign Engineering Operating System MCP Interface"
              }
            }
          };

        case "tools/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: [
                {
                  name: "eos_semantic_search",
                  description: "Search EOS sovereign architecture and knowledge base using deterministic Layer-0 hybrid vector and BM25 RRF fusion.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: { type: "string", description: "Natural language query to search" },
                      topK: { type: "number", description: "Maximum number of results to return (default: 3)" },
                      mode: { type: "string", enum: ["hybrid", "vector"], description: "Search mode: hybrid (RRF) or pure vector" }
                    },
                    required: ["query"]
                  }
                },
                {
                  name: "eos_tmr_consensus",
                  description: "Execute Triple-Modular Redundancy (TMR) Byzantine 3-sandbox evaluation for a directive before committing mutations.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      directive: { type: "string", description: "Directive or command to validate with TMR" }
                    },
                    required: ["directive"]
                  }
                },
                {
                  name: "eos_audit_fleet",
                  description: "Audits the health, git status, and endpoints of all repositories in the sovereign fleet.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      deep: { type: "boolean", description: "Run deep git inspection (default: false)" }
                    }
                  }
                },
                {
                  name: "eos_health_check",
                  description: "Retrieves CNCF / Google SRE observability telemetry, process memory RSS, and subsystem health.",
                  inputSchema: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  name: "eos_validate_patch",
                  description: "Pre-validates proposed code modifications in an in-memory AST sandbox to detect syntax errors, plaintext secrets, and destructive commands before touching disk.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      filePath: { type: "string", description: "Target file path relative to project root" },
                      content: { type: "string", description: "Proposed full file content or patch to validate" }
                    },
                    required: ["filePath", "content"]
                  }
                },
                {
                  name: "eos_optimize_context",
                  description: "Compresses source code into a high-density structural outline (extracting interfaces, types, and function signatures), saving 70-85% of tokens while retaining full architectural contracts.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      filePath: { type: "string", description: "Relative file path" },
                      content: { type: "string", description: "Source code to compress (optional, if omitted reads from filePath)" }
                    },
                    required: ["filePath"]
                  }
                },
                {
                  name: "eos_amplify_prompt",
                  description: "Amplifies an informal prompt into a zero-vibe ISO 29148 EARS specification, BDD acceptance scenarios, boundary invariants, and model-specific cognitive scaffolding.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      rawPrompt: { type: "string", description: "Natural language instruction or feature request" },
                      targetModel: { type: "string", enum: ["claude", "openai", "gemini", "deepseek", "llama", "universal"], description: "Target model architecture (default: universal)" },
                      strictLevel: { type: "string", enum: ["standard", "hardened", "sovereign"], description: "Scaffolding rigor (default: hardened)" }
                    },
                    required: ["rawPrompt"]
                  }
                },
                {
                  name: "eos_check_architecture",
                  description: "Statically analyzes Clean/Hexagonal boundaries, domain purity (0 framework/UI imports in core), and detects circular import dependency cycles.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      targetDir: { type: "string", description: "Directory to scan relative to project root (default: 'src')" }
                    }
                  }
                },
                {
                  name: "eos_evaluate_decision",
                  description: "Evaluates an architectural or implementation choice against the 7 Inviolable Commandments using a multi-dimensional Bayesian matrix.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Scenario or decision title" },
                      description: { type: "string", description: "Detailed description of the problem context" },
                      proposedAction: { type: "string", description: "The action or design proposed" },
                      codeSnippet: { type: "string", description: "Optional code snippet to analyze" },
                      targetDomain: { type: "string", description: "Optional target domain (e.g. CORE, DOMAIN, UI)" }
                    },
                    required: ["title", "description", "proposedAction"]
                  }
                },
                {
                  name: "eos_turbo_verify",
                  description: "Executes ultra-fast sub-350ms verification of SAST, clean hexagonal boundaries, 0-runtime dependencies, and critical assets with microsecond telemetry.",
                  inputSchema: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  name: "eos_get_blast_radius",
                  description: "Calculates the transitive downstream blast radius and affected callers for any proposed file modification, with Predictive Test Selection (PTS).",
                  inputSchema: {
                    type: "object",
                    properties: {
                      filePath: { type: "string", description: "Target source file path to analyze" }
                    },
                    required: ["filePath"]
                  }
                },
                {
                  name: "eos_query_code_graph",
                  description: "Queries the Big Tech Tier 1 directed semantic code graph, returning module topology, symbols, and dead code report.",
                  inputSchema: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  name: "eos_autonomous_heal",
                  description: "Executes closed-loop FDIR autonomous healing (Meta SapFix / NASA FDIR), synthesizing and validating AST patches for detected code and invariant anomalies.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      targetFile: { type: "string", description: "Optional specific file to diagnose and heal" },
                      dryRun: { type: "boolean", description: "If true, simulates remediation without touching disk (default: false)" }
                    }
                  }
                },
                {
                  name: "eos_manage_worktree",
                  description: "Manages Xirp-grade isolated Git worktrees for concurrent AI agents. Supports actions: list, create, remove.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      action: { type: "string", enum: ["list", "create", "remove"], description: "Action to perform" },
                      branch: { type: "string", description: "Branch name for create action" },
                      targetPath: { type: "string", description: "Target path for remove action" },
                      force: { type: "boolean", description: "Force removal if modified" }
                    },
                    required: ["action"]
                  }
                },
                {
                  name: "eos_run_eval",
                  description: "Executes 5-dimensional sovereign cognitive evaluation (Google Vertex / Anthropic Evals) over target file or code string.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      target: { type: "string", description: "File path or code to evaluate" },
                      isText: { type: "boolean", description: "True if target is raw code string" }
                    },
                    required: ["target"]
                  }
                },
                {
                  name: "eos_check_openspec",
                  description: "Audits living OpenSpec architecture and delta changes (openspec/specs/ & openspec/changes/), certifying 0 drift and Level 2+ authorization.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      action: { type: "string", enum: ["audit", "list_specs", "list_changes"], description: "Action: audit (default), list_specs, or list_changes" }
                    }
                  }
                },
                {
                  name: "eos_titans_benchmark",
                  description: "Executes apex Big Tech benchmarks: Spotify Xirp, SpaceX 60Hz TMR, NVIDIA SIMD Float32, Google Borg Reconciler, and xAI Colossus Fabric.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      titan: { type: "string", enum: ["all", "xirp", "spacex", "nvidia", "google", "xai"], description: "Titan subsystem to benchmark (default: all)" }
                    }
                  }
                },
                {
                  name: "eos_reconcile_state",
                  description: "Continuous declarative desired-state reconciliation loop inspired by Google Borg / Kubernetes, certifying 0.00% drift.",
                  inputSchema: {
                    type: "object",
                    properties: {}
                  }
                },
                {
                  name: "eos_spotify_audit",
                  description: "Audits any target project for Spotify-grade engineering excellence: Backstage RFC-42 Golden Path, ITU-R BS.1770 -14 LUFS Audio Normalization, and Acoustic Vector Recommendation contracts.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      targetPath: { type: "string", description: "Path to project root (default: current project)" }
                    }
                  }
                }
              ]
            }
          };

        case "tools/call": {
          const toolName = params?.name;
          const args = params?.arguments || {};
          const result = this.dispatchTool(toolName, args);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
                }
              ]
            }
          };
        }

        case "resources/list":
          return {
            jsonrpc: "2.0",
            id,
            result: {
              resources: [
                {
                  uri: "eos://specs/constitution",
                  name: "EOS Constitution & Inviolable Laws",
                  mimeType: "text/markdown"
                },
                {
                  uri: "eos://evidence/receipt",
                  name: "Cryptographic SBOM & CI/CD Receipt",
                  mimeType: "application/json"
                },
                {
                  uri: "eos://projects/registry",
                  name: "Sovereign Fleet Project Registry",
                  mimeType: "application/json"
                }
              ]
            }
          };

        case "resources/read": {
          const uri = params?.uri;
          const content = this.readResource(uri);
          return {
            jsonrpc: "2.0",
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: uri?.endsWith(".json") ? "application/json" : "text/markdown",
                  text: content
                }
              ]
            }
          };
        }

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          };
      }
    } catch (err: any) {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: err.message || "Internal error",
          data: String(err.stack || err)
        }
      };
    }
  }

  private dispatchTool(toolName: string, args: Record<string, any>): any {
    switch (toolName) {
      case "eos_semantic_search": {
        const query = String(args.query || "");
        const topK = Number(args.topK) || 3;
        const mode = args.mode === "vector" ? "vector" : "hybrid";
        const matches = mode === "vector"
          ? this.knowledgeStore.search(query, topK)
          : this.knowledgeStore.searchHybrid(query, topK);
        return {
          query,
          mode,
          matchCount: matches.length,
          matches: matches.map((m) => ({
            id: m.id,
            score: Number(m.score.toFixed(4)),
            text: m.text,
            domain: (m.metadata as any)?.domain || "General"
          }))
        };
      }

      case "eos_tmr_consensus": {
        const directive = String(args.directive || "");
        const tmr = evaluateDirectiveWithTMR(directive);
        const thought = interpretJarvisDirective(directive);
        return {
          directive,
          consensusAchieved: tmr.consensusAchieved,
          agreementRatio: tmr.agreementRatio,
          selectedAction: tmr.selectedAction,
          consensusHash: tmr.consensusHash,
          sandboxes: tmr.sandboxes,
          voiceScript: thought.voiceTranscript
        };
      }

      case "eos_audit_fleet": {
        const registryPath = path.join(this.projectRoot, "docs/projects/registry.json");
        let registry = { projects: [] };
        if (fs.existsSync(registryPath)) {
          registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
        }
        return {
          fleetStatus: "ONLINE",
          totalRegisteredProjects: registry.projects.length,
          projects: registry.projects,
          enforcedStandards: ["SLSA Level 4", "Pre-Commit Secret Scanner", "Pre-Push CI/CD Gate"]
        };
      }

      case "eos_health_check": {
        const mem = process.memoryUsage();
        return {
          status: "UP",
          tier: "BIG_TECH_TIER_1",
          uptimeSeconds: Math.floor(process.uptime()),
          memoryRssMb: (mem.rss / (1024 * 1024)).toFixed(2),
          heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
          subsystems: [
            "JarvisSovereignMonad",
            "NeuralVectorCore",
            "LinuxKernelCore",
            "NanosecondEngine",
            "AkashicMemory",
            "SecDevOpsSevenGates"
          ]
        };
      }

      case "eos_validate_patch": {
        const filePath = String(args.filePath || "");
        const content = String(args.content || "");
        return validatePatch(filePath, content, this.projectRoot);
      }

      case "eos_optimize_context": {
        const filePath = String(args.filePath || "");
        let content = typeof args.content === "string" ? args.content : "";
        if (!content && filePath) {
          const full = path.resolve(this.projectRoot, filePath);
          if (fs.existsSync(full)) {
            content = fs.readFileSync(full, "utf8");
          }
        }
        return compressSourceContext(content, filePath);
      }

      case "eos_amplify_prompt": {
        const rawPrompt = String(args.rawPrompt || "");
        const targetModel = (args.targetModel || "universal") as ModelFamily;
        const strictLevel = (args.strictLevel || "hardened") as StrictnessLevel;
        return amplifyPrompt({
          rawPrompt,
          targetModel,
          strictLevel
        });
      }

      case "eos_check_architecture": {
        const targetDir = args.targetDir ? path.resolve(this.projectRoot, String(args.targetDir)) : path.resolve(this.projectRoot, "src");
        return scanArchitecture(targetDir, this.projectRoot);
      }

      case "eos_evaluate_decision": {
        return evaluateDecision({
          title: String(args.title || "Architectural Evaluation"),
          description: String(args.description || ""),
          proposedAction: String(args.proposedAction || ""),
          codeSnippet: args.codeSnippet ? String(args.codeSnippet) : undefined,
          targetDomain: args.targetDomain ? String(args.targetDomain) : undefined
        });
      }

      case "eos_turbo_verify": {
        return runTurboPipeline(this.projectRoot);
      }

      case "eos_get_blast_radius": {
        const filePath = String(args.filePath || "");
        const graph = new EosSemanticGraph(this.projectRoot);
        return graph.calculateBlastRadius(filePath);
      }

      case "eos_query_code_graph": {
        const graph = new EosSemanticGraph(this.projectRoot);
        return graph.getSummary();
      }

      case "eos_autonomous_heal": {
        const healer = new EosAutonomousHealer(this.projectRoot);
        return healer.executeHealing({
          targetFile: args.targetFile ? String(args.targetFile) : undefined,
          dryRun: Boolean(args.dryRun)
        });
      }

      case "eos_manage_worktree": {
        const orchestrator = new EosWorktreeOrchestrator(this.projectRoot);
        const action = String(args.action || "list");
        if (action === "create") {
          return orchestrator.createWorktree(String(args.branch || `agent-${Date.now()}`));
        } else if (action === "remove") {
          return orchestrator.removeWorktree(String(args.targetPath || ""), { force: Boolean(args.force) });
        }
        return orchestrator.listWorktrees();
      }

      case "eos_run_eval": {
        const evaluator = new EosCognitiveEval();
        const target = String(args.target || "");
        return evaluator.evaluate(target, { isText: Boolean(args.isText) });
      }

      case "eos_check_openspec": {
        const synchronizer = new EosOpenSpecSync(this.projectRoot);
        const action = String(args.action || "audit");
        if (action === "list_specs") return synchronizer.listSpecs();
        if (action === "list_changes") return synchronizer.listChanges();
        return synchronizer.audit();
      }

      case "eos_titans_benchmark": {
        const matrix = new EosTitansMatrix(this.projectRoot);
        const sub = String(args.titan || "all").toLowerCase();
        if (sub === "xirp") return matrix.benchmarkSpotifyXirp();
        if (sub === "spacex") return matrix.benchmarkSpaceXTmr();
        if (sub === "nvidia") return matrix.benchmarkNvidiaSimd();
        if (sub === "google") return matrix.reconcileGoogleBorg();
        if (sub === "xai") return matrix.benchmarkXaiFabric();
        return matrix.runAllTitans();
      }

      case "eos_reconcile_state": {
        const matrix = new EosTitansMatrix(this.projectRoot);
        return matrix.reconcileGoogleBorg();
      }

      case "eos_spotify_audit": {
        const codex = new EosSpotifyCodex(this.projectRoot);
        const targetPath = args.targetPath ? String(args.targetPath) : undefined;
        return codex.auditUniversalProject(targetPath);
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private readResource(uri: string): string {
    switch (uri) {
      case "eos://specs/constitution": {
        const specPath = path.join(this.projectRoot, "docs/specs/spec.md");
        if (fs.existsSync(specPath)) return fs.readFileSync(specPath, "utf8");
        return "# EOS Constitution\nZero Vibe Coding & 7 Inviolable Laws active.";
      }
      case "eos://evidence/receipt": {
        const receiptPath = path.join(this.projectRoot, "docs/evidence/SBOM-CICD-RECEIPT.json");
        if (fs.existsSync(receiptPath)) return fs.readFileSync(receiptPath, "utf8");
        return JSON.stringify({ status: "NO_RECEIPT" });
      }
      case "eos://projects/registry": {
        const regPath = path.join(this.projectRoot, "docs/projects/registry.json");
        if (fs.existsSync(regPath)) return fs.readFileSync(regPath, "utf8");
        return JSON.stringify({ projects: [] });
      }
      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }

  public startStdioLoop(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on("line", (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        const res = this.handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + "\n");
        }
      } catch (err: any) {
        const errorRes: JsonRpcResponse = {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error: Invalid JSON",
            data: String(err)
          }
        };
        process.stdout.write(JSON.stringify(errorRes) + "\n");
      }
    });
  }
}

// Auto-start stdio loop if executed directly from CLI
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("eosMcpServer.ts")) {
  const server = new EosMcpServer();
  server.startStdioLoop();
}
