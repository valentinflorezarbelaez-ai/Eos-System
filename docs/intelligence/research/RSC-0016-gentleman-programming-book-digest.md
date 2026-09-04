# RSC-0016 — Digest Gentleman Programming Book → EOS

**Fuente local:** `C:\Users\valen\Downloads\gentleman-programming-book.pdf` (448 págs., Alan Buscaglia / Gentleman Programming).  
**Modo:** solo tesis operativas. **No** se versiona el PDF ni se copia el libro.

## Decisión

| Campo | Valor |
|--------|--------|
| Decision | **ADAPT** |
| Blast radius | Docs + lessons + playbook (Δ constitución = 0) |
| Stack impuesto | **No** — forma de la empresa gana |

## Mapa a EOS (1:1 conceptual)

| Tesis del libro | En EOS / Cursor |
|-----------------|-----------------|
| Tony Stark decide | Human Director |
| Jarvis orquesta | EOS + Agent / gentle-ai |
| Subagentes especialistas | Task / roles / skills |
| SDD DAG + gatekeeper | proposal→…→archive + verifiers |
| PROJECT_SPECS.md | OpenSpec / artefactos de misión |
| TDD RED→GREEN | Evidencia antes de VERIFIED |
| Scope Rule / screaming arch | Solo si el front del repo lo admite |
| Hexagonal ports/adapters | Límites de módulo (inspire) |
| Agilidad ≠ ceremonias | Entrega + feedback, no solo dailies |
| Trust = re-derivación | Evidence over Claims |

## Reglas que entran al flujo (sin mutar constitución)

1. No implementar como primer acto significativo: falta proposal/spec → **parar**.
2. Fases pasan **referencias a artefactos**, no chats eternos.
3. Contrato de fase + gate: artefactos deben existir antes de avanzar.
4. Humano dirige; IA sugiere/ejecuta dentro de guía.
5. Commits profesionales; no firmar “hecho por IA”.
6. No inventar VERIFIED / PRODUCTION_READY.

## Qué no asimilar como runtime

- Anthropic API key / Claude Code como dependencia de EOS L0.
- Forzar React 19 + Tailwind + Vitest en proyectos ajenos.
- Copiar el libro o prompts verbatim al ledger.

## Evidencia de ingest

- Extracción Node `pdf-parse`: 448 páginas, ~783k caracteres (2026-08-26).
- Capítulos clave leídos: Agile, Hexagonal, Scope Rule, AI/Tony Stark/Subagents, Soft Skills, Spec-Driven Orchestration / Verifiable Trust.
- Detalle machine-readable: `RSC-0016-gentleman-programming-book-digest.json`.
