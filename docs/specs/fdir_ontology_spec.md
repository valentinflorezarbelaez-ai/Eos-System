# LIVING SPECIFICATION: FAULT DETECTION AND RECOVERY FOR KNOWLEDGE ONTOLOGY
**ID de Misión:** `MIS-FDIR-ONT-001`  
**Estado:** `VALIDATED`  
**Fecha:** 2026-08-27  

---

## 1. Contexto y Objetivos
El componente `EOSFDIROntology` es el subsistema inmunológico especializado en la salud e integridad del grafo de conocimiento (`EOSKnowledgeOntology`). Detecta enlaces huérfanos, aísla anomalías taxonómicas y purga de forma atómica entidades corruptas, garantizando un mapa relacional coherente y libre de entropía.

---

## 2. Requerimientos Funcionales en Sintaxis EARS

### [REQ-EARS-FDIR-ONT-01] Detección y Aislamiento de Enlaces Huérfanos
* **CUANDO** el subsistema ejecuta el escaneo forense de la ontología.
* **SI** se detecta un enlace cuyo nodo destino no existe en el grafo (`ORPHAN_LINK_DETECTED`),
* **EL SISTEMA DEBE** aislar el enlace corrupto, eliminarlo de la lista activa del nodo origen y registrar la reparación `ORPHAN_LINK_PURGED`.

### [REQ-EARS-FDIR-ONT-02] Purga de Entidades con Taxonomía Inválida
* **CUANDO** se detecta un nodo cuyo tipo no pertenece a la taxonomía legal permitida (`GOVERNANCE`, `ARCHITECTURE`, `METRIC`, `MISSION`),
* **EL SISTEMA DEBE** purgar el nodo del grafo y registrar la acción `PURGED_INVALID_TYPE`.

### [REQ-EARS-FDIR-ONT-03] Registro Inmune y Estado Nominal
* **CUANDO** la auditoría concluye sin detectar desviaciones, **EL SISTEMA DEBE** retornar el estado `NOMINAL`.
* **SI** se aplicaron reparaciones, **EL SISTEMA DEBE** retornar el estado `SANED` y validar el registro telemétrico con `EOSMemoryGuard`.

---

## 3. Criterios de Aceptación BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Grafo relacional limpio y consistente
  DADO un grafo ontológico con nodos válidos y enlaces conformes
  CUANDO se ejecuta la auditoría del FDIR Ontológico
  ENTONCES retorna estado "NOMINAL" con 0 reparaciones

ESCENARIO: Detección y purga de enlace huérfano
  DADO un nodo que apunta a un identificador de destino inexistente
  CUANDO se ejecuta "auditarYSanarGrafo"
  ENTONCES el enlace huérfano es eliminado del nodo
  Y el reporte indica estado "SANED" con acción "ORPHAN_LINK_PURGED"

ESCENARIO: Purga de nodo con taxonomía ilegal
  DADO un nodo con tipo no catalogado
  CUANDO se ejecuta la sanitización
  ENTONCES el nodo es eliminado del grafo
  Y la acción queda registrada como "PURGED_INVALID_TYPE"
```
