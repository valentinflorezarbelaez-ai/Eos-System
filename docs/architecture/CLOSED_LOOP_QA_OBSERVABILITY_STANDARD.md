# Estándar de QA y Observabilidad en Bucle Cerrado (Closed-Loop QA & Observability)

> **Principio Fundamental:**  
> El despliegue no es el final de la ingeniería; es el inicio de la **observación empírica en producción**.  
> Un sistema sin telemetría es un sistema ciego.

---

## 1. El Ciclo de Retroalimentación en Bucle Cerrado (Closed-Loop SDLC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CLOSED-LOOP QA & OBSERVABILITY PIPELINE                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] OBSERVABILIDAD DE GOLDEN SIGNALS (Google SRE Standard)                 │
│      • Latency (p50, p95, p99)                                              │
│      • Traffic (RPS, throughput)                                            │
│      • Errors (HTTP 5xx, excepciones no controladas, error rate)            │
│      • Saturation (CPU, memoria heap, pool de conexiones)                   │
│                                                                             │
│  [2] DETECCIÓN DE ANOMALÍAS Y DERIVA (Anomaly & Drift Detection)           │
│      • Comparación continua contra la línea base de rendimiento.           │
│      • Detección temprana de fugas de memoria o degradación de latencia.    │
│                                                                             │
│  [3] RETROALIMENTACIÓN AL PLANIFICADOR (Closed-Loop Auto-Remediation)       │
│      • Si el error rate supera el Error Budget (> 0.1%):                    │
│        1. Se congela el despliegue canary.                                  │
│        2. Se dispara el FDIR Kill Switch para rollback inmediato.           │
│        3. Se genera un paquete de remediación para la fase de PLAN.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariante de Observabilidad
Ningún proyecto se considera `PRODUCTION_READY` si no expone sus señales de telemetría y contratos de salud en formato OpenTelemetry estándar.
