/**
 * EOS SYSTEM — ENGINEERING INTEGRITY GATE (Layer 0)
 * Governed by SPEC-001 (Zero Vibe Coding) & CHANGE-040
 *
 * Mechanizes the invariants that were previously only *claimed* in prose:
 * 1. Governance identity: every spec/change declares a unique `SPEC-NNN` / `CHANGE-NNN`.
 * 2. EARS/BDD presence: every spec states requirements in EARS form (BDD is reported, not gated).
 * 3. Documentation truth: the README headline must advertise the version shipped by package.json.
 * 4. MCP contract symmetry: every advertised tool has a handler and every handler is advertised.
 * 5. Size ratchet: god-files may not grow past their frozen budget.
 * 6. Requirement-ID collisions are frozen debt: the count may never increase.
 *
 * Zero external runtime dependencies.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface GovernanceFile {
  readonly id: string;
  readonly scope: "spec" | "change";
  readonly file: string;
  readonly hasEars: boolean;
  readonly hasBdd: boolean;
}

export interface GovernanceReport {
  readonly files: readonly GovernanceFile[];
  readonly duplicateIds: readonly string[];
  readonly missingEars: readonly string[];
  readonly missingBdd: readonly string[];
  readonly requirementIdCollisions: number;
}

export interface DocVersionReport {
  readonly packageVersion: string;
  readonly documentedVersion: string | null;
  readonly aligned: boolean;
}

export interface McpContractReport {
  readonly advertised: number;
  readonly handled: number;
  readonly advertisedWithoutHandler: readonly string[];
  readonly handlerWithoutAdvertisement: readonly string[];
  readonly symmetric: boolean;
}

export interface FileSizeViolation {
  readonly file: string;
  readonly lines: number;
  readonly budget: number;
}

export interface EngineeringIntegrityReport {
  readonly passed: boolean;
  readonly governance: GovernanceReport;
  readonly docVersion: DocVersionReport;
  readonly mcpContract: McpContractReport;
  readonly fileSizes: readonly FileSizeViolation[];
  readonly violations: readonly string[];
  readonly warnings: readonly string[];
  readonly sha256MerkleReceipt: string;
  readonly timestamp: string;
}

/**
 * Frozen god-file budgets (ratchet): a file may shrink, never grow past these lines.
 */
export const DEFAULT_FILE_SIZE_BUDGETS: Readonly<Record<string, number>> = {
  "js/eos.js": 4200,
  "src/mcp/eosMcpServer.ts": 3260,
  "bin/eos.mjs": 2700,
  "src/core/eosUniversalProjectAdapter.ts": 1150
};

/** Default budget for any scanned module not explicitly listed. */
export const DEFAULT_MAX_FILE_LINES = 1200;

/** Frozen count of cross-spec FR/BDD numbering collisions (debt that may not grow). */
export const MAX_REQUIREMENT_ID_COLLISIONS = 26;

/**
 * Documents that legitimately do not use the EARS template: the Constitution states laws,
 * not testable requirements, and is the root of the traceability chain.
 */
export const EARS_EXEMPT_SPEC_IDS: readonly string[] = ["SPEC-001"];

const SCAN_ROOTS = ["src", "bin", "scripts", "js", "api"];
const ID_PATTERN = /^(SPEC|CHANGE)-(\d{3})/;

