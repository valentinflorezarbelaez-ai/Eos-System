/**
 * EOS SYSTEM — UNIVERSAL POLYGLOT REPOSITORY ADAPTER (Layer 0)
 * Governed by ADR-030, SPEC-019 & BDD-049
 *
 * Provides universal architectural intelligence for ANY software repository
 * across 20+ languages and frameworks (TypeScript, Go, Rust, Python, Flutter, Java, C/C++):
 * 1. Deep polyglot stack fingerprinting (language, package manager, test framework, container, CI/CD).
 * 2. 5-Pillar Architectural Health Index (Layer Purity, Test Infra, Secret Security, CI/CD, AI Context).
 * 3. Stack-tailored Golden Path synthesis (Backstage RFC-42 catalog, CI workflows, AGENTS.md context).
 * 4. Safe dry-run evaluation with zero-mutation guarantee and immutable SHA-256 Merkle receipts.
 *
 * Zero external runtime dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export type PolyglotLanguage =
  | "typescript"
  | "javascript"
  | "go"
  | "rust"
  | "python"
  | "flutter_dart"
  | "java_kotlin"
  | "cpp_c"
  | "csharp"
  | "ruby"
  | "php"
  | "elixir"
  | "unknown";

export type PackageManager =
  | "npm"
  | "pnpm"
  | "yarn"
  | "bun"
  | "go_mod"
  | "cargo"
  | "pip"
  | "poetry"
  | "uv"
  | "pub"
  | "maven"
  | "gradle"
  | "cmake"
  | "nuget"
  | "bundler"
  | "composer"
  | "mix"
  | "none";

export type TestFramework =
  | "node_test"
  | "jest"
  | "vitest"
  | "mocha"
  | "go_test"
  | "cargo_test"
  | "pytest"
  | "unittest"
  | "flutter_test"
  | "junit"
  | "ctest"
  | "xunit"
  | "rspec"
  | "none";

export type ContainerPlatform =
  | "dockerfile"
  | "compose"
  | "distroless"
  | "devcontainer"
  | "none";

export type CiCdPlatform =
  | "github_actions"
  | "gitlab_ci"
  | "circle_ci"
  | "jenkins"
  | "bitbucket"
  | "none";

export interface PillarEvaluation {
  readonly name: string;
  readonly score: number; // 0 to 20
  readonly maxScore: number;
  readonly status: "EXCELLENT" | "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "CRITICAL";
  readonly findings: readonly string[];
}

export interface PolyglotFingerprint {
  readonly primaryLanguage: PolyglotLanguage;
  readonly languagesDetected: readonly PolyglotLanguage[];
  readonly packageManager: PackageManager;
  readonly testFramework: TestFramework;
  readonly containerization: ContainerPlatform;
  readonly ciCd: CiCdPlatform;
  readonly hasAgentScaffolding: boolean;
  readonly hasBackstageDescriptor: boolean;
  readonly totalSourceFiles: number;
  readonly linter: string;
  readonly structureArchetype: "MONOREPO" | "STANDARD_SERVICE" | "MODULAR_LIBRARY" | "EMBEDDED_MINIMAL";
}

export interface PolyglotAuditReport {
  readonly projectPath: string;
  readonly projectName: string;
  readonly fingerprint: PolyglotFingerprint;
  readonly pillars: {
    readonly layerPurity: PillarEvaluation;
    readonly testInfrastructure: PillarEvaluation;
    readonly secretSecurity: PillarEvaluation;
    readonly ciCdGateways: PillarEvaluation;
    readonly aiScaffolding: PillarEvaluation;
  };
  readonly healthIndex: number; // 0 - 100
  readonly tier: "TIER_1_SOVEREIGN" | "TIER_2_PRODUCTION" | "TIER_3_DEVELOPMENT" | "TIER_4_LEGACY";
  readonly recommendations: readonly string[];
  readonly sha256MerkleReceipt: string;
  readonly timestamp: string;
}

export interface ElevateOptions {
  readonly dryRun?: boolean;
  readonly ownerSquad?: string;
  readonly systemName?: string;
}

export interface ScaffoldedFile {
  readonly path: string;
  readonly description: string;
  readonly content: string;
}

export interface ElevateResult {
  readonly dryRun: boolean;
  readonly filesScaffolded: readonly ScaffoldedFile[];
  readonly appliedActions: readonly string[];
  readonly message: string;
  readonly sha256Proof: string;
}

/** Source-extension index used for weighted polyglot detection (SPEC-019). */
const EXTENSION_TO_LANGUAGE: Readonly<Record<string, PolyglotLanguage>> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".go": "go",
  ".rs": "rust",
  ".py": "python",
  ".pyi": "python",
  ".dart": "flutter_dart",
  ".java": "java_kotlin",
  ".kt": "java_kotlin",
  ".kts": "java_kotlin",
  ".c": "cpp_c",
  ".h": "cpp_c",
  ".cc": "cpp_c",
  ".cpp": "cpp_c",
  ".cxx": "cpp_c",
  ".hpp": "cpp_c",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".ex": "elixir",
  ".exs": "elixir"
};

/** Deterministic tie-breaker order for languages with identical weight. */
const LANGUAGE_PRIORITY: readonly PolyglotLanguage[] = [
  "typescript",
  "javascript",
  "go",
  "rust",
  "python",
  "java_kotlin",
  "cpp_c",
  "csharp",
  "flutter_dart",
  "ruby",
  "php",
  "elixir",
  "unknown"
];

