# EOS — Matriz de asimilación técnica (v0)

```text
document_id: EOS_ASSIMILATION_MATRIX
date: 2026-08-21
status: DRAFT_HEURISTIC — licenses/commits NOT yet verified per repo
clone_install: FORBIDDEN until NETWORK + license gate
companion:
  - docs/intelligence/directories/AI_OFFICIAL_GITHUB_DIRECTORY_ES.md
  - docs/intelligence/directories/AI_GITHUB_RESEARCH_NOTES.md
  - docs/intelligence/directories/EOS_ASSIMILATION_MATRIX.csv
  - audit/eos-complete-audit-001/EOS_V2_EXTERNAL_ASSIMILATION_ADR.md
```

## Cómo usar esta matriz

Cada fila del CSV exige, antes de cualquier `ADOPT` ejecutable:

| Campo | Significado |
| --- | --- |
| `license_status` | Debe pasar de `UNKNOWN_PENDING_REPO_CHECK` a licencia leída |
| `commit_or_release_studied` | SHA o tag concreto |
| `decision` | `ADOPT` \| `ADAPT` \| `INSPIRE` \| `DEFER` \| `REJECT` |
| `gate_required_before_install` | HITL + NETWORK si aplica |
| `maps_to_eos_mission` | C2…C9 o POST_MVP — **no** saltar C1.5c |

**Regla:** URL oficial ≠ apto para EOS. Confianza sintética de filas sin commit estudiado ≤ **0.70**.

## Resumen de decisiones provisionales (ruta P0)

| Fuente | Decisión provisional | Por qué |
| --- | --- | --- |
| MCP specification | **ADAPT** | EOS ya opera MCP (`eos-local`); alinear contratos |
| Engram (Gentleman) | **ADOPT** (protocolo) | Ya cableado vía MCP; no re-vendor |
| Gentleman Programming Book (PDF local, RSC-0016) | **ADAPT** (tesis) | SDD DAG, Tony Stark/HITL, gatekeeper, TDD, Scope Rule condicional; no versionar PDF ni vendor Claude |
| Semantic Kernel / Claude Code / OpenAI Agents / LangGraph / OpenHands / IBM Context Forge | **INSPIRE** o **ADAPT** conceptos | Alimentan C2–C8; no monorepo |
| AutoGen | **DEFER** | Riesgo de bucles sin HITL hasta C3 |
| OpenShell / NemoClaw / vLLM / Transformers | **DEFER** | Post-MVP / infra |
| TensorRT-LLM / GPU kernels | **REJECT** para core L0 | Fuera del Mission OS Node builtins |

## Orden de trabajo gobernado

```text
1) C1.5c commit RC (gate Director)     ← bloqueante operativo
2) C1.5d audit
3) C2 ATS + commitTransition           ← puede comparar INSPIRE LangGraph FSM
4) C3–C8 cierre local
5) Deep-license pass on P0 matrix rows (read-only study OK; install needs gate)
6) POST_MVP: OpenShell threat model, inference stacks
```

## Gate para profundizar una fila (estudio con clone)

```text
AUTORIZO ESTUDIO AISLADO DE REPO EXTERNO
REPO: <url>
COMMIT_OR_TAG: <sha|tag>
MODE: READ_ONLY_WORKTREE (no merge a EOS)
NETWORK: YES (clone only)
INSTALL_INTO_EOS: NO
FUNDACION: FROZEN
```

## Gate para ADOPT/ADAPT con dependencia npm/go

```text
AUTORIZO INTEGRACIÓN DEPENDENCIA EXTERNA
REPO: <url>@<commit>
LICENSE: <id> REVIEWED
DEP_POLICY: L0→L1|L2
LOCKFILE: REQUIRED
BLAST_RADIUS: ≤3 modules
TESTS: positive+negative listed
MERGE_MAIN: NO unless separate gate
```
