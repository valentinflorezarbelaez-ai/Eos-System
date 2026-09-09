# EOS — Adopción LIDR Harness Engineering Workshop (2026-09-09)

**Branch:** `cursor/eos-ladder7-lidr-harness-adoption`  
**Audit base tip (live main):** `e431e2c2886f687c642944bbfe426aa48018e84e` (e431e2c — post L6 R6 #73)  
**Freeze tip (stale hasta S1):** `4753240eb003ecb3948e17d93e5511a7b35a40f0`  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE  
**PRODUCTION_READY:** NO (sin cambio; fuera de alcance voltearlo)  
**Fundacion:** Delta=0 (sin tocar)  
**Alcance:** Documento de adopción + evidencia de mapeo LIDR → vocabulario EOS. **No** implementa S1–S6. **No** reescribe fusion.

---

## 1. Fuentes (citar siempre)

| # | Fuente | Rol |
| --- | --- | --- |
| 1 | https://lidr.notion.site/material-workshop-harness-engineering-202609 | Material Notion workshop (202609) — primario histórico + intake |
| 2 | https://www.lidr.co/grabacion-workshop-harness-engineering/ | Página de grabación (sin transcript completo; apunta a blogs/repo) |
| 3 | https://www.lidr.co/blog/que-es-harness-engineering/ | Anatomía harness, lifecycle de contexto, guías/sensores, ratchet |
| 4 | https://www.lidr.co/blog/como-ahorrar-tokens-en-desarrollo-de-software/ | Tokens, cache, routing, herramientas open source (cifras de proyecto) |
| 5 | https://github.com/LIDR-academy/lidr-specboot | Spec-Boot: flujo slash + skills + SSOT por symlinks |
| 6 | `docs/intake/research_intel/LIDR-HARNESS-ENGINEERING-202609.md` | Intake local `INTAKE_COMPLETE` (2026-09-07) |

---

## 2. Modelo LIDR → vocabulario EOS

### 2.1 Ecuación, pirámide y lifecycle de contexto

> **Agent = Model + Harness** (Mitchell Hashimoto). Si el modelo es la CPU y el contexto es la RAM, el harness es el sistema operativo.  
> Fuente: https://www.lidr.co/blog/que-es-harness-engineering/

Pirámide de autonomía:

1. **Context Engineering (base)** — *qué* información necesita el agente.
2. **Harness Engineering (media)** — *cuándo* inyectar / compactar / descartar; tools; sandbox; checks.
3. **Loop Engineering (cúspide)** — disparar → evaluar → decidir siguiente paso (+ **Loop Engineering** como tercera capa de la pirámide).

Distinción crítica (blog harness):

> Context Engineering define **qué** información necesita el agente. El harness decide **cuándo inyectarla, cuándo compactarla y cuándo descartarla**.  
> Fuente: https://www.lidr.co/blog/que-es-harness-engineering/

Riesgos de lifecycle mal gestionado (mismo blog / Anthropic Engineering, citados por LIDR):

- **Context rot** — degradación por contexto ruidoso o excesivo.
- **Context anxiety** — el modelo cierra tareas prematuramente al acercarse al límite de ventana; el harness debe aportar **mecanismos de reset**.
- **Cada pieza del harness codifica asunciones sobre límites del modelo** — hay que **revisitarlas cuando cambia el modelo**.

EOS: CONSTITUTION / OpenSpec / Engram / compactación en rules cubren parte del *qué*; **falta** política explícita de lifecycle (inject/compact/discard/reset) → Ladder7 **S2/S3**.

### 2.2 TPC (Tool / Prompt / Context)

| Pilar LIDR | Definición | Mapeo EOS actual |
| --- | --- | --- |
| **Tool** | MCPs, modelos, configs, superficie expuesta | MCP SSOT + catalog lock 80==CANONICAL (P5); hooks (P3) |
| **Prompt** | Instrucciones estructuradas | AGENTS.md, `.mdc`, CONSTITUTION, base-standards |
| **Context** | **El más importante** — alinea con arquitectura | CONSTITUTION + OpenSpec + Spec-Kit + Engram; **falta** Context Pack TPC index + lifecycle (→ **S2**) |

> "Context: The most important pillar — aligns generation with architecture and project directives."  
> Fuente: Notion workshop via intake; https://lidr.notion.site/material-workshop-harness-engineering-202609

### 2.3 Guías / sensores — cuatro cuadrantes

Taxonomía Böckeler (Thoughtworks) citada por LIDR:

| | **Computational (determinista)** | **Inferential (juicio de modelo)** |
| --- | --- | --- |
| **Feedforward (guías, antes)** | Linters, tipos, Write Barrier, hooks pre | AGENTS.md / prompts de plan / subagente "plan mode" |
| **Feedback (sensores, después)** | `verify:strict`, TDD, CI seam-pack, EVD | Doctor/fusion-light observe; adversarial review LLM |

> Un harness robusto **combina los cuatro**; uno malo se queda solo en el prompt.  
> Fuente: https://www.lidr.co/blog/que-es-harness-engineering/

EOS ya tiene fuerte cuadrante computational (guides+sensors). Inferential feedback parcial (doctor ≠ verify). Formalizar matriz 4Q en Loop policy → **S3**.

### 2.4 Ratchet (Hashimoto)

> Cada vez que el agente comete un error, no lo corriges solo a mano: **añades un control para que ese error no pueda repetirse** (trinquete / ratchet). El sistema solo avanza.  
> Controles típicos: AGENTS.md, hooks, CI evals, logs de coste+fallo, subagentes especializados.  
> Fuente: https://www.lidr.co/blog/que-es-harness-engineering/ (práctica Hashimoto)

Mapeo EOS: ritual **error→regla** + routing (→ **S6**); hooks/CI ya existen como superficie de anclaje.

### 2.5 Primitivas del Harness

| # | Primitiva LIDR | Evidencia EOS | Gap residual |
| --- | --- | --- | --- |
| 1 | FS state durable | Git, evidence, `.missions`, custody/Engram | — |
| 2 | Terminal / code execution | Shell real; verify; CI | Compresión terminal opcional (rtk…) — no DoD L7 |
| 3 | Sandbox / isolation | Write Barrier ADR-0013; EXTERNAL barrier | Worktree policy + smoke → **S4** |
| 4 | Memory / search | Engram ADR-0016; custody ADR-0015 | — |
| 5 | Context management / lifecycle | Compactación en rules; Spec-Boot bridge parcial | Index TPC + inject/compact/discard/reset → **S2/S3** |
| 6 | Guides & sensors (4Q) | Guides: CONSTITUTION/AGENTS/.mdc. Sensors: verify/CI/TDD | Matriz 4Q + loop formal → **S3** |

### 2.6 Stack SDD + Spec-Boot concreto

| Framework | Rol | EOS |
| --- | --- | --- |
| **OpenSpec** | Deltas brownfield | `openspec/changes/`, `openspec/specs/` (ADR-0010) |
| **Spec-Kit** | Constitution / core gates | `CONSTITUTION.md` + verify gates |
| **Superpowers** | Comportamiento TDD / worktrees | Rules + TDD pipeline; worktree residual **S4** |
| **Spec-Boot** | Contexto compartido portable | ADR-0010 bridge; flujo concreto aún no adoptado como política |

Flujo Spec-Boot (repo LIDR; citar, no inventar más allá):

`/enrich-us` → `/ff` → `/apply` → `/verify` → `/adversarial-review` → `/archive` → `/commit`

Skills nombradas en material/repo: `enrich-us`, `using-git-worktrees`, `writing-skills`, `code-auditing`.  
SSOT de estándares vía **symlinks**.  
Fuente: https://github.com/LIDR-academy/lidr-specboot (+ grabación page / Notion).

Adopción EOS: **no** clonar el repo entero; mapear skills/flujo a S2–S4/S6 y OpenSpec existente.

### 2.7 Tokens, cache y herramientas (NON-CLAIM cifras externas)

Diseño de cache (blog tokens + blog harness):

- **Estático primero, dinámico al final** → maximizar prompt-cache hits.
- Anthropic (citado por LIDR): tokens en caché ≈ **10%** del precio de input base — **claim del material**, no auditoría EOS.
- Pregunta de iteración del harness: **"¿Qué puedo dejar de hacer?"**

Herramientas open source con **cifras publicadas por sus propios proyectos** (NON-CLAIM auditoría externa EOS):

| Tool | Función (material) | Cifra claim del proyecto |
| --- | --- | --- |
| rtk | Comprime salida de terminal | 60–90% menos tokens en comandos habituales |
| codegraph | Grafo local de código | ~57% tokens / ~35% coste / ~70% tool calls |
| caveman | Respuestas comprimidas | ~65% menos tokens de salida |
| ponytail | Anti-sobreingeniería | 80–94% menos código en sobreconstrucción |
| Headroom | Proxy de compresión de contexto | 60–95% reducción de contexto |

Fuente: https://www.lidr.co/blog/como-ahorrar-tokens-en-desarrollo-de-software/  
> "Los tokens son el diagnóstico de tu arquitectura." — mismo blog.

Adopción EOS Ladder7: **no** exige instalar estas tools; S5/S6 pueden referenciar poda/routing; install queda OUT OF SCOPE salvo PO.

### 2.8 AI Champion

> El AI Champion **no** es quien usa la IA más rápido: es quien hace que el **equipo use el mismo criterio**. Ciclo: measurement → feedback → improve → distribute.  
> Fuentes: grabación page / Notion / rol OpenAI Academy vía intake; blog relacionado LIDR AI Champion.

EOS: gobernanza local + ladders + verify = infraestructura de criterio compartido; **no** claim de madurez organizacional completa.

### 2.9 Acceleration whiplash (mantener NON-CLAIM)

METR / Faros (intake + ADR-0011 + rules): bugs +54%, incidentes/PR +242%, review +441%, percepción +20% vs medición −19%.  
**NON-CLAIM:** EOS no afirma haber resuelto el whiplash; el harness reduce superficie de fallo — **no** "resuelve cualquier problema".

---

## 3. Qué EOS ya satisface (evidencia)

| Capacidad LIDR-equivalente | Evidencia EOS |
| --- | --- |
| Constitucion / Spec-Kit core | `CONSTITUTION.md`; ADR-0010 |
| OpenSpec brownfield | `openspec/changes/*`; base-standards |
| Guides + sensors (esp. computational) | harness-engineering-standard.mdc; `verify:strict`; doctor; fusion-light; CI seam-pack |
| Write Barrier / sandbox writes | ADR-0013; Q5 mission-artifact; R5 deferred writers Choice B NON-CLAIM |
| Mission / operating loop (MCP overlay) | ADR-0014; mission-loop; MISSION_OS coherence |
| Evidence custody + Engram | ADR-0015/0016; G7; N2 |
| MCP inventory honesty | P5 catalog lock; ROI2 KEEP 19 engines |
| Complexity / AT_CEILING | Q4; R4 gate; R6 K6 CLOSED_BY_R4 |
| Harness doctrine previa | ADR-0011; intake LIDR-202609; harness + context rules |
| CI seam honesty | M5 + P2 + Q2 + R2 + R6 (`test:r4`/`test:r5`) |
| Ratchet parcial | error→docs/hooks/CI ya usados en ladders; ritual formal → S6 |

Dictamen: **COMPLETE_FOR_LOCAL_GOVERNED_USE** / **PRODUCTION_READY=NO**.

---

## 4. Qué adoptar (mapeado → Ladder 7 S1–S6)

| Adoptar (LIDR) | Traducción EOS | Paso |
| --- | --- | --- |
| Tip SSOT honesto post R1–R6 | Freeze + matrix + m4 → live tip post-audit L7 | **S1** |
| Context Pack TPC + lifecycle index | Índice Tool/Prompt/Context + refs inject/compact/discard/reset; verify lock existencia | **S2** |
| Loop Engineering + matriz 4Q guides/sensors | ADR/spec guides→act→sensors→feedback; 4 cuadrantes; doctor/mission honesty NON-CLAIM | **S3** |
| Worktree isolation (+ Spec-Boot `using-git-worktrees`) | Política + smoke | **S4** |
| Tool KEEP inventory (PO prune; "¿Qué puedo dejar de hacer?") | Inventario KEEP espejo P6 | **S5** |
| Model routing + **ratchet** error→regla | Routing por fase + ritual Hashimoto (AGENTS/hooks/CI/logs/subagents) | **S6** |

Orden: **empezar S1**.

---

## 5. Citas (URL)

1. Agent = Model + Harness — https://www.lidr.co/blog/que-es-harness-engineering/  
2. Context *qué* vs harness *cuándo* inject/compact/discard; context anxiety + reset; asunciones por modelo — mismo blog.  
3. Guías/sensores 4 cuadrantes (feedforward×feedback × computational×inferential) — mismo blog.  
4. Ratchet Hashimoto — mismo blog.  
5. TPC; Context más importante — https://lidr.notion.site/material-workshop-harness-engineering-202609  
6. Tokens diagnóstico; cache 10%; rtk/codegraph/… — https://www.lidr.co/blog/como-ahorrar-tokens-en-desarrollo-de-software/  
7. Spec-Boot flujo/skills/symlinks — https://github.com/LIDR-academy/lidr-specboot  
8. Grabación page — https://www.lidr.co/grabacion-workshop-harness-engineering/

---

## 6. NON-CLAIMS (explícitos)

- **No** afirma PRODUCTION_READY.
- **No** afirma que EOS "resuelve cualquier problema" ni que el harness elimine whiplash METR/Faros.
- **Adopción ≠ reescritura de fusion** (#26–#29) ni ROI/L2–L6.
- **Fundacion** Delta=0; App Fuerza DEFER.
- Este documento **no** implementa S1–S6.
- Cifras de rtk/codegraph/caveman/ponytail/Headroom y cache Anthropic 10% = **claims del material/proyectos**, no auditoría EOS.
- Doctor ≠ verify:strict; surrogate local ≠ GH enforcement.
- Inventario KEEP ≠ prune ejecutado; Loop policy ≠ autonomía productiva.
- Spec-Boot: citar flujo/skills — **no** claim de instalación completa del repo LIDR en EOS.

---

## 7. Relación con Ladder 7 audit

Ver `docs/releases/EOS_MATURITY_LADDER_7_AUDIT_2026-09-09.md`.  
OpenSpec: `openspec/changes/eos-ladder7-lidr-harness-adoption/`.
