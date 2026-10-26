import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { EosUniversalProjectAdapter } from "../src/core/eosUniversalProjectAdapter.ts";

describe("EOS Universal Polyglot Repository Adapter Suite (SPEC-019, BDD-049)", () => {
  const adapter = new EosUniversalProjectAdapter(process.cwd());

  describe("Suite 1: Polyglot Stack Fingerprinting & Live Repository Audit", () => {
    it("fingerprints current EOS repository with high architectural fidelity", () => {
      const report = adapter.audit();

      assert.ok(report, "Expected valid audit report");
      assert.ok(
        report.projectName.toLowerCase().includes("eos") || report.projectName === "Eos-System",
        `Expected project name to match EOS, got ${report.projectName}`
      );
      assert.ok(["typescript", "javascript"].includes(report.fingerprint.primaryLanguage));
      assert.ok(report.fingerprint.totalSourceFiles > 20);
      assert.ok(report.fingerprint.hasAgentScaffolding, "Expected AGENTS.md/CLAUDE.md to be detected");
      assert.ok(report.fingerprint.hasBackstageDescriptor, "Expected catalog-info.yaml to be detected");
      assert.ok(["dockerfile", "distroless"].includes(report.fingerprint.containerization));
      assert.equal(report.fingerprint.ciCd, "github_actions");
    });

    it("evaluates all 5 Core Architectural Pillars with deterministic bounds", () => {
      const report = adapter.audit();
      const { pillars } = report;

      // Check pillar properties
      for (const pillarKey of ["layerPurity", "testInfrastructure", "secretSecurity", "ciCdGateways", "aiScaffolding"]) {
        const pillar = pillars[pillarKey];
        assert.ok(pillar, `Missing pillar: ${pillarKey}`);
        assert.ok(pillar.score >= 0 && pillar.score <= 20, `Score out of bounds for ${pillarKey}: ${pillar.score}`);
        assert.equal(pillar.maxScore, 20);
        assert.ok(["EXCELLENT", "SATISFACTORY", "NEEDS_IMPROVEMENT", "CRITICAL"].includes(pillar.status));
        assert.ok(Array.isArray(pillar.findings));
      }

      // EOS System should achieve TIER_1_SOVEREIGN or TIER_2_PRODUCTION
      assert.ok(report.healthIndex >= 80, `Expected high health index for EOS, got ${report.healthIndex}`);
      assert.ok(["TIER_1_SOVEREIGN", "TIER_2_PRODUCTION"].includes(report.tier));
      assert.ok(typeof report.sha256MerkleReceipt === "string" && report.sha256MerkleReceipt.length === 64);
    });
  });

  describe("Suite 2: Cross-Language Polyglot Fingerprinting (Go, Rust, Python, Flutter)", () => {
    it("correctly identifies a Go microservice project with distroless container", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-go-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "go.mod"), "module github.com/spotify/recommend\ngo 1.24\n");
        fs.writeFileSync(path.join(tmpDir, "main.go"), "package main\nfunc main() {}\n");
        fs.writeFileSync(path.join(tmpDir, "main_test.go"), "package main\nimport \"testing\"\nfunc TestMain(t *testing.T) {}\n");
        fs.writeFileSync(path.join(tmpDir, "Dockerfile"), "FROM gcr.io/distroless/static-debian12\n");
        fs.writeFileSync(path.join(tmpDir, ".gitignore"), ".env\n*.exe\n");

        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);
        const report = mockAdapter.audit();

        assert.equal(report.fingerprint.primaryLanguage, "go");
        assert.equal(report.fingerprint.packageManager, "go_mod");
        assert.equal(report.fingerprint.testFramework, "go_test");
        assert.equal(report.fingerprint.containerization, "distroless");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("correctly identifies a Rust DSP project with cargo test", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-rust-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "Cargo.toml"), "[package]\nname = \"dsp-kernel\"\nversion = \"0.1.0\"\n");
        const srcDir = path.join(tmpDir, "src");
        fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(path.join(srcDir, "lib.rs"), "#[test]\nfn test_filter() {}\n");
        fs.writeFileSync(path.join(tmpDir, ".gitignore"), "target/\n.env\n");

        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);
        const report = mockAdapter.audit();

        assert.equal(report.fingerprint.primaryLanguage, "rust");
        assert.equal(report.fingerprint.packageManager, "cargo");
        assert.equal(report.fingerprint.testFramework, "cargo_test");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("correctly identifies a Python data pipeline project", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-python-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "pyproject.toml"), "[tool.poetry]\nname = \"pipeline\"\n");
        fs.writeFileSync(path.join(tmpDir, "poetry.lock"), "# lockfile\n");
        const testsDir = path.join(tmpDir, "tests");
        fs.mkdirSync(testsDir, { recursive: true });
        fs.writeFileSync(path.join(testsDir, "test_pipeline.py"), "def test_ok(): pass\n");
        fs.writeFileSync(path.join(tmpDir, ".gitignore"), ".venv/\n.env\n");

        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);
        const report = mockAdapter.audit();

        assert.equal(report.fingerprint.primaryLanguage, "python");
        assert.equal(report.fingerprint.packageManager, "poetry");
        assert.equal(report.fingerprint.testFramework, "pytest");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("correctly identifies a Flutter / Dart application", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-flutter-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "pubspec.yaml"), "name: spotify_mobile\nversion: 1.0.0\n");
        const libDir = path.join(tmpDir, "lib");
        fs.mkdirSync(libDir, { recursive: true });
        fs.writeFileSync(path.join(libDir, "main.dart"), "void main() {}\n");
        fs.writeFileSync(path.join(tmpDir, ".gitignore"), ".dart_tool/\n.env\n");

        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);
        const report = mockAdapter.audit();

        assert.equal(report.fingerprint.primaryLanguage, "flutter_dart");
        assert.equal(report.fingerprint.packageManager, "pub");
        assert.equal(report.fingerprint.testFramework, "flutter_test");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("Suite 3: Golden Path Synthesis & Safe Dry-Run (EARS Error-Driven & State-Driven)", () => {
    it("guarantees zero disk writes during dry-run elevation", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-dryrun-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "go.mod"), "module github.com/test/service\n");
        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);

        const result = mockAdapter.elevate(tmpDir, { dryRun: true });

        assert.equal(result.dryRun, true);
        assert.ok(result.filesScaffolded.length >= 3, "Expected at least 3 files to be proposed");
        assert.ok(result.message.includes("[DRY-RUN]"));

        // Verify NO files were actually written to disk
        assert.equal(fs.existsSync(path.join(tmpDir, "catalog-info.yaml")), false);
        assert.equal(fs.existsSync(path.join(tmpDir, "AGENTS.md")), false);
        assert.equal(fs.existsSync(path.join(tmpDir, ".github/workflows/ci.yml")), false);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("materializes standardized Golden Path files when dryRun is false", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-write-mock-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "Cargo.toml"), "[package]\nname = \"dsp-service\"\n");
        const mockAdapter = new EosUniversalProjectAdapter(tmpDir);

        const result = mockAdapter.elevate(tmpDir, { dryRun: false });

        assert.equal(result.dryRun, false);
        assert.ok(result.message.includes("[APPLIED]"));

        // Verify files were written
        assert.ok(fs.existsSync(path.join(tmpDir, "catalog-info.yaml")), "Missing catalog-info.yaml");
        assert.ok(fs.existsSync(path.join(tmpDir, "AGENTS.md")), "Missing AGENTS.md");
        assert.ok(fs.existsSync(path.join(tmpDir, ".github/workflows/ci.yml")), "Missing .github/workflows/ci.yml");
        assert.ok(fs.existsSync(path.join(tmpDir, ".githooks/pre-commit")), "Missing .githooks/pre-commit");

        // Verify catalog contents
        const catalogContent = fs.readFileSync(path.join(tmpDir, "catalog-info.yaml"), "utf8");
        assert.ok(catalogContent.includes("kind: Component"));
        assert.ok(catalogContent.includes("spotify.com/golden-path-certified"));

        // Verify AGENTS.md contents
        const agentsContent = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf8");
        assert.ok(agentsContent.includes("Extreme Ownership"));
        assert.ok(agentsContent.includes("FinOps & Zero-Allocation"));
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
  describe("Suite 4: Manifest-First Repository Identity & Path Integrity", () => {
    const withTmpRepo = (files, assertion) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-identity-mock-"));
      try {
        for (const [relativePath, content] of Object.entries(files)) {
          const full = path.join(tmpDir, relativePath);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, content);
        }
        assertion(new EosUniversalProjectAdapter(tmpDir).audit(), tmpDir);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    };

    it("prefers the Backstage metadata.name over package.json and the checkout folder name", () => {
      withTmpRepo(
        {
          "catalog-info.yaml":
            "apiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata:\n  name: payments-ledger\n  title: Payments\nspec:\n  type: service\n",
          "package.json": JSON.stringify({ name: "internal-payments-pkg", version: "1.0.0" })
        },
        (report) => assert.equal(report.projectName, "payments-ledger")
      );
    });

    it("falls back to package.json name when no Backstage descriptor exists", () => {
      withTmpRepo(
        { "package.json": JSON.stringify({ name: "recommendations-api", version: "2.3.0" }) },
        (report) => assert.equal(report.projectName, "recommendations-api")
      );
    });

    it("resolves the Go module final segment as the project identity", () => {
      withTmpRepo({ "go.mod": "module github.com/spotify/recommend\n\ngo 1.24\n", "main.go": "package main\n" }, (report) =>
        assert.equal(report.projectName, "recommend")
      );
    });

    it("resolves the Cargo [package] name and never a dependency name", () => {
      withTmpRepo(
        {
          "Cargo.toml": '[package]\nname = "loudness-core"\nversion = "0.1.0"\n\n[dependencies]\nname = "serde"\n'
        },
        (report) => assert.equal(report.projectName, "loudness-core")
      );
    });

    it("resolves the PEP 621 [project] name before the Poetry table", () => {
      withTmpRepo(
        {
          "pyproject.toml": '[project]\nname = "royalty-pipeline"\n\n[tool.poetry]\nname = "legacy-name"\n'
        },
        (report) => assert.equal(report.projectName, "royalty-pipeline")
      );
    });

    it("falls back to the directory name when no manifest declares an identity", () => {
      withTmpRepo({ "README.md": "# bare repo\n" }, (report, tmpDir) => {
        assert.equal(report.projectName, path.basename(tmpDir));
      });
    });

    it("keeps relative scan paths anchored to the audited repository (nested Dockerfile detection)", () => {
      withTmpRepo(
        {
          "go.mod": "module github.com/spotify/fleet-agent\n",
          "cmd/agent/main.go": "package main\n",
          "deploy/Dockerfile": "FROM gcr.io/distroless/static-debian12\n"
        },
        (report) => {
          assert.equal(report.fingerprint.containerization, "distroless");
          assert.equal(report.fingerprint.totalSourceFiles, 3, "Directories must not be counted as source files");
        }
      );
    });

    it("enumerates only the git-visible surface and never secret-scans ignored files", (t) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-git-mock-"));
      try {
        try {
          execFileSync("git", ["init", "-q"], { cwd: tmpDir, stdio: "ignore" });
        } catch {
          t.skip("git binary unavailable in this environment");
          return;
        }
        // Fixture secrets are assembled at runtime so this test file never trips the repo's own
        // pre-commit / turbo secret scanners (which operate on literal source text).
        const fakeGithubToken = ["ghp", "a".repeat(24)].join("_");
        const fakeAwsKeyId = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
        fs.writeFileSync(path.join(tmpDir, ".gitignore"), "ignored/\nlocal.env\n.env\n");
        fs.writeFileSync(path.join(tmpDir, "index.ts"), "export const boot = (): void => undefined;\n");
        fs.mkdirSync(path.join(tmpDir, "ignored"), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, "ignored", "dump.env"), `GITHUB_TOKEN=${fakeGithubToken}\n`);
        fs.writeFileSync(path.join(tmpDir, "local.env"), `AWS=${fakeAwsKeyId}\n`);
        execFileSync("git", ["add", ".gitignore", "index.ts"], { cwd: tmpDir, stdio: "ignore" });

        const report = new EosUniversalProjectAdapter(tmpDir).audit();

        assert.equal(report.fingerprint.totalSourceFiles, 2, "Only .gitignore and index.ts are git-visible");
        assert.equal(report.pillars.secretSecurity.score, 20, "Ignored files must never be secret-scanned");
        assert.ok(
          report.pillars.secretSecurity.findings.every((finding) => !finding.includes("local.env") && !finding.includes("dump.env")),
          "Secret findings must not reference git-ignored paths"
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("Suite 5: Shift-Left Static Analysis Toolchain Detection", () => {
    const fingerprintOf = (files) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eos-linter-mock-"));
      try {
        for (const [relativePath, content] of Object.entries(files)) {
          const full = path.join(tmpDir, relativePath);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, content);
        }
        return new EosUniversalProjectAdapter(tmpDir).fingerprint();
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    };

    it("detects ESLint from a flat config file", () => {
      assert.equal(fingerprintOf({ "package.json": "{}", "eslint.config.mjs": "export default [];\n" }).linter, "eslint");
    });

    it("detects Biome from biome.json", () => {
      assert.equal(fingerprintOf({ "package.json": "{}", "biome.json": "{}\n" }).linter, "biome");
    });

    it("detects golangci-lint for Go engineering fleets", () => {
      assert.equal(fingerprintOf({ "go.mod": "module github.com/spotify/x\n", "main.go": "package main\n", ".golangci.yml": "run: {}\n" }).linter, "golangci-lint");
    });

    it("falls back to gofmt for Go repositories without an explicit linter config", () => {
      assert.equal(fingerprintOf({ "go.mod": "module github.com/spotify/x\n", "main.go": "package main\n" }).linter, "gofmt");
    });

    it("reports none when no toolchain is declared", () => {
      assert.equal(fingerprintOf({ "README.md": "# repo\n" }).linter, "none");
    });
  });

});
