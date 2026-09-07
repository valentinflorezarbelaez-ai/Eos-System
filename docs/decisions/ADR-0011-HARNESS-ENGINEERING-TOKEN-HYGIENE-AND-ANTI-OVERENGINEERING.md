# Puntero de decisión — ADR-0011

**Identificador:** `ADR-0011`  
**Fecha:** 2026-09-07  
**Tipo:** puntero (no es el cuerpo del ADR)  
**Autoridad de contenido:** Architecture Decision Record  

El registro canónico vive en:

[`docs/architecture/adrs/ADR-0011-harness-engineering-token-hygiene-and-anti-overengineering.md`](../architecture/adrs/ADR-0011-harness-engineering-token-hygiene-and-anti-overengineering.md)

`docs/decisions/` guarda autorizaciones del Product Owner y **punteros**. No se duplica el ADR aquí (un solo SSOT, ADR-0001).

Resumen operativo: Adopción formal de la doctrina de Harness Engineering, higiene de tokens y la escalera de decisiones anti-sobreingeniería (Ponytail Decision Ladder). Establece que la verificación pre-merge debe basarse en suites deterministas de sensores automatizados y conformidad con la especificación (estándar Stripe/Vercel), eliminando el cuello de botella de la revisión manual línea por línea y prohibiendo abstracciones prematuras y polución de contexto.