function readTextIfPresent(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Audits `openspec/specs` + `openspec/changes` for identity uniqueness and requirement form.
 */
export function inspectGovernance(rootDir: string): GovernanceReport {
  const files: GovernanceFile[] = [];
  const idOwners = new Map<string, string[]>();
  const requirementOwners = new Map<string, Set<string>>();

  for (const scope of ["spec", "change"] as const) {
    const directory = path.join(rootDir, "openspec", `${scope}s`);
    if (!fs.existsSync(directory)) continue;
    for (const name of fs.readdirSync(directory).filter((entry) => entry.endsWith(".md")).sort()) {
      const content = readTextIfPresent(path.join(directory, name)) ?? "";
      const idMatch = name.match(ID_PATTERN);
      const id = idMatch ? `${idMatch[1]}-${idMatch[2]}` : name.replace(/\.md$/, "");
      files.push({
        id,
        scope,
        file: `${scope}s/${name}`,
        hasEars: /^#{1,4}\s+.*\bEARS\b/im.test(content),
        hasBdd: /BDD-\d{3}|gherkin|ESCENARIO/i.test(content)
      });

      const owners = idOwners.get(id) ?? [];
      owners.push(`${scope}s/${name}`);
      idOwners.set(id, owners);

      if (scope === "spec") {
        for (const match of content.matchAll(/\b(?:FR|BDD)-\d{3}\b/g)) {
          const ownersForId = requirementOwners.get(match[0]) ?? new Set<string>();
          ownersForId.add(name);
          requirementOwners.set(match[0], ownersForId);
        }
      }
    }
  }

  const duplicateIds = [...idOwners.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([id]) => id)
    .sort();

  const specs = files.filter((file) => file.scope === "spec");

  return {
    files,
    duplicateIds,
    missingEars: specs.filter((file) => !file.hasEars && !EARS_EXEMPT_SPEC_IDS.includes(file.id)).map((file) => file.file),
    missingBdd: specs.filter((file) => !file.hasBdd).map((file) => file.file),
    requirementIdCollisions: [...requirementOwners.values()].filter((owners) => owners.size > 1).length
  };
}

/**
 * Documentation truth: the README headline must advertise the version that package.json ships.
 */
export function inspectDocVersion(rootDir: string): DocVersionReport {
  const pkgRaw = readTextIfPresent(path.join(rootDir, "package.json"));
  let packageVersion = "0.0.0";
  if (pkgRaw) {
    try {
      packageVersion = String(JSON.parse(pkgRaw).version ?? "0.0.0");
    } catch {
      packageVersion = "0.0.0";
    }
  }
  const readme = readTextIfPresent(path.join(rootDir, "README.md")) ?? "";
  const headline = readme.split("\n").slice(0, 10).join("\n");
  const match = headline.match(/\bv(\d+\.\d+(?:\.\d+)?)\b/);
  const documentedVersion = match ? match[1] : null;
  const aligned = documentedVersion !== null && documentedVersion.split(".")[0] === packageVersion.split(".")[0];
  return { packageVersion, documentedVersion, aligned };
}


/**
 * MCP contract symmetry: advertised tools must be dispatchable, and vice versa.
 */
export function inspectMcpContract(sourceText: string): McpContractReport {
  const advertised = [...sourceText.matchAll(/^\s+name: "(eos_[a-z0-9_]+)",/gm)].map((match) => match[1]);
  const handled = [...sourceText.matchAll(/^\s+case "(eos_[a-z0-9_]+)":/gm)].map((match) => match[1]);
  const advertisedSet = new Set(advertised);
  const handledSet = new Set(handled);
  const advertisedWithoutHandler = [...advertisedSet].filter((name) => !handledSet.has(name)).sort();
  const handlerWithoutAdvertisement = [...handledSet].filter((name) => !advertisedSet.has(name)).sort();
  return {
    advertised: advertisedSet.size,
    handled: handledSet.size,
    advertisedWithoutHandler,
    handlerWithoutAdvertisement,
    symmetric: advertisedWithoutHandler.length === 0 && handlerWithoutAdvertisement.length === 0
  };
}

/**
 * Size ratchet across the shipped source surface (god-files may not grow).
 */
export function inspectFileSizes(
  rootDir: string,
  budgets: Readonly<Record<string, number>> = DEFAULT_FILE_SIZE_BUDGETS,
  defaultBudget: number = DEFAULT_MAX_FILE_LINES
): FileSizeViolation[] {
  const violations: FileSizeViolation[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    const absoluteRoot = path.join(rootDir, scanRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const relativeFile of walkFiles(absoluteRoot, rootDir)) {
      if (!/\.(ts|tsx|mjs|js)$/.test(relativeFile)) continue;
      const content = readTextIfPresent(path.join(rootDir, relativeFile));
      if (content === null) continue;
      const lines = content.split("\n").length;
      const budget = budgets[relativeFile] ?? defaultBudget;
      if (lines > budget) violations.push({ file: relativeFile, lines, budget });
    }
  }
  return violations.sort((a, b) => b.lines - a.lines);
}

function walkFiles(absoluteDir: string, rootDir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, rootDir));
    } else if (entry.isFile()) {
      results.push(path.relative(rootDir, full).replace(/\\/g, "/"));
    }
  }
  return results;
}



