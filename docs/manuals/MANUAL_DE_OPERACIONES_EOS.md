# Manual de Operaciones de EOS (v3.7.0)

**Documento Canónico de Operación y Gobernanza Local**  
**Fecha:** 2026-08-20  
**Versión:** 3.7.0 (Baseline Cierre P3)  
**Autoridad:** Human Director & EOS Senior Systems Architect  

---

## 1. Introducción y Filosofía Operativa

EOS (**Executive Orchestration System**) es un plano de control de ingeniería local, gobernado y verificable. Su función es estructurar, delegar, supervisar y auditar tareas de ingeniería de software ejecutadas por agentes de IA (como Cursor), garantizando en todo momento:

1. **Evidencia Criptográfica sobre Reclamos**: Ninguna tarea se considera terminada sin recibos y pruebas ejecutables verificadas.
2. **Separación de Autor y Revisor**: El agente que escribe el código nunca puede auditar o aprobar su propio trabajo (`author != reviewer`).
3. **Inmutabilidad y Reversibilidad**: Mutaciones limitadas estrictamente a worktrees aislados y reversibilidad matemática comprobada ($\Delta = 0$).
4. **Resistencia ante Fallos**: Registro en un ledger hash-chained con locking consultivo, volcado a disco con `fsync` y recuperación automática ante caídas.

---

## 2. Requisitos e Instalación

### Requisitos del Sistema
- **Node.js**: `v20.x` o superior (se recomienda Node 22+ / 24+ LTS con soporte nativo de `node:test`).
- **Sistema Operativo**: Windows (PowerShell), Linux o macOS.
- **Git**: Configurado en el entorno local.

### Verificación de Integridad de la Instalación
Desde la raíz del repositorio de EOS:

```bash
# 1. Verificar la estructura y reglas de gobernanza del workspace
node scripts/verify-eos.js

# 2. Validar los 15 schemas canónicos JSON Draft 2020-12
node scripts/validate_schemas.js

# 3. Ejecutar la suite completa de 838 tests automatizados
node --test tests/*.test.js tests/**/*.test.js
```

---

## 3. Guía de Inicio Rápido (Quick Start)

Ejecuta el CLI mediante `node bin/eos.js` o `eos` si está enlazado en el PATH:

```bash
# 1. Crear una nueva misión especificando el objetivo de negocio
node bin/eos.js mission create --goal "Implementar componente Header accesible y tests unitarios"

# 2. Planificar la misión y generar los contratos de tareas atómicas
node bin/eos.js mission plan MIS-XXXXXXXX-XXXX

# 3. Empaquetar la misión para Cursor
node bin/eos.js mission package MIS-XXXXXXXX-XXXX --target cursor

# 4. Entregar el paquete a Cursor (.missions/MIS-.../cursor/CURSOR_PROMPT.md)
# El desarrollador o agente ejecuta la tarea en Cursor.

# 5. Ingerir y supervisar el paquete de retorno recibido de Cursor
node bin/eos.js mission submit MIS-XXXXXXXX-XXXX --package ruta/a/return-package.json

# 6. Generar el reporte ejecutivo final
node bin/eos.js mission report MIS-XXXXXXXX-XXXX
```

---

## 4. Comandos del CLI Canónico (`eos`)

### Comandos de Misión (`eos mission <subcomando>`)

| Comando | Argumentos | Descripción |
|---|---|---|
| `create` | `--goal "<texto>"` `[--project <path>]` | Inicializa la misión, analiza el proyecto y crea la estructura en `.missions/<id>/`. |
| `inspect` | `<mission-id>` | Muestra la fase actual, objetivo, roles y estado del ledger. |
| `plan` | `<mission-id>` | Genera tareas atómicas, evalúa roles y emite `plan.json` y `selections/SEL-*.json`. |
| `package` | `<mission-id>` `[--target cursor]` | Compila `mission-package.json` y el `CURSOR_PROMPT.md` compacto con hashes SHA-256. |
| `status` | `<mission-id>` | Consulta la máquina de estados (FSM) y checkpoints de la misión. |
| `report` | `<mission-id>` `[--format md\|json]` | Genera el informe ejecutivo de misión con procedencia epistemológica. |
| `verify` | `<mission-id>` | Audita el `integrity-manifest.json` y la cadena hash del ledger. |
| `pause` | `<mission-id>` | Pausa la misión de forma segura en un checkpoint auditable. |
| `resume` | `<mission-id>` | Reanuda una misión pausada tras autorización HITL. |
| `close` | `<mission-id>` `[--reason "<texto>"]` | Cierra formalmente la misión y registra el evento final. |
| `submit` | `<mission-id> --package <path>` | Ingiere un Return Package de Cursor y ejecuta la supervisión 8D. |

### Comandos de Roles (`eos role <subcomando>`)

| Comando | Argumentos | Descripción |
|---|---|---|
| `list` | (ninguno) | Lista todos los roles canónicos registrados en el runtime. |
| `inspect` | `<role-id>` | Muestra las capacidades, herramientas, límites de autoridad y revisor asignado. |

---

## 5. Protocolo de Trabajo con Cursor

### 1. Entrega del Paquete a Cursor
El archivo `.missions/<id>/cursor/CURSOR_PROMPT.md` contiene las instrucciones compactas para el operador de Cursor:
- Identificador de misión y tarea.
- Rol asumido por el agente.
- Raíces permitidas de lectura y escritura (`allowed_read_roots` y `allowed_write_roots`).
- Superficies protegidas prohibidas (`protected_surfaces`).
- Criterios de aceptación y comandos de test requeridos.

