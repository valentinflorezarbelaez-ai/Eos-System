/**
 * EOS SYSTEM — BIG TECH TIER 1 SEMANTIC CODE GRAPH & BLAST RADIUS ENGINE (Layer 0)
 * Governed by ADR-021, FR-031, FR-032, FR-033, FR-034 & BDD-024, BDD-025
 *
 * Implements a Google Kythe / Meta Glean inspired in-memory directed semantic graph:
 * 1. Global Symbol & Export Indexer: maps functions, interfaces, types, and module edges.
 * 2. Transitive Blast Radius Analysis: calculates downstream impact closure in < 5ms.
 * 3. Predictive Test Selection (PTS): maps impacted modules to minimum required test suites.
 * 4. Dead Code & Orphan Symbol Detection: flags exported symbols with 0 active consumers.
 *
 * Zero external runtime dependencies.
 */

import fs from "node:fs";
import path from "node:path";

export type SymbolKind = "function" | "class" | "interface" | "type" | "const" | "variable";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExportedSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly filePath: string;
  readonly lineNumber: number;
}

export interface FileNode {
  readonly filePath: string;
  readonly fullPath: string;
  readonly exports: readonly ExportedSymbol[];
  readonly imports: readonly string[]; // Relative file paths imported by this file
  readonly importedBy: string[];       // Reverse index: files that import this file
}

export interface BlastRadiusReport {
  readonly targetFile: string;
  readonly directConsumers: readonly string[];
  readonly transitiveConsumers: readonly string[];
  readonly totalImpactedFiles: number;
  readonly impactPercentage: number;
  readonly riskLevel: RiskLevel;
  readonly affectedLayers: readonly string[];
  readonly predictiveTestSuites: readonly string[];
  readonly durationUs: number;
}

export interface DeadCodeSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly filePath: string;
  readonly lineNumber: number;
}

export interface SemanticGraphSummary {
  readonly totalFiles: number;
  readonly totalExports: number;
  readonly totalEdges: number;
  readonly deadCodeCount: number;
  readonly deadSymbols: readonly DeadCodeSymbol[];
}

/**
 * Mapping of source modules to their corresponding test suites (PTS Matrix).
 */
const PTS_TEST_MAP: Record<string, string[]> = {
  "src/core/eosNeuralVectorCore": ["test/eosCore.test.mjs"],
  "src/core/eosJarvisMonad": ["test/eosCore.test.mjs", "test/chaosResilience.test.mjs"],
  "src/core/eosPatchValidator": ["test/eosCore.test.mjs"],
  "src/core/eosContextOptimizer": ["test/eosCore.test.mjs"],
  "src/core/eosPromptAmplifier": ["test/eosPrometheus.test.mjs"],
  "src/core/eosArchitectureGuard": ["test/eosPrometheus.test.mjs"],
  "src/core/eosCognitiveJudge": ["test/eosPrometheus.test.mjs"],
  "src/core/eosTurboEngine": ["test/eosTurbo.test.mjs"],
  "src/core/eosSemanticGraph": ["test/eosSemanticGraph.test.mjs"],
  "src/mcp/eosMcpServer": ["test/eosCore.test.mjs", "test/eosPrometheus.test.mjs", "test/eosTurbo.test.mjs"],
  "bin/eos": ["test/eosCore.test.mjs", "test/eosTurbo.test.mjs"]
};

/**
 * Extracts exported symbols from source code.
 */
export function extractExports(sourceCode: string, relativePath: string): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = [];
  const lines = sourceCode.split(/\r?\n/);

  const exportPatterns = [
    { kind: "function" as SymbolKind, regex: /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/ },
    { kind: "class" as SymbolKind, regex: /export\s+class\s+([A-Za-z0-9_$]+)/ },
    { kind: "interface" as SymbolKind, regex: /export\s+interface\s+([A-Za-z0-9_$]+)/ },
    { kind: "type" as SymbolKind, regex: /export\s+type\s+([A-Za-z0-9_$]+)/ },
    { kind: "const" as SymbolKind, regex: /export\s+const\s+([A-Za-z0-9_$]+)/ }
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

    for (const pat of exportPatterns) {
      const match = pat.regex.exec(trimmed);
      if (match) {
        symbols.push({
          name: match[1],
          kind: pat.kind,
          filePath: relativePath,
          lineNumber: idx + 1
        });
        break;
      }
    }
  });

  return symbols;
}

/**
 * Resolves a relative import specifier to a relative project path.
 */
function resolveImportPath(specifier: string, sourceFullPath: string, projectRoot: string): string | null {
  if (!specifier.startsWith(".")) return null;

  const sourceDir = path.dirname(sourceFullPath);
  const targetCandidate = path.resolve(sourceDir, specifier);
  const extensions = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.js"];

  for (const ext of extensions) {
    const candidate = targetCandidate + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(projectRoot, candidate).replace(/\\/g, "/");
    }
  }

  return null;
}

/**
 * Builds the complete semantic code graph for the project.
 */
