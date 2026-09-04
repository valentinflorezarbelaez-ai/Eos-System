# LIVING SPECIFICATION: KNOWLEDGE ONTOLOGY
**ID de Misión:** `MIS-ONT-002`  
**Estado:** `VALIDATED`  
**Fecha:** 2026-08-27  

---

## 1. Contexto y Objetivos
El `EOSKnowledgeOntology` es el grafo relacional determinista que modela y gobierna las conexiones entre entidades dentro del ecosistema EOS (Gobernanza, Arquitectura, Métricas y Misiones), exponiendo interfaces de consulta e interconexión mediante herramientas canónicas MCP.

---

## 2. Requerimientos Funcionales en Sintaxis EARS

### [REQ-EARS-ONT-01] Registro Taxonómico de Nodos
* **CUANDO** el sistema recibe un nuevo nodo de conocimiento (entidad, regla o ADR), **EL SISTEMA DEBE** validar que posea un identificador no vacío y un tipo perteneciente a la taxonomía permitida (`GOVERNANCE`, `ARCHITECTURE`, `METRIC`, `MISSION`).

### [REQ-EARS-ONT-02] Prohibición de Enlaces Huérfanos
* **SI** se intenta crear un enlace relacional donde el nodo origen o el nodo destino no existen previamente en el grafo, **ENTONCES EL SISTEMA DEBE** rechazar la operación arrojando el error `ORPHAN_LINK_PROHIBITED`.

### [REQ-EARS-ONT-03] Rechazo de Tipos no Permitidos
* **SI** el tipo de nodo no pertenece a la taxonomía autorizada, **ENTONCES EL SISTEMA DEBE** rechazar la inserción con error de taxonomía ontológica.

### [REQ-EARS-ONT-04] Consulta de Nodos vía MCP (`eos.ontology.query`)
* **CUANDO** el sistema recibe una llamada a `eos.ontology.query` con un `idNodo` válido, **EL SISTEMA DEBE** retornar la estructura completa del nodo y sus enlaces asociados si existe, o un indicador seguro de ausencia.

### [REQ-EARS-ONT-05] Enlace Relacional Criptográfico vía MCP (`eos.ontology.link`)
* **CUANDO** el sistema recibe una llamada a `eos.ontology.link` con dos identificadores válidos y un tipo de relación indexado (`GOVERNED_BY`, `DEPENDS_ON`, `AUDITED_BY`, `USES`), **EL SISTEMA DEBE** ejecutar la unión direccional y registrar la transacción con firma inmutable en el Ledger.

---

## 3. Criterios de Aceptación BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Inserción y consulta exitosa de un nodo vía MCP
  DADO que el grafo ontológico contiene el nodo "AGENTS-CONSTITUTION"
  CUANDO se invoca "eos.ontology.query" con idNodo "AGENTS-CONSTITUTION"
  ENTONCES retorna el nodo con sus metadatos y lista de enlaces

ESCENARIO: Enlace relacional entre componentes de arquitectura y gobernanza
  DADO los nodos existentes "CORE-KERNEL" y "AGENTS-CONSTITUTION"
  CUANDO se invoca "eos.ontology.link" con tipoRelacion "GOVERNED_BY"
  ENTONCES la relación queda fijada en el grafo
  Y se sella la transacción en el Ledger persistente

ESCENARIO: Bloqueo de enlaces huérfanos
  DADO un nodo origen existente y un nodo destino no registrado
  CUANDO se intenta crear un enlace direccional
  ENTONCES arroja error "ORPHAN_LINK_PROHIBITED"
```