### 2. Estructura del Return Package de Cursor
Cursor entrega un archivo JSON que implementa el schema canónico `docs/schemas/cursor-return-package.schema.json`:

```json
{
  "schema_version": "1.0.0",
  "package_id": "RET-20260820-001",
  "mission_id": "MIS-20260820-001",
  "task_id": "TASK-20260820-01",
  "status": "COMPLETED",
  "summary": "Implementación completada con 100% de tests pasando.",
  "affected_files": [
    { "path": "src/components/Header.tsx", "action": "CREATE" }
  ],
  "diff": "+++ b/src/components/Header.tsx\n+export const Header = ...",
  "test_results": {
    "total_tests": 5,
    "passed_tests": 5,
    "failed_tests": 0,
    "pass_rate": 1.0,
    "log_excerpt": "All 5 tests passed."
  },
  "evidence": {
    "receipt_hashes": ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"]
  }
}
```

---

## 6. Supervisión Multiagente y Evaluación en 8 Dimensiones

Cuando EOS ingiere un retorno, el `MultiAgentSupervisionEngine` lo evalúa en 8 dimensiones de calidad:

1. **Fidelidad Contractual (20%)**: Presencia de todos los outputs requeridos.
2. **Corrección Técnica (30%)**: Tasa de paso de tests (debe ser 100% para `ACCEPTED`).
3. **Calidad de Evidencia (15%)**: Hashes SHA-256 de recibos presentes y verificables.
4. **Seguridad y Límites (15%)**: Cero superficies protegidas modificadas y cero secretos expuestos.
5. **Eficiencia de Costos (5%)**: Consumo de tokens dentro del presupuesto asignado.
6. **Reproducibilidad (5%)**: Tests deterministas y sin fallos intermitentes.
7. **Calidad de Handoff (5%)**: Diffs unificados limpios y archivos bien organizados.
8. **Claridad Comunicativa (5%)**: Resumen claro con riesgos y supuestos explícitos.

### Máquina de Veredictos y Reintentos
- `ACCEPTED`: Score global $\ge 80.0$, pass rate = 100% y cero violaciones de seguridad.
- `REQUEST_CORRECTION`: Si fallan tests y el número de reintentos es menor al límite (máx 2). Emite una directiva estructurada (`correction_directive`).
- `ESCALATE_HITL`: Si se superan los reintentos permitidos o si se detecta un reintento idéntico sin cambios.
- `REJECTED`: Ante cualquier intento de escribir en superficies protegidas (`docs/governance/**`, etc.).

---

## 7. Canary Local en Worktree Aislado y Rollback ($\Delta = 0$)

Para probar mutaciones sin riesgo para el repositorio principal:

1. EOS clona el fixture en `.eos/test_canary_worktree/` y toma un snapshot SHA-256 de base.
2. Aplica la mutación acotada exclusivamente a los archivos autorizados.
3. Ejecuta los tests herméticos dentro del sandbox.
4. Si la tarea finaliza o si se solicita un rollback, restaura el snapshot de base y comprueba que **todos los hashes coincidan exactamente y no existan archivos residuales ($\Delta = 0$)**.
5. Se detiene en el **Terminal Stop Gate** antes de cualquier merge a `main`.

---

## 8. Resiliencia del Ledger y Recuperación ante Caídas

El ledger canónico (`HashChainedLedger`) implementa:
- **Locking Consultivo (`.lock`)**: Serializa escrituras de múltiples agentes y limpia automáticamente locks huérfanos tras 5000ms.
- **Volcado a Disco con `fsync`**: Garantiza persistencia física inmediata en cada append.
- **Reparación de Líneas Truncadas**: Si el sistema se apaga durante una escritura, `recoverAndRepairLedger` trunca de forma segura la línea final incompleta hasta el último bloque válido.
- **Fail-Closed en Corrupción Histórica**: Si se modifica un evento intermedio, el ledger bloquea toda operación y emite una alerta de manipulación (`TAMPER_DETECTED`).

---

## 9. Taxonomía de Estados Epistémicos

| Estado | Significado Riguroso en EOS |
|---|---|
| `VERIFIED` | Probado empíricamente con tests automatizados y recibo criptográfico en el entorno local. |
| `NOT_VERIFIED` | Código o especificación escrita pero no ejecutada ni probada. |
| `NOT_RUN` | Verificación o integración que no ha sido ejecutada en esta corrida. |
| `BLOCKED` | Impedido por falta de autorización, secretos, o política de gobernanza. |
| `SIMULATION_ONLY` | Resultado obtenido en simulación offline; no representa un hecho real de producción. |

---

## 10. Procedimiento de Emergencia (Kill Switch)

Si en cualquier momento se detecta una anomalía de seguridad, una desviación crítica o una sospecha de fuga de información:

1. **Parada de Misión Inmediata**:
   ```bash
   node bin/eos.js mission pause <mission-id>
   ```
2. **Verificación de Integridad de la Cadena**:
   ```bash
   node bin/eos.js mission verify <mission-id>
   ```
3. **Reversión del Worktree**:
   El operador humano puede descartar el directorio `.eos/test_canary_worktree/` sin afectar la rama `main` ni proyectos externos, los cuales permanecen permanentemente en modo solo lectura (`LEVEL_0 / READ_ONLY`).
