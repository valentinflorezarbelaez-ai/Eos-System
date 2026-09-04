/**
 * @module UniversalAgenticExtensionOrchestrator
 * @description Universal 7-Pillar Extension Orchestrator and Polyglot Stack Detector.
 * Unifies Plugins, MCPs, Skills, Subagents, Rules, Commands, and Hooks across any programming language.
 */

import fs from 'node:fs';
import path from 'node:path';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const SUPPORTED_STACKS = {
  NODE_TYPESCRIPT: { marker: 'package.json', defaultTestRunner: 'npm test', defaultLinter: 'npm run lint' },
  PYTHON: { marker: 'pyproject.toml', altMarker: 'requirements.txt', defaultTestRunner: 'pytest', defaultLinter: 'ruff check' },
  RUST: { marker: 'Cargo.toml', defaultTestRunner: 'cargo test', defaultLinter: 'cargo clippy' },
  GO: { marker: 'go.mod', defaultTestRunner: 'go test ./...', defaultLinter: 'golangci-lint run' },
  JAVA_KOTLIN: { marker: 'pom.xml', altMarker: 'build.gradle', defaultTestRunner: 'mvn test', defaultLinter: 'mvn checkstyle:check' },
  DOTNET_CSHARP: { marker: '.csproj', defaultTestRunner: 'dotnet test', defaultLinter: 'dotnet format --verify-no-changes' },
  PHP: { marker: 'composer.json', defaultTestRunner: 'composer test', defaultLinter: 'composer phpstan' },
  RUBY: { marker: 'Gemfile', defaultTestRunner: 'bundle exec rspec', defaultLinter: 'bundle exec rubocop' },
  ELIXIR: { marker: 'mix.exs', defaultTestRunner: 'mix test', defaultLinter: 'mix credo' },
  CPP_C: { marker: 'CMakeLists.txt', altMarker: 'Makefile', defaultTestRunner: 'ctest', defaultLinter: 'clang-tidy' },
  CONTAINER_DOCKER: { marker: 'Dockerfile', defaultTestRunner: 'docker build --check .', defaultLinter: 'hadolint Dockerfile' }
};

export class UniversalAgenticExtensionOrchestrator {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   * @param {object} [options.runtime]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.runtime = options.runtime || null;
    this.hooks = new Map();
    this.registeredPlugins = new Map();
  }

  /**
   * Automatically inspects any project directory to detect programming language, framework, and test runner
   * @param {string} [targetDir]
   * @returns {object} Polyglot stack detection report
   */
  detectProjectStack(targetDir = this.baseDir) {
    const detected = [];

    if (!fs.existsSync(targetDir)) {
      return {
        targetDir,
        primary_stack: 'UNKNOWN',
        detected_stacks: [],
        test_command: 'echo "No tests configured"',
        lint_command: 'echo "No linter configured"',
        is_polyglot: false
      };
    }

    const files = fs.readdirSync(targetDir);

    for (const [stackName, config] of Object.entries(SUPPORTED_STACKS)) {
      let isMatch = false;

      if (config.marker.startsWith('.')) {
        // File extension check (e.g. .csproj)
        isMatch = files.some(f => f.endsWith(config.marker));
      } else {
        // Exact filename check
        isMatch = files.includes(config.marker) || (config.altMarker && files.includes(config.altMarker));
      }

      if (isMatch) {
        detected.push({
          stack: stackName,
          testRunner: config.defaultTestRunner,
          linter: config.defaultLinter
        });
      }
    }

    const primary = detected.length > 0 ? detected[0] : { stack: 'GENERIC_SHELL', testRunner: 'npm test', linter: 'npm run lint' };

    const report = {
      target_dir: targetDir,
      primary_stack: primary.stack,
      detected_stacks: detected.map(d => d.stack),
      test_command: primary.testRunner,
      lint_command: primary.linter,
      is_polyglot: detected.length > 1,
      timestamp: new Date().toISOString()
    };

    report.sha256 = calculateSha256(JSON.stringify(report));
    return report;
  }

  /**
   * Registers a lifecycle hook handler
   * @param {string} hookName PreToolUse | PostToolUse | PreCommit | PostMutation | PreVerification
   * @param {Function} handler
   */
  registerHook(hookName, handler) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push(handler);
  }

  /**
   * Executes a registered lifecycle hook
   * @param {string} hookName
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async executeHook(hookName, payload = {}) {
    const handlers = this.hooks.get(hookName) || [];
    let state = { ...payload };

    for (const handler of handlers) {
      const res = await handler(state);
      if (res && typeof res === 'object') {
        state = { ...state, ...res };
      }
    }

    return {
      hook_name: hookName,
      executed_handlers: handlers.length,
      final_state: state,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Emits an executive inventory of the 7 pillars of agentic capability
   * @returns {object}
   */
  get7PillarsInventory() {
    const skillsCount = this.runtime?.skillRouter?.catalog?.size ?? 13;
    const rulesCount = this.runtime?.rules?.rules?.length ?? 5;
    const toolsCount = 25; // MCP canonical tools
    const subagentsCount = this.runtime?.roleRegistry?.roles?.length ?? 4;

    const inventory = {
      architecture_standard: 'UNIVERSAL_7_PILLAR_AGENTIC_SYSTEM',
      pillars: {
        plugins: { count: this.registeredPlugins.size, status: 'READY' },
        mcps: { count: toolsCount, protocol: 'JSON-RPC 2.0 stdio', status: 'ACTIVE_WIRED' },
        skills: { count: skillsCount, auto_router: 'JIT_ACTIVE', status: 'READY' },
        subagents: { count: subagentsCount, governance: 'MONOTONIC_LEAST_PRIVILEGE', status: 'READY' },
        rules: { count: rulesCount, format: 'SCOPED_MDC_AND_SYSTEM_RULES', status: 'ACTIVE' },
        commands: { count: 5, prefix: '/sdd-*', status: 'WIRED' },
        hooks: { count: this.hooks.size, status: 'INTERCEPTING' }
      },
      polyglot_support: Object.keys(SUPPORTED_STACKS),
      timestamp: new Date().toISOString()
    };

    inventory.sha256 = calculateSha256(JSON.stringify(inventory));
    return inventory;
  }
}
