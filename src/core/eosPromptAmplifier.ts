/**
 * EOS SYSTEM — PROMETHEUS PROMPT AMPLIFICATION ENGINE (Layer 0)
 * Governed by ADR-019, FR-024 & BDD-019
 *
 * Translates raw, informal, or vibe-coded prompts into mathematically sound,
 * zero-hallucination specifications structured in formal IEEE 830 / ISO 29148 EARS syntax,
 * BDD GIVEN-WHEN-THEN acceptance criteria, architectural boundary invariants,
 * and model-specific cognitive reasoning scaffolding (Claude, OpenAI, Gemini, DeepSeek, Llama).
 *
 * Zero external runtime dependencies.
 */

export type ModelFamily = "claude" | "openai" | "gemini" | "deepseek" | "llama" | "universal";

export type StrictnessLevel = "standard" | "hardened" | "sovereign";

export type EarsType = "EVENT_DRIVEN" | "STATE_DRIVEN" | "UNWANTED_CONDITION" | "UBIQUITOUS";

export interface EarsRequirement {
  id: string;
  type: EarsType;
  syntax: string;
  description: string;
}

export interface BddScenario {
  id: string;
  title: string;
  given: string;
  when: string;
  then: string;
  and: string[];
}

export interface ModelReasoningScaffold {
  family: ModelFamily;
  thinkingStrategy: string;
  scaffoldingDirectives: string[];
  antiHallucinationRules: string[];
}

export interface AmplifiedPromptRequest {
  rawPrompt: string;
  targetModel?: ModelFamily;
  contextFiles?: string[];
  strictLevel?: StrictnessLevel;
  projectDomain?: string;
}

export interface AmplifiedPromptResult {
  originalPrompt: string;
  targetModel: ModelFamily;
  detectedDomain: string;
  identifiedIntent: string;
  earsRequirements: EarsRequirement[];
  bddScenarios: BddScenario[];
  invariants: string[];
  modelScaffold: ModelReasoningScaffold;
  synthesizedSystemPrompt: string;
  synthesizedUserPrompt: string;
  executionSteps: string[];
}

/**
 * Domain keywords for heuristic classification.
 */
const DOMAIN_HEURISTICS: Record<string, string[]> = {
  "SECURITY_GATE": ["auth", "token", "jwt", "secret", "owasp", "vulnerability", "password", "sanitize", "cve", "guard"],
  "DATA_PERSISTENCE": ["db", "database", "sql", "postgres", "migration", "schema", "table", "query", "orm", "index", "acid"],
  "API_INTEGRATION": ["api", "endpoint", "rest", "graphql", "http", "fetch", "mcp", "route", "handler", "serverless", "jsonrpc"],
  "PERFORMANCE_SYSTEM": ["cache", "speed", "nanosecond", "latency", "benchmark", "optimize", "memory", "l1", "soa", "simd", "inp", "cwv"],
  "ARCHITECTURE_REFACTOR": ["refactor", "hexagonal", "clean", "boundary", "decouple", "modular", "interface", "port", "adapter", "layer"],
  "TESTING_EVIDENCE": ["test", "coverage", "chaos", "fuzz", "unit", "e2e", "bdd", "assert", "mock", "evidence", "sarif"],
  "FRONTEND_INTERFACE": ["ui", "component", "css", "html", "wcag", "dialog", "button", "accessibility", "responsive", "theme"]
};

/**
 * Analyzes the raw prompt to extract its operational domain.
 */
export function detectDomain(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_HEURISTICS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return domain;
    }
  }
  return "GENERAL_SYSTEMS_ENGINEERING";
}

/**
 * Generates ISO 29148 / IEEE 830 EARS requirements from natural language.
 */
export function synthesizeEarsRequirements(prompt: string, domain: string): EarsRequirement[] {
  const reqs: EarsRequirement[] = [];
  const cleanPrompt = prompt.trim().replace(/\.+$/, "");

  // 1. Event-Driven requirement
  reqs.push({
    id: "EARS-001",
    type: "EVENT_DRIVEN",
    syntax: `WHEN an execution trigger or operational command matching "${cleanPrompt}" is dispatched, THE SYSTEM SHALL execute the transition deterministically within the ${domain} boundary.`,
    description: "Governs positive action on user or system invocation."
  });

  // 2. Unwanted / Error Condition requirement
  reqs.push({
    id: "EARS-002",
    type: "UNWANTED_CONDITION",
    syntax: `IF any precondition, input parameter, or environmental invariant fails validation, THEN THE SYSTEM SHALL abort mutation, emit structured diagnostic telemetry, and preserve the previous stable state (fail-closed).`,
    description: "Governs error mitigation, boundary protection, and zero-panic recovery."
  });

  // 3. State-Driven requirement
  reqs.push({
    id: "EARS-003",
    type: "STATE_DRIVEN",
    syntax: `WHILE operating under ${domain} execution context, THE SYSTEM SHALL maintain full Layer-0 isolation, zero memory leaks, and strict compliance with the project Constitution.`,
    description: "Governs steady-state invariant preservation during active processing."
  });

  // 4. Ubiquitous requirement
  reqs.push({
    id: "EARS-004",
    type: "UBIQUITOUS",
    syntax: `THE SYSTEM SHALL continuously enforce zero plaintext secrets, type-safe data contracts, and deterministic exit-code evidence for all completed operations.`,
    description: "Permanent non-negotiable architectural invariant."
  });

  return reqs;
}

