# [SPEC-EOS-008]: Multi-Agent Consensus & Byzantine Peer Review Arbitration Engine (`eos council` / `eos arbitrate`)

* **Domain / Module:** `src/core/governance/multi-agent-arbitration-engine.js` & `src/cli/mission-cli.js`
* **Status:** `APPROVED`
* **Traceability:** `GOV-COUNCIL-001` ➔ `SPEC-EOS-008` ➔ `PLAN-EOS-008` ➔ `TASKS-EOS-008`

---

## 1. Problem Statement & Operational Doctrine
In autonomous and multi-agent development environments, allowing a single LLM or implementing agent to declare its own code `DONE` or `PRODUCTION_READY` introduces catastrophic blind spots, security vulnerabilities, and vibe coding drift. 

Under the **NASA IV&V (Independent Verification and Validation)** engineering standard and the **EOS Constitution (Law III: Evidence Over Claims)**:
1. **The Anti-Self-Certification Invariant**: No implementer may validate or approve its own modifications.
2. **Specialized Multi-Desk Balloting**: Multiple independent auditor desks must review code proposals from specialized viewpoints (Security, Architecture, Quality, Performance, Independent Verifier).
3. **Absolute Veto Authority**: The Security Desk and Architecture Desk hold binding VETO power. A single security vulnerability or architectural boundary corruption halts approval.
4. **Supermajority Quorum**: A minimum of 80% approval across non-vetoing desks is required to establish consensus.

---

## 2. Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    CODE / SPEC / ARTIFACT PROPOSAL                      │
│                  docs/specs/..., src/..., or Git Commit                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             MULTI-AGENT ARBITRATION COUNCIL (eos council)               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────┬───────────┼───────────┬───────────────┐
         ▼               ▼           ▼           ▼               ▼
┌─────────────────┐┌───────────┐┌──────────┐┌───────────┐┌──────────────┐
│ 1. SECURITY     ││2. ARCH    ││3. QUALITY││4. PERF    ││5. INDEPENDENT│
│    VETO DESK    ││   VETO    ││   DESK   ││   DESK    ││   VERIFIER   │
│    Zero secrets,││   Clean   ││   Types, ││   Tokens, ││   ExitCode 0,│
│    sanitization ││   Hexagon ││   Lints  ││   Latency ││   NASA IV&V  │
└────────┬────────┘└─────┬─────┘└────┬─────┘└─────┬─────┘└──────┬───────┘
         │               │           │            │             │
         └───────────────┴───────────┼────────────┴─────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. BYZANTINE FAULT-TOLERANT TALLY & QUORUM EVALUATOR                    │
│    - Check Vetoes (Security = 0, Architecture = 0)                      │
│    - Supermajority Check (≥ 80% APPROVE)                                │
│    - Epistemic Status Assignment: CONSENSUS_VERIFIED / REJECTED         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                 [APPROVED]                       [REJECTED]
                    │                                 │
                    ▼                                 ▼
┌──────────────────────────────────────┐┌───────────────────────────────┐
│ 7. SEALS CRYPTOGRAPHIC RECEIPT       ││ 8. REMEDIATION ROUTER         │
│    CNS-XXXX.json in docs/evidence/   ││    Generates atomic fix tasks │
│    Grants RELEASE_AUTHORIZED status  ││    for Surgical TDD Healer    │
└──────────────────────────────────────┘└───────────────────────────────┘
```

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Multi-Desk Ballot Casting)**:
  CUANDO se envíe un artefacto o propuesta de código al Consejo de Arbitraje, EL SISTEMA recolectará votos concurrentes de al menos 5 escritorios especializados: `DESK_SECURITY`, `DESK_ARCHITECTURE`, `DESK_QUALITY`, `DESK_PERFORMANCE` y `DESK_VERIFICATION`.

* **FR-02 (Event-Driven — Absolute VETO Enforcement)**:
  CUANDO el escritorio de Seguridad detecte credenciales en texto plano, inyecciones o desbordamientos, o el escritorio de Arquitectura detecte dependencias circulares o impureza de dominio, EL SISTEMA emitirá un veredicto de `VETO_REJECTED` que anulará inmediatamente cualquier mayoría.

* **FR-03 (State-Driven — NASA IV&V Anti-Self-Certification Invariant)**:
  MIENTRAS el rol de Implementador afirme haber completado la tarea (`claim: DONE`), EL SISTEMA rechazará la aprobación a menos que el escritorio de Verificación Independiente certifique evidencia ejecutable con código de salida cero (`exitCode === 0`).

* **FR-04 (State-Driven — Supermajority Quorum Tally)**:
  MIENTRAS no existan vetos activos, EL SISTEMA exigirá al menos el 80% de votos afirmativos (`APPROVE`) sobre el total de escritorios votantes para certificar el estado `CONSENSUS_VERIFIED`.

* **FR-05 (Event-Driven — Cryptographic Consensus Sealing)**:
  CUANDO el Consejo alcance consenso unánime o calificado, EL SISTEMA generará un sello de consenso inmutable (`CNS-XXXX`) firmado con hash SHA-256 conteniendo los votos individuales de todos los escritorios.

* **FR-06 (Event-Driven — Auto-Remediation Routing)**:
  CUANDO una deliberación resulte rechazada o vetada, EL SISTEMA generará una orden de remediación (`RMD-XXXX`) con las líneas exactas de falla, reglas violadas y prescripciones quirúrgicas para el reactor TDD Healer.

* **FR-07 (Ubiquitous / Permanent — Pure L0 Zero Dependencies)**:
  EL SISTEMA implementará el motor de arbitraje utilizando exclusivamente módulos nativos de Node.js (`node:fs`, `node:path`, `node:crypto`).

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Deliberación de propuesta limpia con aprobación unánime
  DADO un archivo de código limpio con pruebas unitarias pasando (exit code 0)
  CUANDO MultiAgentArbitrationEngine.conductCouncilDeliberation(proposal) es ejecutado
  ENTONCES todos los 5 escritorios emiten voto 'APPROVE'
  Y el resultado final es 'CONSENSUS_VERIFIED' con sello SHA-256

ESCENARIO 02: Ejecución de VETO vinculante por parte de Seguridad
  DADO un archivo con una clave de API o secreto en texto plano
  CUANDO el Consejo delibera sobre la propuesta
  ENTONCES el escritorio DESK_SECURITY emite voto 'VETO'
  Y el resultado final es 'VETO_REJECTED' independientemente de los demás votos

ESCENARIO 03: Cumplimiento del invariante NASA IV&V
  DADO un implementador que afirma que la tarea está 'DONE' pero sin evidencia del verificador
  CUANDO el Consejo evalúa el consenso
  ENTONCES se rechaza la propuesta con estatus 'REJECTED_MISSING_INDEPENDENT_EVIDENCE'
  Y se emite la infracción por anti-auto-certificación

ESCENARIO 04: Generación de orden de remediación ante rechazo
  DADO una deliberación que resulta rechazada
  CUANDO MultiAgentArbitrationEngine.generateRemediationOrder(consensusResult) es invocado
  ENTONCES se genera un objeto RMD-XXXX con lista de correcciones necesarias
  Y cada corrección contiene la regla violada y la acción sugerida

ESCENARIO 05: Ejecución CLI unificada
  DADO el CLI de EOS
  CUANDO se ejecuta 'eos council --project PRJ-APP-FUERZA --file <path> --json' o 'eos arbitrate'
  ENTONCES el comando retorna código 0 con la matriz completa de votos de los escritorios
```
