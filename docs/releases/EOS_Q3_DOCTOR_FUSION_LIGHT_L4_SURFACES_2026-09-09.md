# EOS Q3 Doctor / fusion-light superficies Ladder4 - 2026-09-09

**Branch:** cursor/eos-q3-doctor-fusion-light-l4-surfaces
**Base main tip:** 21455a4dab2d142d1ac9ce04a18af59b4dd94343 (Q2 #62 merged)
**Alcance:** Q3 ONLY (Ladder 5 K3) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only; HITL en navegador)

## Objetivo (Q3 / K3 DoD)

Cerrar el hueco de honestidad operador entre doctor OBSERVED y verify DENY surfaces.

1. Extender POST_FUSION_CRITICAL_PATHS con HOOKS_INSTALL + MCP_CATALOG + MISSION_LOCAL_EVD
2. Subconjunto fusion-light opcional con light exports
3. NON-CLAIM: doctor no equivale a verify:strict
4. Tests PASS; PRODUCTION_READY=NO
5. Evidencia docs/releases/; freeze Q3; dirty DEFER

## Entregables

1. operator-doctor.js L4 paths + DOCTOR_NON_CLAIMS
2. independent-fusion-light.js L4 ids + light exports
3. tests eos-q3 + script test:q3
4. Ajuste n3/n5
5. verify-eos REQUIRED_PATHS Q3
6. Esta nota + freeze Q3
7. Dirty DEFER sin stage

## Verificacion

- test:q3
- test:n3
- test:n5
- eos:doctor (opcional)
- verify:independent (opcional)

## No-claims

- Doctor no equivale a verify:strict (OBSERVED presencia/light).
- Fusion-light Q3 no ejecuta audits completos de hooks/mcp/mission-local.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin Q4+ en esta rama.
- Compare-only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
