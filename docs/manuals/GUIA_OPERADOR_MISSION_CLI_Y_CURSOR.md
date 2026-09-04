# Guía Operativa de EOS: Mission CLI y Paquete para Cursor

**Documento:** MAN-OPERADOR-P3-1-001  
**Versión:** 3.1.0  
**Audiencia:** Human Director (Director de Misión)  
**Idioma:** Español Profesional / Operativo  

---

## 1. Introducción

El **Mission CLI de EOS (`bin/eos.js`)** es la interfaz que te permite comandar misiones de ingeniería completas de forma local, controlada y estructurada, generando paquetes de instrucciones compactos y verificables para trabajar con Cursor sin reconstruir contexto a mano.

---

## 2. Flujo de Trabajo Operativo Paso a Paso

```text
1. Crear Misión
   $ node bin/eos.js mission create --goal "Construir landing accesible para Trasciende" --project ./mi-proyecto

2. Planificar Tareas
   $ node bin/eos.js mission plan MIS-1724217600000-A1B2C3

3. Empaquetar para Cursor
   $ node bin/eos.js mission package MIS-1724217600000-A1B2C3 --target cursor

4. Ejecutar en Cursor y Generar Retorno
   - Abrís Cursor con el `.missions/<id>/cursor/CURSOR_PROMPT.md`.
   - Cursor produce el archivo `.cursor-return.json` al finalizar la tarea.

5. Enviar Retorno a EOS
   $ node bin/eos.js mission submit MIS-1724217600000-A1B2C3 --file .cursor-return.json

6. Verificar e Informar
   $ node bin/eos.js mission verify MIS-1724217600000-A1B2C3
   $ node bin/eos.js mission report MIS-1724217600000-A1B2C3 --format markdown
   $ node bin/eos.js mission close MIS-1724217600000-A1B2C3
```

---

## 3. Catálogo de Comandos del CLI

### A. Inicializar una Misión
```bash
node bin/eos.js mission create --goal "<objetivo>" --project <ruta-del-proyecto>
```
- **Qué hace**: Descubre el stack estático del proyecto, inicializa el ledger inmutable y crea la carpeta de trabajo en `.missions/<id>/`.

### B. Inspeccionar Estado
```bash
node bin/eos.js mission inspect <mission-id>
```
- **Qué hace**: Muestra el objetivo, el proyecto detectado, la fase actual y el número de eventos registrados.

### C. Generar el Plan de Tareas
```bash
node bin/eos.js mission plan <mission-id>
```
- **Qué hace**: Descompone el objetivo en contratos de tarea individuales (`tasks/TASK-XX.json`) con roles asignados, criterios de aceptación y presupuestos.

### D. Empaquetar para Cursor
```bash
node bin/eos.js mission package <mission-id> --target cursor
```
- **Qué hace**: Genera el archivo compacto `.missions/<id>/cursor/CURSOR_PROMPT.md` y `cursor/mission-package.json`. Las referencias a archivos se indexan por ruta y hash SHA-256 para evitar duplicar contexto innecesariamente.

### E. Ingestar y Auditar Retorno de Cursor (P3.2)
```bash
node bin/eos.js mission submit <mission-id> --file <ruta-retorno.json>
```
- **Qué hace**: Audita el paquete de retorno contra el contrato de tarea: verifica superficies protegidas, escanea fugas de secretos, evalúa pruebas (pass rate = 100%) y emite un dictamen (`ACCEPT`, `REQUEST_CORRECTION`, `REJECT`, `ESCALATE_HITL`) sin mutar archivos automáticamente.

### F. Verificar Integridad Criptográfica
```bash
node bin/eos.js mission verify <mission-id>
```
- **Qué hace**: Valida la cadena de bloques SHA-256 del ledger y contrasta los archivos de la misión contra su `integrity-manifest.json`.

### G. Emitir el Informe Ejecutivo
```bash
node bin/eos.js mission report <mission-id> --format markdown
```
- **Qué hace**: Produce el reporte ejecutivo dual con procedencia de métricas (`MEASURED`, `ESTIMATED`, `NOT_RUN`).

### H. Pausar, Reanudar o Cerrar
```bash
node bin/eos.js mission pause <mission-id>
node bin/eos.js mission resume <mission-id>
node bin/eos.js mission close <mission-id>
```

---

## 4. Estructura de Almacenamiento en Disco

Cada misión reside en un directorio aislado:

```text
.missions/<mission-id>/
├── direction.json             # Objetivo, contexto de negocio y autoridad
├── project-profile.json       # Perfil del proyecto descubierto
├── mission-package.json       # Paquete canónico conforme a schema
├── plan.json                  # Plan de ejecución y gates
├── tasks/                     # Contratos individuales de tarea
│   ├── TASK-01.json
│   └── TASK-02.json
├── cursor/                    # Paquete de entrega a Cursor
│   ├── CURSOR_PROMPT.md       # Prompt optimizado para el operador
│   └── mission-package.json
├── reports/                   # Informes ejecutivos generados
│   ├── executive-report.json
│   └── EXECUTIVE_REPORT.md
├── ledger/                    # Cadena hash SHA-256 de eventos
│   └── ledger-events.jsonl
└── integrity-manifest.json    # Hashes de integridad de todos los archivos
```

---

## 5. Invariantes y Seguridad

1. **Por defecto Read-Only (`LEVEL_0`)**: El CLI no altera código de proyectos externos en operaciones de creación, inspección o empaquetado.
2. **Sin fuga de secretos**: Ni el prompt ni el paquete JSON exportan claves o variables de entorno sensibles.
3. **Economía de tokens**: Los archivos de contexto se refieren por ruta y hash; Cursor sólo lee lo que necesita para su tarea específica.