/** Baseline weight granted by an explicit build manifest (equivalent to 4 real source files). */
const MANIFEST_LANGUAGE_WEIGHT = 4;

export class EosUniversalProjectAdapter {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = path.resolve(rootDir);
  }

  /**
   * Performs an exhaustive non-invasive architectural audit of the target repository.
   */
  public audit(targetPath?: string): PolyglotAuditReport {
    const resolvedPath = path.resolve(targetPath || this.rootDir);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Target path does not exist: ${resolvedPath}`);
    }

    const projectName = this.deriveProjectName(resolvedPath);
    const files = this.scanDir(resolvedPath, 3);
    const fingerprint = this.fingerprintRepo(resolvedPath, files);

    // Pillar 1: Layer Purity & Architecture
    const layerPurity = this.evaluateLayerPurity(resolvedPath, files, fingerprint);

    // Pillar 2: Test Infrastructure
    const testInfrastructure = this.evaluateTestInfrastructure(resolvedPath, files, fingerprint);

    // Pillar 3: Secret Security
    const secretSecurity = this.evaluateSecretSecurity(resolvedPath, files);

    // Pillar 4: CI/CD Gateways
    const ciCdGateways = this.evaluateCiCdGateways(resolvedPath, files);

    // Pillar 5: AI Context & Golden Path
    const aiScaffolding = this.evaluateAiScaffolding(resolvedPath, files);

    const healthIndex = Math.min(
      100,
      layerPurity.score +
        testInfrastructure.score +
        secretSecurity.score +
        ciCdGateways.score +
        aiScaffolding.score
    );

    let tier: PolyglotAuditReport["tier"] = "TIER_4_LEGACY";
    if (healthIndex >= 90) tier = "TIER_1_SOVEREIGN";
    else if (healthIndex >= 75) tier = "TIER_2_PRODUCTION";
    else if (healthIndex >= 50) tier = "TIER_3_DEVELOPMENT";

    const recommendations: string[] = [];
    if (layerPurity.score < 15) recommendations.push(...layerPurity.findings);
    if (testInfrastructure.score < 15) recommendations.push(...testInfrastructure.findings);
    if (secretSecurity.score < 15) recommendations.push(...secretSecurity.findings);
    if (ciCdGateways.score < 15) recommendations.push(...ciCdGateways.findings);
    if (aiScaffolding.score < 15) recommendations.push(...aiScaffolding.findings);

    const payload = JSON.stringify({
      resolvedPath,
      projectName,
      fingerprint,
      healthIndex,
      tier,
      scores: [
        layerPurity.score,
        testInfrastructure.score,
        secretSecurity.score,
        ciCdGateways.score,
        aiScaffolding.score
      ]
    });
    const sha256MerkleReceipt = crypto.createHash("sha256").update(payload).digest("hex");

    return {
      projectPath: resolvedPath,
      projectName,
      fingerprint,
      pillars: {
        layerPurity,
        testInfrastructure,
        secretSecurity,
        ciCdGateways,
        aiScaffolding
      },
      healthIndex,
      tier,
      recommendations,
      sha256MerkleReceipt,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Returns the polyglot stack fingerprint for the target repository.
   */
  public fingerprint(targetPath?: string): PolyglotFingerprint {
    const resolvedPath = path.resolve(targetPath || this.rootDir);
    const files = this.scanDir(resolvedPath, 3);
    return this.fingerprintRepo(resolvedPath, files);
  }

  /**
   * Synthesizes Golden Path assets in dry-run mode.
   */
  public synthesizeGoldenPath(options: ElevateOptions = {}): ElevateResult {
    return this.elevate(this.rootDir, { ...options, dryRun: true });
  }

  /**
   * Applies synthesized Golden Path assets directly to disk.
   */
  public applyGoldenPathToDisk(options: ElevateOptions = {}): ElevateResult {
    return this.elevate(this.rootDir, { ...options, dryRun: false });
  }

  /**
   * Scaffolds standardized Golden Path assets (Backstage catalog, CI workflow, AGENTS.md, pre-commit).
   * Safe dry-run by default.
   */
  public elevate(targetPath?: string, options: ElevateOptions = {}): ElevateResult {
    const dryRun = options.dryRun !== false; // Default true
    const resolvedPath = path.resolve(targetPath || this.rootDir);
    const audit = this.audit(resolvedPath);

    const filesToScaffold: ScaffoldedFile[] = [];

    // 1. Backstage catalog-info.yaml
    const catalogPath = path.join(resolvedPath, "catalog-info.yaml");
    if (!fs.existsSync(catalogPath)) {
      filesToScaffold.push({
        path: "catalog-info.yaml",
        description: "Spotify Backstage RFC-42 Software Catalog Descriptor",
        content: this.synthesizeCatalogInfo(audit.projectName, audit.fingerprint, options)
      });
    }

    // 2. CI Workflow (.github/workflows/ci.yml)
    const ciPath = path.join(resolvedPath, ".github", "workflows", "ci.yml");
    if (!fs.existsSync(ciPath)) {
      filesToScaffold.push({
        path: ".github/workflows/ci.yml",
        description: `GitHub Actions CI Gate tailored for ${audit.fingerprint.primaryLanguage}`,
        content: this.synthesizeCiWorkflow(audit.projectName, audit.fingerprint)
      });
    }

    // 3. AGENTS.md / CLAUDE.md
    const agentsPath = path.join(resolvedPath, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) {
      filesToScaffold.push({
        path: "AGENTS.md",
        description: "AI Agent Context Matrix with the 4 Fundamental Laws of Engineering",
        content: this.synthesizeAgentsContext(audit.projectName, audit.fingerprint)
      });
    }

    // 4. Pre-commit secret scanning hook
    const hookPath = path.join(resolvedPath, ".githooks", "pre-commit");
    if (!fs.existsSync(hookPath)) {
      filesToScaffold.push({
        path: ".githooks/pre-commit",
        description: "Pre-commit Zero Plaintext Secrets Enforcement Hook",
        content: this.synthesizePreCommitHook()
      });
    }

    if (!dryRun) {
      for (const item of filesToScaffold) {
        const full = path.join(resolvedPath, item.path);
        const parent = path.dirname(full);
        if (!fs.existsSync(parent)) {
          fs.mkdirSync(parent, { recursive: true });
        }
        fs.writeFileSync(full, item.content, "utf8");
      }
    }

    const proof = crypto
      .createHash("sha256")
      .update(JSON.stringify({ resolvedPath, dryRun, count: filesToScaffold.length }))
      .digest("hex");

    return {
      dryRun,
      filesScaffolded: filesToScaffold,
      appliedActions: filesToScaffold.map((f) => f.path),
      message: dryRun
        ? `[DRY-RUN] ${filesToScaffold.length} Golden Path artifacts prepared for synthesis with zero disk mutations.`
        : `[APPLIED] Successfully scaffolded ${filesToScaffold.length} Golden Path artifacts in ${resolvedPath}.`,
      sha256Proof: proof
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPER ENGINES
  // ---------------------------------------------------------------------------

  /**
   * Resolves the canonical repository identity from the repository manifests themselves,
   * in strict priority order (Backstage descriptor -> package.json -> go.mod -> Cargo.toml
   * -> pyproject.toml -> pubspec.yaml -> pom.xml -> build.gradle) and only falls back to the
   * checkout directory name when no manifest declares an identity.
   *
   * Manifest-first resolution keeps reports deterministic and reproducible across CI runners,
   * ephemeral sandboxes (/workspace, /tmp/...) and local clones with arbitrary folder names.
   */
  private deriveProjectName(baseDir: string): string {
    // 1. Backstage catalog descriptor: metadata.name (canonical software identity).
    const catalog = this.readTextFile(path.join(baseDir, "catalog-info.yaml"));
    if (catalog) {
      const catalogName = this.extractYamlBlockScalar(catalog, "metadata", "name");
      if (catalogName) return catalogName;
    }

    // 2. Node.js / TypeScript: package.json "name".
    const pkgRaw = this.readTextFile(path.join(baseDir, "package.json"));
    if (pkgRaw) {
      try {
        const parsed = JSON.parse(pkgRaw) as { name?: unknown };
        const pkgName = this.normalizeIdentity(parsed.name);
        if (pkgName) return pkgName;
      } catch {
        // Malformed manifest: continue with the next identity source.
      }
    }

    // 3. Go: module path, reduced to its final segment.
    const goMod = this.readTextFile(path.join(baseDir, "go.mod"));
    if (goMod) {
      const moduleMatch = goMod.match(/^\s*module\s+(\S+)/m);
      if (moduleMatch) {
        const lastSegment = moduleMatch[1].replace(/\.git$/, "").split("/").filter(Boolean).pop();
        const goName = this.normalizeIdentity(lastSegment);
        if (goName) return goName;
      }
    }

    // 4. Rust: Cargo.toml [package] name.
    const cargoToml = this.readTextFile(path.join(baseDir, "Cargo.toml"));
    if (cargoToml) {
      for (const section of ["[package]", "[workspace.package]"]) {
        const cargoName = this.normalizeIdentity(this.extractTomlScalar(cargoToml, "name", section));
        if (cargoName) return cargoName;
      }
    }

    // 5. Python: pyproject.toml (PEP 621 [project] then Poetry [tool.poetry]).
    const pyproject = this.readTextFile(path.join(baseDir, "pyproject.toml"));
    if (pyproject) {
      for (const section of ["[project]", "[tool.poetry]", "[tool.hatch.project]"]) {
        const pyName = this.normalizeIdentity(this.extractTomlScalar(pyproject, "name", section));
        if (pyName) return pyName;
      }
    }

    // 6. Dart / Flutter: pubspec.yaml name.
    const pubspec = this.readTextFile(path.join(baseDir, "pubspec.yaml"));
    if (pubspec) {
      const dartName = this.normalizeIdentity(this.extractYamlBlockScalar(pubspec, "", "name"));
      if (dartName) return dartName;
    }

    // 7. JVM: pom.xml <name>/<artifactId> or build.gradle rootProject.name.
    const pomXml = this.readTextFile(path.join(baseDir, "pom.xml"));
    if (pomXml) {
      const pomMatch = pomXml.match(/<name>\s*([^<]+?)\s*<\/name>/i) ?? pomXml.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/i);
      const pomName = this.normalizeIdentity(pomMatch?.[1]);
      if (pomName) return pomName;
    }
    const gradle = this.readTextFile(path.join(baseDir, "build.gradle")) ?? this.readTextFile(path.join(baseDir, "build.gradle.kts"));
    if (gradle) {
      const gradleMatch = gradle.match(/rootProject\.name\s*=\s*["']([^"']+)["']/);
      const gradleName = this.normalizeIdentity(gradleMatch?.[1]);
      if (gradleName) return gradleName;
    }

    // 8. Last resort: the checkout directory name.
    return path.basename(baseDir);
  }

  private readTextFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size > 262_144) return null;
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return null;
    }
  }

  /**
   * Extracts `key: value` nested under a top-level YAML block (pass "" to scan the document root).
   */
  private extractYamlBlockScalar(text: string, block: string, key: string): string | null {
    let blockIndent = block ? -1 : 0;
    for (const rawLine of text.split(/\r?\n/)) {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const indent = rawLine.length - rawLine.trimStart().length;

      if (block && blockIndent === -1) {
        if (indent === 0 && new RegExp(`^${block}\\s*:`).test(trimmed)) blockIndent = indent;
        continue;
      }
      if (block && indent <= blockIndent) break; // A sibling top-level key closes the block.

      const match = trimmed.match(new RegExp(`^${key}\\s*:\\s*(.+)$`));
      if (match) return this.normalizeIdentity(match[1]);
    }
    return null;
  }

  /**
   * Extracts `key = value` from a TOML section header (e.g. "[package]").
   */
  private extractTomlScalar(text: string, key: string, section: string): string | null {
    let inSection = false;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("[")) {
        inSection = line === section;
        continue;
      }
      if (!inSection) continue;
      const match = line.match(new RegExp(`^${key}\\s*=\\s*(.+)$`));
      if (match) return this.normalizeIdentity(match[1]);
    }
    return null;
  }

  /**
   * Cleans a manifest-declared identity: strips quotes/comments and rejects empty or template values.
   */
  private normalizeIdentity(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const cleaned = raw
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    if (!cleaned || cleaned.length > 120) return null;
    if (cleaned.includes("${") || /[\r\n]/.test(cleaned)) return null;
    return cleaned;
  }

  /**
   * Enumerates the source-controlled surface of a repository.
   *
   * When the target is a Git work tree, `git ls-files` is the single source of truth: it returns
   * tracked files plus untracked-but-not-ignored files, so local tool state (`.cline-home`, `.env`,
   * build caches, virtualenvs) is never fingerprinted or secret-scanned. Paths are sorted for
   * deterministic Merkle receipts. Non-Git targets fall back to the bounded filesystem walk.
   */
  private listGitVisibleFiles(baseDir: string, maxDepth: number): string[] | null {
    if (!fs.existsSync(path.join(baseDir, ".git"))) return null;
    try {
      const output = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
        cwd: baseDir,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"]
      });
      return output
        .split("\0")
        .filter(Boolean)
        .map((file) => file.replace(/\\/g, "/"))
        .filter((file) => file.split("/").length - 1 <= maxDepth)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    } catch {
      return null; // Git unavailable or not a work tree: use the filesystem walker.
    }
  }

  private scanDir(baseDir: string, maxDepth: number, currentDepth: number = 0, scanRoot: string = baseDir): string[] {
    if (currentDepth === 0) {
      const gitFiles = this.listGitVisibleFiles(baseDir, maxDepth);
      if (gitFiles) return gitFiles;
    }
    if (currentDepth > maxDepth || !fs.existsSync(baseDir)) return [];
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === ".git" ||
          entry.name === "node_modules" ||
          entry.name === ".vercel" ||
          entry.name === "target" ||
          entry.name === "vendor" ||
          entry.name.startsWith(".worktree")
        ) {
          continue;
        }

        const full = path.join(baseDir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this.scanDir(full, maxDepth, currentDepth + 1, scanRoot));
          continue;
        }
        if (entry.isFile()) {
          results.push(path.relative(scanRoot, full).replace(/\\/g, "/"));
        }
      }
    } catch {
      // Ignore unreadable dirs
    }
    return results;
  }

  private fingerprintRepo(baseDir: string, files: string[]): PolyglotFingerprint {
    const languages: PolyglotLanguage[] = [];
    let pkgMgr: PackageManager = "none";
    let testFramework: TestFramework = "none";
    let container: ContainerPlatform = "none";
    let ciCd: CiCdPlatform = "none";

    // Language indicators
    const hasPkgJson = fs.existsSync(path.join(baseDir, "package.json"));
    const hasTsConfig = fs.existsSync(path.join(baseDir, "tsconfig.json"));
    const hasGoMod = fs.existsSync(path.join(baseDir, "go.mod"));
    const hasCargo = fs.existsSync(path.join(baseDir, "Cargo.toml"));
    const hasPyProject = fs.existsSync(path.join(baseDir, "pyproject.toml")) || fs.existsSync(path.join(baseDir, "requirements.txt"));
    const hasPubspec = fs.existsSync(path.join(baseDir, "pubspec.yaml"));
    const hasPom = fs.existsSync(path.join(baseDir, "pom.xml")) || fs.existsSync(path.join(baseDir, "build.gradle"));
    const hasCMake = fs.existsSync(path.join(baseDir, "CMakeLists.txt"));
    const hasCsproj = files.some((f) => f.endsWith(".csproj"));
    const hasGemfile = fs.existsSync(path.join(baseDir, "Gemfile"));
    const hasComposer = fs.existsSync(path.join(baseDir, "composer.json"));
    const hasMix = fs.existsSync(path.join(baseDir, "mix.exs"));

    // Weighted polyglot detection: manifest declarations seed the score, real source files dominate it.
    const languageWeights = new Map<PolyglotLanguage, number>();
    const weigh = (lang: PolyglotLanguage, weight: number): void => {
      languageWeights.set(lang, (languageWeights.get(lang) ?? 0) + weight);
    };

    if (hasTsConfig) weigh("typescript", MANIFEST_LANGUAGE_WEIGHT);
    else if (hasPkgJson) weigh("javascript", MANIFEST_LANGUAGE_WEIGHT);
    if (hasGoMod) weigh("go", MANIFEST_LANGUAGE_WEIGHT);
    if (hasCargo) weigh("rust", MANIFEST_LANGUAGE_WEIGHT);
    if (hasPyProject) weigh("python", MANIFEST_LANGUAGE_WEIGHT);
    if (hasPubspec) weigh("flutter_dart", MANIFEST_LANGUAGE_WEIGHT);
    if (hasPom) weigh("java_kotlin", MANIFEST_LANGUAGE_WEIGHT);
    if (hasCMake) weigh("cpp_c", MANIFEST_LANGUAGE_WEIGHT);
    if (hasCsproj) weigh("csharp", MANIFEST_LANGUAGE_WEIGHT);
    if (hasGemfile) weigh("ruby", MANIFEST_LANGUAGE_WEIGHT);
    if (hasComposer) weigh("php", MANIFEST_LANGUAGE_WEIGHT);
    if (hasMix) weigh("elixir", MANIFEST_LANGUAGE_WEIGHT);

    for (const file of files) {
      const language = EXTENSION_TO_LANGUAGE[path.extname(file).toLowerCase()];
      if (language) weigh(language, 1);
    }

    languages.push(
      ...[...languageWeights.entries()]
        .sort((a, b) => b[1] - a[1] || LANGUAGE_PRIORITY.indexOf(a[0]) - LANGUAGE_PRIORITY.indexOf(b[0]))
        .map(([language]) => language)
    );

    const primaryLanguage: PolyglotLanguage = languages[0] ?? "unknown";

    // Package Managers
    if (fs.existsSync(path.join(baseDir, "pnpm-lock.yaml"))) pkgMgr = "pnpm";
    else if (fs.existsSync(path.join(baseDir, "yarn.lock"))) pkgMgr = "yarn";
    else if (fs.existsSync(path.join(baseDir, "bun.lockb")) || fs.existsSync(path.join(baseDir, "bun.lock"))) pkgMgr = "bun";
    else if (hasPkgJson) pkgMgr = "npm";
    else if (hasGoMod) pkgMgr = "go_mod";
    else if (hasCargo) pkgMgr = "cargo";
    else if (fs.existsSync(path.join(baseDir, "poetry.lock"))) pkgMgr = "poetry";
    else if (fs.existsSync(path.join(baseDir, "uv.lock"))) pkgMgr = "uv";
    else if (hasPyProject) pkgMgr = "pip";
    else if (hasPubspec) pkgMgr = "pub";
    else if (fs.existsSync(path.join(baseDir, "pom.xml"))) pkgMgr = "maven";
    else if (fs.existsSync(path.join(baseDir, "build.gradle"))) pkgMgr = "gradle";
    else if (hasCMake) pkgMgr = "cmake";

    // Test Frameworks
    if (hasPkgJson) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(baseDir, "package.json"), "utf8"));
        const scripts = JSON.stringify(pkg.scripts || {});
        const devDeps = JSON.stringify(pkg.devDependencies || {});
        if (scripts.includes("node --test") || scripts.includes("node:test")) testFramework = "node_test";
        else if (devDeps.includes("vitest") || scripts.includes("vitest")) testFramework = "vitest";
        else if (devDeps.includes("jest") || scripts.includes("jest")) testFramework = "jest";
        else if (devDeps.includes("mocha") || scripts.includes("mocha")) testFramework = "mocha";
      } catch {
        // ignore
      }
    }
    if (testFramework === "none") {
      if (primaryLanguage === "go") testFramework = "go_test";
      else if (primaryLanguage === "rust") testFramework = "cargo_test";
      else if (primaryLanguage === "python") testFramework = "pytest";
      else if (primaryLanguage === "flutter_dart") testFramework = "flutter_test";
      else if (primaryLanguage === "java_kotlin") testFramework = "junit";
    }

    // Containers
    const dockerfilePath = fs.existsSync(path.join(baseDir, "Dockerfile"))
      ? path.join(baseDir, "Dockerfile")
      : files.find((f) => f.endsWith("Dockerfile") || f.endsWith("/Dockerfile"))
      ? path.join(baseDir, files.find((f) => f.endsWith("Dockerfile") || f.endsWith("/Dockerfile"))!)
      : null;

    if (dockerfilePath && fs.existsSync(dockerfilePath)) {
      const dfile = fs.readFileSync(dockerfilePath, "utf8");
      container = dfile.includes("distroless") ? "distroless" : "dockerfile";
    } else if (fs.existsSync(path.join(baseDir, "docker-compose.yml")) || files.some((f) => f.endsWith("docker-compose.yml"))) {
      container = "compose";
    }

    // CI/CD
    if (fs.existsSync(path.join(baseDir, ".github", "workflows"))) ciCd = "github_actions";
    else if (fs.existsSync(path.join(baseDir, ".gitlab-ci.yml"))) ciCd = "gitlab_ci";

    const hasAgentScaffolding =
      fs.existsSync(path.join(baseDir, "AGENTS.md")) ||
      fs.existsSync(path.join(baseDir, "CLAUDE.md")) ||
      fs.existsSync(path.join(baseDir, ".cursorrules")) ||
      fs.existsSync(path.join(baseDir, ".cursor", "rules"));

    const hasBackstageDescriptor = fs.existsSync(path.join(baseDir, "catalog-info.yaml"));

    let structureArchetype: PolyglotFingerprint["structureArchetype"] = "STANDARD_SERVICE";
    if (files.some((f) => f.startsWith("packages/") || f.startsWith("apps/"))) structureArchetype = "MONOREPO";
    else if (files.length < 15) structureArchetype = "EMBEDDED_MINIMAL";
    else if (files.some((f) => f.startsWith("src/core/") || f.startsWith("lib/"))) structureArchetype = "MODULAR_LIBRARY";

    return {
      primaryLanguage,
      languagesDetected: languages,
      packageManager: pkgMgr,
      testFramework,
      containerization: container,
      ciCd,
      hasAgentScaffolding,
      hasBackstageDescriptor,
      totalSourceFiles: files.length,
      linter: this.detectLinter(baseDir, primaryLanguage),
      structureArchetype
    };
  }

  /**
   * Detects the enforced static-analysis / formatting toolchain (the "shift-left" gate of the repo).
   */
  private detectLinter(baseDir: string, primaryLanguage: PolyglotLanguage): string {
    const hasFile = (candidate: string): boolean => fs.existsSync(path.join(baseDir, candidate));

    const jsTooling: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["eslint", ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml"]],
      ["biome", ["biome.json", "biome.jsonc"]],
      ["prettier", [".prettierrc", ".prettierrc.json", ".prettierrc.yml", ".prettierrc.yaml", "prettier.config.js", "prettier.config.mjs"]],
      ["deno", ["deno.json", "deno.jsonc"]]
    ];
    for (const [tool, configs] of jsTooling) {
      if (configs.some(hasFile)) return tool;
    }

    const polyglotTooling: ReadonlyArray<readonly [string, readonly string[]]> = [
      ["golangci-lint", [".golangci.yml", ".golangci.yaml", ".golangci.toml", ".golangci.json"]],
      ["rustfmt", ["rustfmt.toml", ".rustfmt.toml"]],
      ["ruff", ["ruff.toml", ".ruff.toml"]],
      ["flake8", [".flake8"]],
      ["pylint", [".pylintrc", "pylintrc"]],
      ["rubocop", [".rubocop.yml"]],
      ["clang-format", [".clang-format", "_clang-format"]],
      ["checkstyle", ["checkstyle.xml"]],
      ["editorconfig", [".editorconfig"]]
    ];
    for (const [tool, configs] of polyglotTooling) {
      if (configs.some(hasFile)) return tool;
    }

    // Manifest-declared tooling (package.json devDependencies or pyproject [tool.*] tables).
    const pkgRaw = this.readTextFile(path.join(baseDir, "package.json"));
    if (pkgRaw) {
      try {
        const pkg = JSON.parse(pkgRaw) as { devDependencies?: Record<string, string>; scripts?: Record<string, string> };
        const declared = { ...(pkg.devDependencies ?? {}), ...(pkg.scripts ?? {}) };
        const haystack = Object.keys(declared).join(" ");
        if (/\beslint\b/.test(haystack)) return "eslint";
        if (/\bbiome\b/.test(haystack)) return "biome";
        if (/\bprettier\b/.test(haystack)) return "prettier";
      } catch {
        // Malformed manifest: fall through to the language heuristics below.
      }
    }

    const pyproject = this.readTextFile(path.join(baseDir, "pyproject.toml"));
    if (pyproject) {
      if (/^\s*\[tool\.ruff(\.|])/m.test(pyproject)) return "ruff";
      if (/^\s*\[tool\.black(\.|])/m.test(pyproject)) return "black";
      if (/^\s*\[tool\.pylint(\.|])/m.test(pyproject)) return "pylint";
    }

    // Language-native defaults enforced by the compiler / formatter itself.
    if (primaryLanguage === "go") return "gofmt";
    if (primaryLanguage === "rust") return "rustfmt";
    if (primaryLanguage === "flutter_dart") return "dart_analyze";
    return "none";
  }

  private evaluateLayerPurity(baseDir: string, files: string[], fp: PolyglotFingerprint): PillarEvaluation {
    let score = 0;
    const findings: string[] = [];

    const hasModularDir = files.some(
      (f) => f.startsWith("src/") || f.startsWith("lib/") || f.startsWith("pkg/") || f.startsWith("cmd/")
    );
    if (hasModularDir) {
      score += 10;
    } else {
      findings.push("Organize source files under clear domain directories (src/, lib/, or pkg/).");
    }

    if (fp.primaryLanguage === "typescript" || fp.primaryLanguage === "javascript") {
      const pkgPath = path.join(baseDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          const deps = Object.keys(pkg.dependencies || {});
          if (deps.length === 0) {
            score += 10; // Layer-0 0-deps standard
          } else if (deps.length <= 5) {
            score += 7;
          } else {
            score += 4;
            findings.push(`Consider pruning external runtime dependencies (${deps.length} found).`);
          }
        } catch {
          score += 5;
        }
      }
    } else {
      score += 10; // Standard parity for non-JS languages
    }

    let status: PillarEvaluation["status"] = "EXCELLENT";
    if (score < 10) status = "CRITICAL";
    else if (score < 15) status = "NEEDS_IMPROVEMENT";
    else if (score < 18) status = "SATISFACTORY";

    return {
      name: "Layer Purity & Architecture Separation",
      score,
      maxScore: 20,
      status,
      findings
    };
  }

  private evaluateTestInfrastructure(baseDir: string, files: string[], fp: PolyglotFingerprint): PillarEvaluation {
    let score = 0;
    const findings: string[] = [];

    const hasTestDir = files.some(
      (f) =>
        f.startsWith("test/") ||
        f.startsWith("tests/") ||
        f.includes(".test.") ||
        f.includes(".spec.") ||
        f.endsWith("_test.go")
    );

    if (hasTestDir) {
      score += 10;
    } else {
      findings.push("Establish dedicated automated test suite (test/ or tests/ directory).");
    }

    if (fp.testFramework !== "none") {
      score += 5;
    } else {
      findings.push("Configure standard automated test runner in build descriptors.");
    }

    const testFileCount = files.filter(
      (f) => f.includes("test") || f.includes("spec") || f.endsWith("_test.go")
    ).length;
    if (testFileCount >= 5) {
      score += 5;
    } else if (testFileCount >= 1) {
      score += 3;
    } else {
      findings.push("Expand automated test coverage across edge cases and invariants.");
    }

    let status: PillarEvaluation["status"] = "EXCELLENT";
    if (score < 10) status = "CRITICAL";
    else if (score < 15) status = "NEEDS_IMPROVEMENT";
    else if (score < 18) status = "SATISFACTORY";

    return {
      name: "Test Infrastructure & Concurrency Safety",
      score,
      maxScore: 20,
      status,
      findings
    };
  }

  private evaluateSecretSecurity(baseDir: string, files: string[]): PillarEvaluation {
    let score = 20;
    const findings: string[] = [];

    const gitignorePath = path.join(baseDir, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      score -= 8;
      findings.push("Add .gitignore file protecting .env files and credentials.");
    } else {
      const gitignore = fs.readFileSync(gitignorePath, "utf8");
      if (!gitignore.includes(".env")) {
        score -= 4;
        findings.push("Explicitly ignore .env in .gitignore.");
      }
    }

    // Check for plaintext secrets in tracked files
    const liveKeyPattern = /(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{24,}|AKIA[0-9A-Z]{16})/;
    for (const f of files.slice(0, 50)) {
      const full = path.join(baseDir, f);
      if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
        try {
          const content = fs.readFileSync(full, "utf8");
          if (liveKeyPattern.test(content)) {
            score -= 10;
            findings.push(`Plaintext secret pattern detected in ${f}`);
            break;
          }
        } catch {
          // ignore binary files
        }
      }
    }

    score = Math.max(0, score);
    let status: PillarEvaluation["status"] = "EXCELLENT";
    if (score < 10) status = "CRITICAL";
    else if (score < 15) status = "NEEDS_IMPROVEMENT";
    else if (score < 18) status = "SATISFACTORY";

    return {
      name: "Secret Security & Zero Plaintext Leaks",
      score,
      maxScore: 20,
      status,
      findings
    };
  }

  private evaluateCiCdGateways(baseDir: string, files: string[]): PillarEvaluation {
    let score = 0;
    const findings: string[] = [];

    const hasWorkflows = fs.existsSync(path.join(baseDir, ".github", "workflows"));
    if (hasWorkflows) {
      score += 10;
    } else {
      findings.push("Add automated CI/CD pipeline under .github/workflows/.");
    }

    const hasGithooks = fs.existsSync(path.join(baseDir, ".githooks")) || fs.existsSync(path.join(baseDir, ".husky"));
    if (hasGithooks) {
      score += 5;
    } else {
      findings.push("Configure pre-commit hooks (.githooks/) for fast local verification.");
    }

    const hasContainer = fs.existsSync(path.join(baseDir, "Dockerfile")) || fs.existsSync(path.join(baseDir, "docker-compose.yml"));
    if (hasContainer) {
      score += 5;
    } else {
      findings.push("Provide standardized containerization (Dockerfile or distroless image).");
    }

    let status: PillarEvaluation["status"] = "EXCELLENT";
    if (score < 10) status = "CRITICAL";
    else if (score < 15) status = "NEEDS_IMPROVEMENT";
    else if (score < 18) status = "SATISFACTORY";

    return {
      name: "CI/CD Gateways & Continuous Verification",
      score,
      maxScore: 20,
      status,
      findings
    };
  }

  private evaluateAiScaffolding(baseDir: string, files: string[]): PillarEvaluation {
    let score = 0;
    const findings: string[] = [];

    const hasBackstage = fs.existsSync(path.join(baseDir, "catalog-info.yaml"));
    if (hasBackstage) {
      score += 7;
    } else {
      findings.push("Scaffold Spotify Backstage catalog-info.yaml descriptor.");
    }

    const hasAgents = fs.existsSync(path.join(baseDir, "AGENTS.md")) || fs.existsSync(path.join(baseDir, "CLAUDE.md"));
    if (hasAgents) {
      score += 7;
    } else {
      findings.push("Add AGENTS.md or CLAUDE.md containing squad context and engineering laws.");
    }

    const hasDocs = fs.existsSync(path.join(baseDir, "README.md")) || fs.existsSync(path.join(baseDir, "docs"));
    if (hasDocs) {
      score += 6;
    } else {
      findings.push("Provide comprehensive technical documentation (README.md / docs/).");
    }

    let status: PillarEvaluation["status"] = "EXCELLENT";
    if (score < 10) status = "CRITICAL";
    else if (score < 15) status = "NEEDS_IMPROVEMENT";
    else if (score < 18) status = "SATISFACTORY";

    return {
      name: "AI Context Scaffolding & Golden Path Readiness",
      score,
      maxScore: 20,
      status,
      findings
    };
  }

  // ---------------------------------------------------------------------------
  // GOLDEN PATH SYNTHESIZERS
  // ---------------------------------------------------------------------------

  private synthesizeCatalogInfo(name: string, fp: PolyglotFingerprint, opts: ElevateOptions): string {
    const owner = opts.ownerSquad || "user:valentin-florez-arbelaez";
    const system = opts.systemName || "sovereign-fleet";

    return [
      `apiVersion: backstage.io/v1alpha1`,
      `kind: Component`,
      `metadata:`,
      `  name: ${name}`,
      `  title: ${name}`,
      `  description: "Enterprise software project elevated to Spotify Golden Path standards via EOS."`,
      `  annotations:`,
      `    backstage.io/techdocs-ref: dir:.`,
      `    spotify.com/golden-path-certified: "true"`,
      `  tags:`,
      `    - ${fp.primaryLanguage}`,
      `    - ${fp.packageManager}`,
      `    - ${fp.structureArchetype.toLowerCase().replace(/_/g, "-")}`,
      `spec:`,
      `  type: service`,
      `  lifecycle: production`,
      `  owner: ${owner}`,
      `  system: ${system}`
    ].join("\n");
  }

  private synthesizeCiWorkflow(name: string, fp: PolyglotFingerprint): string {
    let testCommand = "npm test";
    if (fp.primaryLanguage === "go") testCommand = "go test -race -v ./...";
    else if (fp.primaryLanguage === "rust") testCommand = "cargo test --verbose";
    else if (fp.primaryLanguage === "python") testCommand = "pytest --maxfail=1 --disable-warnings";
    else if (fp.primaryLanguage === "flutter_dart") testCommand = "flutter test";

    return [
      `name: CI Gate (${name})`,
      `on:`,
      `  push:`,
      `    branches: [ main, master ]`,
      `  pull_request:`,
      `    branches: [ main, master ]`,
      ``,
      `jobs:`,
      `  verify:`,
      `    runs-on: ubuntu-latest`,
      `    steps:`,
      `      - uses: actions/checkout@v4`,
      `      - name: Run Test Suite`,
      `        run: ${testCommand}`
    ].join("\n");
  }

  private synthesizeAgentsContext(name: string, fp: PolyglotFingerprint): string {
    return [
      `# AGENTS.md — SPOTIFY & NUBANK SOVEREIGN CONTEXT MATRIX`,
      `<!-- Generated by EOS Universal Project Adapter (SPEC-019) -->`,
      ``,
      `## 1. Project Profile`,
      `- **Component**: \`${name}\``,
      `- **Primary Language**: \`${fp.primaryLanguage}\``,
      `- **Package Manager**: \`${fp.packageManager}\``,
      `- **Test Framework**: \`${fp.testFramework}\``,
      ``,
      `## 2. The 4 Fundamental Laws of Engineering (Spotify & Nubank Standard)`,
      `1. **Extreme Ownership**: Act like an owner. Zero temporary hacks.`,
      `2. **FinOps & Zero-Allocation**: Minimize memory footprint and cloud costs.`,
      `3. **Shift-Left Rigor & Concurrency Safety**: Verify data race safety before merging.`,
      `4. **Idempotency**: Guarantee deterministic outputs for identical inputs.`,
      ``,
      `## 3. Inviolable Directives for AI Agents`,
      `- Never commit plaintext API keys or credentials.`,
      `- Always run tests before declaring tasks complete.`,
      `- Preserve architectural boundaries and modular clean design.`
    ].join("\n");
  }

  private synthesizePreCommitHook(): string {
    return [
      `#!/bin/sh`,
      `# EOS Universal Pre-Commit Secret Scanner`,
      `echo "[EOS GATE] Scanning staged files for plaintext credentials..."`,
      `if git diff --cached | grep -E "sk-live-[0-9a-zA-Z]{16,}|ghp_[0-9a-zA-Z]{24,}|AKIA[0-9A-Z]{16}"; then`,
      `  echo "❌ [BLOCK] Commit aborted: Plaintext secret pattern detected!"`,
      `  exit 1`,
      `fi`,
      `echo "✔ [PASS] Zero plaintext secrets detected. Proceeding."`,
      `exit 0`
    ].join("\n");
  }
}
