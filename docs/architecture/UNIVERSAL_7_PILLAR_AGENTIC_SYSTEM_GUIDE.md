# Guía Maestra de la Arquitectura Agéntica Universal de 7 Pilares

> **Estándar:** Universal Open Extension Standard (Plugins, MCPs, Skills, Subagents, Rules, Commands & Hooks)  
> **Alcance:** Totalmente agnóstico de lenguaje (TypeScript, Python, Rust, Go, Java, C#, C++, PHP, Ruby, Elixir, SQL, Docker, K8s).  
> **Gobernanza:** `NODE_BUILTINS_ONLY` (L0), $\Delta = 0$, JSON Schema Draft 2020-12, SHA-256 Ledger.

---

## 1. La Taxonomía Universal de los 7 Pilares

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 EOS UNIVERSAL AGENTIC EXTENSION TAXONOMY                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PLUGINS (Paquetes Modulares Distribuidos)                               │
│     • Paquetes autocontenidos que agrupan commands, skills, rules y MCPs.   │
│                                                                             │
│  2. MCPs (Model Context Protocol - JSON-RPC 2.0 stdio/HTTP)                 │
│     • Conexión estandarizada con herramientas locales y bases de datos.     │
│                                                                             │
│  3. SKILLS (Playbooks Declarativos JIT con Frontmatter YAML)                │
│     • Guías paso a paso activadas Just-in-Time por el enrutador semántico.  │
│                                                                             │
│  4. SUBAGENTS (Roles Autónomos con Autoridad Acotada)                       │
│     • Agentes especializados (Architect, Red Team, QA, Verifier, Builder).  │
│                                                                             │
│  5. RULES (Restricciones de Gobernanza y Estilo Scoped .mdc)                │
│     • Reglas obligatorias de Clean Architecture, TDD y seguridad ZTA.       │
│                                                                             │
│  6. COMMANDS (Atajos Interactivos Slash /sdd-*)                             │
│     • Comandos rápidos en chat (/sdd-resolve, /sdd-scaffold, /sdd-hud).     │
│                                                                             │
│  7. HOOKS (Interceptores Deterministas del Ciclo de Vida)                   │
│     • PreToolUse, PostToolUse, PreCommit, PostMutation, SafeModeBreaker.    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detección Agnóstica Universal de Lenguajes y Frameworks

EOS identifica de forma nativa e instantánea cualquier stack tecnológico sin requerir configuración manual:

| Ecosistema | Manifiesto de Proyecto | Test Runner Detectado | Linter / Formatter |
| :--- | :--- | :--- | :--- |
| **Node / TS / JS** | `package.json`, `tsconfig.json` | `node --test`, `vitest`, `jest` | `eslint`, `prettier` |
| **Python** | `pyproject.toml`, `requirements.txt` | `pytest`, `unittest` | `ruff`, `flake8`, `mypy` |
| **Rust** | `Cargo.toml` | `cargo test` | `clippy`, `rustfmt` |
| **Go** | `go.mod` | `go test ./...` | `golangci-lint` |
| **Java / Kotlin** | `pom.xml`, `build.gradle` | `mvn test`, `gradle test` | `checkstyle`, `spotless` |
| **C# / .NET** | `*.csproj`, `*.sln` | `dotnet test` | `dotnet format` |
| **PHP** | `composer.json` | `phpunit`, `pest` | `phpstan`, `pint` |
| **Ruby** | `Gemfile` | `rspec`, `minitest` | `rubocop` |
| **Elixir** | `mix.exs` | `mix test` | `credo` |
| **C / C++** | `CMakeLists.txt`, `Makefile` | `ctest`, `gtest` | `clang-tidy`, `cppcheck` |
| **Cloud / Infra** | `Dockerfile`, `compose.yml`, `*.tf` | Container sanity checks | `tflint`, `hadolint` |