/**
 * Generates BDD GIVEN-WHEN-THEN acceptance criteria.
 */
export function synthesizeBddScenarios(prompt: string, domain: string): BddScenario[] {
  const clean = prompt.trim().replace(/\.+$/, "");
  return [
    {
      id: "BDD-001",
      title: `Nominal Execution of "${clean}"`,
      given: `the system is initialized in a clean epistemic state with all preconditions satisfied`,
      when: `the directive "${clean}" is invoked with verified inputs`,
      then: `the operation executes to completion emitting valid, typed results`,
      and: [
        `no architectural boundaries are breached`,
        `terminal logs record verification with exit code 0`
      ]
    },
    {
      id: "BDD-002",
      title: `Fault Tolerance and Invalid Input Rejection in ${domain}`,
      given: `the execution environment receives malformed, malicious, or out-of-boundary parameters`,
      when: `the validation gate intercepts the request`,
      then: `the transaction is safely rejected without side effects or unhandled exceptions`,
      and: [
        `state remains fully consistent with previous known-good baseline`,
        `error telemetry is logged in standard diagnostic format`
      ]
    }
  ];
}

/**
 * Builds model-specific cognitive reasoning scaffolding.
 */
export function buildModelScaffold(family: ModelFamily, strictLevel: StrictnessLevel): ModelReasoningScaffold {
  const isSovereign = strictLevel === "sovereign";

  switch (family) {
    case "claude":
      return {
        family: "claude",
        thinkingStrategy: "Extended Multi-Perspective Thinking with Architectural Refinement",
        scaffoldingDirectives: [
          "Use deep internal thinking to survey the entire codebase structure before generating any modification.",
          "Cite exact clickable file:// paths and line ranges for all references.",
          "Formulate multiple candidate solutions, evaluate trade-offs, and reject inferior alternatives with explicit rationale.",
          "Ensure zero runtime external dependencies and preserve all existing comments and docstrings."
        ],
        antiHallucinationRules: [
          "Never assume a module or function exists; verify its declaration in the file tree first.",
          "Do not produce partial snippets or placeholders like '// rest of code'; provide drop-in complete blocks.",
          "Always verify syntax with `node --check` or equivalent static typecheck before claiming success."
        ]
      };

    case "openai":
      return {
        family: "openai",
        thinkingStrategy: "Rigorous Step-by-Step Chain-of-Thought with Invariant Verification",
        scaffoldingDirectives: [
          "Decompose the objective into an atomic directed acyclic graph (DAG) of verification steps.",
          "Validate all mathematical bounds, data structures, and edge-case invariants prior to synthesis.",
          "Ensure strict type contracts matching TypeScript strict mode with no implicit `any`."
        ],
        antiHallucinationRules: [
          "Verify all imports resolve against local source directories.",
          "Never emit synthetic API keys or placeholder tokens.",
          "Demand executable verification evidence (exit code 0) for every assertion."
        ]
      };

    case "gemini":
      return {
        family: "gemini",
        thinkingStrategy: "Multimodal Systematic Decomposition and High-Fidelity Synthesis",
        scaffoldingDirectives: [
          "Structure responses with crystal-clear markdown hierarchy, tables, and sequence diagrams where applicable.",
          "Prioritize high-performance, cache-friendly data structures and zero-overhead idioms.",
          "Verify conformance with official SDK specifications and avoid deprecated interfaces."
        ],
        antiHallucinationRules: [
          "Adhere strictly to verified facts in the project knowledge store.",
          "Never guess tool arguments; inspect MCP tool schemas before calling.",
          "Preserve Hexagonal isolation between presentation, application, and domain layers."
        ]
      };

    case "deepseek":
      return {
        family: "deepseek",
        thinkingStrategy: "Deep Mathematical Reasoning, Counter-Example Exploration & Formal Verification",
        scaffoldingDirectives: [
          "Conduct an adversarial counter-example analysis: prove why naive implementations will fail under edge cases.",
          "Verify time complexity O(N) and spatial footprint O(1) across all core algorithmic pathways.",
          "Enforce formal state machine invariants across all concurrent transitions."
        ],
        antiHallucinationRules: [
          "Reject informal vibe assumptions; test each hypothesis against formal logic.",
          "Confirm zero memory leaks in hot loops and buffer allocations."
        ]
      };

    case "llama":
    case "universal":
    default:
      return {
        family: "universal",
        thinkingStrategy: "Deterministic Constitutional Engineering Scaffolding",
        scaffoldingDirectives: [
          "Strict adherence to EOS Supreme Operational Commandments (Laws I through VII).",
          "Zero Vibe Coding: write code strictly derived from formal EARS and BDD specifications.",
          "Deliver complete, verifiable, production-ready code with concrete exit code evidence."
        ],
        antiHallucinationRules: [
          "No imaginary APIs or packages outside the standard library.",
          "All assertions must be backed by terminal execution evidence."
        ]
      };
  }
}