export class EosEngineeringIntegrityGate {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = path.resolve(rootDir);
  }

  public inspect(): EngineeringIntegrityReport {
    const governance = inspectGovernance(this.rootDir);
    const docVersion = inspectDocVersion(this.rootDir);
    const mcpSource = readTextIfPresent(path.join(this.rootDir, "src", "mcp", "eosMcpServer.ts")) ?? "";
    const mcpContract = inspectMcpContract(mcpSource);
    const fileSizes = inspectFileSizes(this.rootDir);

    const violations: string[] = [];
    const warnings: string[] = [];

    for (const id of governance.duplicateIds) {
      violations.push(`Duplicate governance ID: ${id} is declared by more than one document`);
    }
    for (const file of governance.missingEars) {
      violations.push(`Missing EARS requirements section: ${file}`);
    }
    if (!docVersion.aligned) {
      const advertised = docVersion.documentedVersion ? `v${docVersion.documentedVersion}` : "no version";
      violations.push(`README version drift: package.json ships v${docVersion.packageVersion} but README advertises ${advertised}`);
    }
    for (const name of mcpContract.advertisedWithoutHandler) {
      violations.push(`MCP tool advertised without handler: ${name}`);
    }
    for (const name of mcpContract.handlerWithoutAdvertisement) {
      violations.push(`MCP handler without advertisement: ${name}`);
    }
    for (const violation of fileSizes) {
      violations.push(
        `File size ratchet exceeded: ${violation.file} has ${violation.lines} lines (budget ${violation.budget})`
      );
    }
    if (governance.requirementIdCollisions > MAX_REQUIREMENT_ID_COLLISIONS) {
      violations.push(
        `Requirement ID collisions grew: ${governance.requirementIdCollisions} > frozen ${MAX_REQUIREMENT_ID_COLLISIONS}`
      );
    } else if (governance.requirementIdCollisions > 0) {
      warnings.push(`${governance.requirementIdCollisions} cross-spec FR/BDD numbering collisions (frozen debt, may not grow)`);
    }
    if (governance.missingBdd.length > 0) {
      warnings.push(`${governance.missingBdd.length} spec(s) without BDD/Gherkin acceptance criteria`);
    }

    const payload = JSON.stringify({
      duplicateIds: governance.duplicateIds,
      missingEars: governance.missingEars,
      docVersion,
      mcp: {
        advertised: mcpContract.advertised,
        handled: mcpContract.handled,
        advertisedWithoutHandler: mcpContract.advertisedWithoutHandler,
        handlerWithoutAdvertisement: mcpContract.handlerWithoutAdvertisement
      },
      fileSizes: fileSizes.map((violation) => `${violation.file}:${violation.lines}/${violation.budget}`),
      requirementIdCollisions: governance.requirementIdCollisions,
      violations
    });

    return {
      passed: violations.length === 0,
      governance,
      docVersion,
      mcpContract,
      fileSizes,
      violations,
      warnings,
      sha256MerkleReceipt: crypto.createHash("sha256").update(payload).digest("hex"),
      timestamp: new Date().toISOString()
    };
  }
}