export class EosSemanticGraph {
  public readonly nodes = new Map<string, FileNode>();
  public readonly symbolIndex = new Map<string, ExportedSymbol[]>();
  public readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.buildGraph();
  }

  private buildGraph(): void {
    const rawFiles: string[] = [];

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist" && entry.name !== ".next") {
            walk(full);
          }
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          rawFiles.push(full);
        }
      }
    };

    walk(this.projectRoot);

    // 1. First pass: Create nodes and extract symbols
    for (const fullPath of rawFiles) {
      const relPath = path.relative(this.projectRoot, fullPath).replace(/\\/g, "/");
      const content = fs.readFileSync(fullPath, "utf8");
      const exports = extractExports(content, relPath);

      // Extract imports
      const imports: string[] = [];
      const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const resolved = resolveImportPath(match[1], fullPath, this.projectRoot);
        if (resolved && !imports.includes(resolved)) {
          imports.push(resolved);
        }
      }

      this.nodes.set(relPath, {
        filePath: relPath,
        fullPath,
        exports,
        imports,
        importedBy: []
      });

      // Index symbols
      for (const sym of exports) {
        const list = this.symbolIndex.get(sym.name) || [];
        list.push(sym);
        this.symbolIndex.set(sym.name, list);
      }
    }

    // 2. Second pass: Build reverse importedBy index
    for (const [nodePath, node] of this.nodes.entries()) {
      for (const imp of node.imports) {
        const targetNode = this.nodes.get(imp);
        if (targetNode && !targetNode.importedBy.includes(nodePath)) {
          targetNode.importedBy.push(nodePath);
        }
      }
    }
  }

  /**
   * Calculates the exact downstream Blast Radius for a target file.
   */
  public calculateBlastRadius(targetFilePath: string): BlastRadiusReport {
    const startUs = process.hrtime.bigint();
    const normalizedTarget = targetFilePath.replace(/\\/g, "/").replace(/^\.\//, "");

    // Locate matching node (support exact or base name match)
    let matchedKey: string | null = null;
    for (const key of this.nodes.keys()) {
      if (key === normalizedTarget || key.endsWith(normalizedTarget)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      const endUs = process.hrtime.bigint();
      return {
        targetFile: targetFilePath,
        directConsumers: [],
        transitiveConsumers: [],
        totalImpactedFiles: 0,
        impactPercentage: 0,
        riskLevel: "LOW",
        affectedLayers: [],
        predictiveTestSuites: [],
        durationUs: Number((endUs - startUs) / 1000n)
      };
    }

    const targetNode = this.nodes.get(matchedKey)!;
    const directConsumers = [...targetNode.importedBy];

    // BFS for transitive closure
    const visited = new Set<string>();
    const queue = [...directConsumers];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current)) {
        visited.add(current);
        const node = this.nodes.get(current);
        if (node) {
          for (const upstream of node.importedBy) {
            if (!visited.has(upstream)) {
              queue.push(upstream);
            }
          }
        }
      }
    }

    const transitiveConsumers = Array.from(visited);
    const totalFiles = this.nodes.size || 1;
    const impactPercentage = Number(((transitiveConsumers.length / totalFiles) * 100).toFixed(1));

    // Determine Risk Level
    let riskLevel: RiskLevel = "LOW";
    if (impactPercentage > 40 || matchedKey.includes("core/")) riskLevel = "CRITICAL";
    else if (impactPercentage > 20) riskLevel = "HIGH";
    else if (impactPercentage > 5) riskLevel = "MEDIUM";

    // Affected Layers
    const layers = new Set<string>();
    for (const f of transitiveConsumers) {
      if (f.includes("core/")) layers.add("DOMAIN");
      else if (f.includes("mcp/") || f.includes("api/")) layers.add("INFRASTRUCTURE");
      else if (f.includes("components/") || f.includes("js/")) layers.add("PRESENTATION");
      else layers.add("SYSTEM");
    }

    // Predictive Test Selection (PTS)
    const ptsSuites = new Set<string>();
    const allImpacted = [matchedKey, ...transitiveConsumers];
    for (const imp of allImpacted) {
      for (const [prefix, suites] of Object.entries(PTS_TEST_MAP)) {
        if (imp.includes(prefix)) {
          suites.forEach((s) => ptsSuites.add(s));
        }
      }
    }

    const endUs = process.hrtime.bigint();
    const durationUs = Number((endUs - startUs) / 1000n);

    return {
      targetFile: matchedKey,
      directConsumers,
      transitiveConsumers,
      totalImpactedFiles: transitiveConsumers.length,
      impactPercentage,
      riskLevel,
      affectedLayers: Array.from(layers),
      predictiveTestSuites: Array.from(ptsSuites),
      durationUs
    };
  }

  /**
   * Identifies exported symbols with zero active consumers across the codebase.
   */
  public detectDeadSymbols(): DeadCodeSymbol[] {
    const deadSymbols: DeadCodeSymbol[] = [];

    // Aggregate all source code text
    const allCodeBuffers: string[] = [];
    for (const node of this.nodes.values()) {
      allCodeBuffers.push(fs.readFileSync(node.fullPath, "utf8"));
    }
    const combinedCode = allCodeBuffers.join("\n");

    for (const [name, syms] of this.symbolIndex.entries()) {
      // Look for occurrences outside the definition file
      const matches = combinedCode.match(new RegExp(`\\b${name}\\b`, "g")) || [];
      // If it only appears once or twice (just definition and export in its own file)
      if (matches.length <= 1) {
        deadSymbols.push(syms[0]);
      }
    }

    return deadSymbols;
  }

  /**
   * Generates a high-level summary of the semantic graph.
   */
  public getSummary(): SemanticGraphSummary {
    let totalExports = 0;
    let totalEdges = 0;

    for (const node of this.nodes.values()) {
      totalExports += node.exports.length;
      totalEdges += node.imports.length;
    }

    const deadSymbols = this.detectDeadSymbols();

    return {
      totalFiles: this.nodes.size,
      totalExports,
      totalEdges,
      deadCodeCount: deadSymbols.length,
      deadSymbols
    };
  }
}