/**
 * Amplifies any natural language prompt into a sovereign, high-fidelity prompt package.
 */
export function amplifyPrompt(req: AmplifiedPromptRequest): AmplifiedPromptResult {
  const model = req.targetModel || "universal";
  const strict = req.strictLevel || "hardened";
  const domain = req.projectDomain || detectDomain(req.rawPrompt);
  const ears = synthesizeEarsRequirements(req.rawPrompt, domain);
  const bdd = synthesizeBddScenarios(req.rawPrompt, domain);
  const scaffold = buildModelScaffold(model, strict);

  const invariants = [
    "Zero External Runtime Dependencies (Layer-0 Pure Node.js / TypeScript).",
    "Fail-Closed Security: invalid inputs or exceptions trigger immediate safe abortion.",
    "Deterministic Evidence: claims of correctness require exit code 0 terminal proof.",
    "Hexagonal Layering: Domain logic remains 100% pure; UI and external drivers are decoupled."
  ];

  const executionSteps = [
    `1. INTAKE & SPECIFICATION: Review EARS requirements [${ears.map((e) => e.id).join(", ")}] and BDD scenarios [${bdd.map((b) => b.id).join(", ")}].`,
    `2. ARCHITECTURAL ISOLATION: Confirm module boundaries within ${domain} with 0 circular imports.`,
    `3. IMPLEMENTATION: Synthesize complete, production-grade logic satisfying all invariant contracts.`,
    `4. VERIFICATION & EVIDENCE: Execute automated tests and capture raw terminal output proving pass state (Exit Code 0).`
  ];

  // Synthesize System Prompt
  const synthesizedSystemPrompt = [
    `# SOVEREIGN SPECIFICATION SCAFFOLD (EOS PROMETHEUS AMPLIFIER)`,
    `You are operating under the EOS Agent Constitution. All vibe coding is strictly prohibited.`,
    `Target Model Architecture: ${scaffold.family.toUpperCase()} | Cognitive Mode: ${scaffold.thinkingStrategy}`,
    ``,
    `## NON-NEGOTIABLE INVARIANTS:`,
    ...invariants.map((inv) => `- ${inv}`),
    ``,
    `## MODEL REASONING DIRECTIVES:`,
    ...scaffold.scaffoldingDirectives.map((dir) => `* ${dir}`),
    ``,
    `## ANTI-HALLUCINATION CONTRACT:`,
    ...scaffold.antiHallucinationRules.map((rule) => `! ${rule}`)
  ].join("\n");

  // Synthesize User Prompt
  const synthesizedUserPrompt = [
    `## ORIGINAL USER DIRECTIVE:`,
    `"${req.rawPrompt}"`,
    ``,
    `## FORMAL EARS SPECIFICATION (ISO 29148 / IEEE 830):`,
    ...ears.map((e) => `### ${e.id} [${e.type}]:\n${e.syntax}\n_${e.description}_\n`),
    `## ACCEPTANCE CRITERIA (BDD GIVEN-WHEN-THEN):`,
    ...bdd.map((b) => [
      `### ${b.id}: ${b.title}`,
      `GIVEN ${b.given}`,
      `WHEN ${b.when}`,
      `THEN ${b.then}`,
      ...b.and.map((a) => `  AND ${a}`),
      ``
    ].join("\n")),
    req.contextFiles && req.contextFiles.length > 0
      ? `## REFERENCED CONTEXT FILES:\n${req.contextFiles.map((f) => `- ${f}`).join("\n")}\n`
      : "",
    `## MANDATORY EXECUTION DAG:`,
    ...executionSteps.map((step) => step),
    ``,
    `Proceed with implementation. Deliver complete, production-ready code fulfilling every EARS and BDD scenario.`
  ].join("\n");

  return {
    originalPrompt: req.rawPrompt,
    targetModel: model,
    detectedDomain: domain,
    identifiedIntent: req.rawPrompt.trim(),
    earsRequirements: ears,
    bddScenarios: bdd,
    invariants,
    modelScaffold: scaffold,
    synthesizedSystemPrompt,
    synthesizedUserPrompt,
    executionSteps
  };
}
