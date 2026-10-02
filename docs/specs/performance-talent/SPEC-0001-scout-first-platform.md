# SPEC-0001: High-Performance Scout-First Platform & Technical Dossiers

**Project ID:** `PRJ-PERFORMANCE-TALENT`  
**Version:** `1.0.0`  
**Status:** `APPROVED`  
**Standard:** IEEE 830 / ISO 29148  
**Author:** EOS Architecture Council

---

## 1. Scope & Objective

Elevate the Performance Talent Group web platform (`https://ptg-performance-talent-group.vercel.app`) to an elite international standard. Deliver instantaneous (<1.5s LCP) scout-first player exploration, SEO-prerendered roster architecture, clean lightweight dossiers (<35 KB HTML), 1-page printable/PDF scouting sheets, and an elevated institutional manifesto communicating the agency's transcendent human mission.

---

## 2. Formal Functional Requirements (EARS Syntax)

### REQ-EARS-PTG-01: Prerendered Semantic Roster (Ubiquitous & Event-Driven)
* **Ubiquitous:** EL SISTEMA DEBE entregar el listado completo de atletas (`#roster-grid`) prerenderizado en el marcado HTML estático inicial, permitiendo lectura e indexación instantánea aún con JavaScript desactivado o en conexiones de baja velocidad.
* **Event-Driven:** CUANDO el usuario interactúe con los filtros de posición (Todos, Porteros, Defensas, Volantes, Delanteros), EL SISTEMA DEBE filtrar y ordenar las tarjetas de forma instantánea sin recarga ni destello de pantalla.

### REQ-EARS-PTG-02: Optimized Lightweight Dossiers (Ubiquitous & Error-Prevention)
* **Ubiquitous:** EL SISTEMA DEBE servir las fichas técnicas individuales (`dossiers/*.html`) con un peso de transferencia HTML inferior a 40 KB, referenciando activos de imagen externos optimizados en lugar de cadenas Base64 incrustadas.
* **Error-Prevention:** SI un activo multimedia no carga o la conexión se interrumpe, ENTONCES EL SISTEMA DEBE mostrar la silueta vectorial táctica y los datos biométricos locales sin romper el layout.

### REQ-EARS-PTG-03: Printable Scout Sheet Protocol (State-Driven)
* **State-Driven:** MIENTRAS el usuario o scout active el diálogo de impresión o guardado en PDF de una ficha técnica, EL SISTEMA DEBE aplicar una plantilla editorial ejecutiva de una sola página A4, suprimiendo fondos oscuros pesados y generando un código QR dinámico hacia el video reel oficial.

### REQ-EARS-PTG-04: Transcendent Human Manifesto (Ubiquitous)
* **Ubiquitous:** EL SISTEMA DEBE proyectar la filosofía de formación integral del futbolista (blindaje contractual, estabilidad emocional, soporte familiar y educación financiera) en las secciones institucionales y de visión.

---

## 3. BDD Acceptance Criteria (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Carga inicial del Roster sin JavaScript o con red móvil lenta
  DADO que un scout o crawler HTTP solicita "index.html"
  CUANDO se descarga el cuerpo de la página
  ENTONCES el contenedor "#roster-grid" contiene las 4 tarjetas de jugador completamente formadas con nombres, fotos, posiciones y clubes
  Y la métrica CLS es 0.00 debido a la reserva dimensional previa.

ESCENARIO: Inspección y peso de transferencia de una Ficha Técnica
  DADO que un director deportivo abre "dossiers/ficha-darlinson-murillo.html"
  CUANDO se evalúa el payload de red del documento HTML
  ENTONCES el tamaño del archivo HTML es menor a 40 KB
  Y no contiene ninguna cadena "data:image/jpeg;base64" en su interior.

ESCENARIO: Impresión ejecutiva de la Ficha Técnica para Scouts
  DADO que un scout se encuentra en la ficha técnica de un jugador
  CUANDO hace clic en "Imprimir / Exportar Ficha Scout" o pulsa Ctrl+P
  ENTONCES se activa la regla "@media print" con fondo blanco puro y tipografía de alto contraste
  Y el radar táctico de 5 ejes y la biometría se consolidan exactamente en 1 página A4
  Y se incluye un código QR escaneable hacia el video reel oficial.
```
