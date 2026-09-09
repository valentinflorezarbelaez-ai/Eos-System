# EOS R3 Doctor / fusion-light superficies Ladder5 - 2026-09-09

**Branch:** cursor/eos-r3-doctor-fusion-light-l5-surfaces
**Base main tip:** 92463e288ef1671f3840c87d0018e2782eb0f1e2 (R2 #69 merged)
**Alcance:** R3 ONLY (Ladder 6 K3) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only; HITL en navegador)

## Objetivo (R3 / K3 DoD)

Cerrar el hueco de honestidad operador entre doctor OBSERVED y verify DENY surfaces de Ladder5.

1. Extender POST_FUSION_CRITICAL_PATHS con MISSION_ARTIFACT_WRITE + P6_INVENTORY_LOCK
2. Subconjunto fusion-light opcional con light exports (auditMissionArtifactWritePaths / writeMissionArtifactFile / auditP6InventoryLock)
3. NON-CLAIM: doctor no equivale a verify:strict
4. Tests PASS; PRODUCTION_READY=NO
5. Evidencia docs/releases/; freeze R3; dirty DEFER

## Entregables

1. operator-doctor.js L5 paths + DOCTOR_NON_CLAIMS
2. independent-fusion-light.js L5 ids + light exports (sin ejecutar audits completos)
3. tests eos-r3 + script test:r3
4. Ajuste n3/n5/q3 fixtures
5. verify-eos REQUIRED_PATHS R3
6. Esta nota + freeze R3
7. Dirty DEFER sin stage

## Verificacion

- test:r3
- test:n3
- test:n5
- test:q3
- eos:doctor (opcional)
- verify:independent (opcional)

## No-claims

- Doctor no equivale a verify:strict (OBSERVED presencia/light).
- Fusion-light R3 no ejecuta audits completos de mission-artifact-write / p6-inventory-lock.
- Sin App Fuerza. Sin mutacion Fundacion.
- Sin R4+ en esta rama.
- Compare-only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.
