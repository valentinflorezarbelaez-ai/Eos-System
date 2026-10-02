# SPEC-0001: Native Offline Book Reader & Near-Zero Data Engine

* **Project:** Biblioteca Gnóstica Universal (`PRJ-BIBLIOTECA-GNOSTICA`)
* **Standard:** IEEE 830 / ISO 29148 (EARS Syntax + BDD Scenarios)
* **Author:** EOS Senior Architect
* **Status:** `APPROVED`

---

## 1. Functional Requirements (EARS Syntax)

* **REQ-EARS-READ-01 (Ubiquitous):**
  EL SISTEMA proveerá un lector nativo de libros en texto digital estructurado para cada obra del catálogo, cargando los capítulos en menos de 50 milisegundos desde la memoria local.

* **REQ-EARS-READ-02 (Event-Driven):**
  CUANDO el usuario abra cualquier libro para su lectura, EL SISTEMA mostrará de forma predeterminada la pestaña `Lector Nativo Offline` con tipografía editorial EB Garamond y consumo de 0 bytes de datos móviles.

* **REQ-EARS-READ-03 (State-Driven):**
  MIENTRAS el usuario modifique las preferencias de lectura (tamaño de fuente `A- / A / A+` o tema `Obsidiana / Papiro / Medianoche`), EL SISTEMA actualizará dinámicamente los estilos visuales y persistirá la configuración en `localStorage`.

* **REQ-EARS-READ-04 (Error / Unwanted Condition):**
  SI el usuario se encuentra sin conexión a internet e intenta abrir el visor externo de AGEAC, ENTONCES EL SISTEMA conmutará automáticamente al Lector Nativo Offline y desplegará un aviso informativo amigable de 0 datos.

* **REQ-EARS-READ-05 (State-Driven):**
  MIENTRAS el usuario avance en la lectura entre capítulos, EL SISTEMA guardará la posición del último capítulo leído para dicho libro en `localStorage` bajo la clave `gnosis_read_pos_[bookId]`.

---

## 2. BDD Acceptance Criteria

```gherkin
ESCENARIO: Apertura de libro en modo sin conexión
  DADO que el usuario no tiene conexión a internet (Modo Avión activo)
  CUANDO hace clic en "Leer en Línea" o "Leer Obra" en cualquier libro del catálogo
  ENTONCES el Lector Nativo Offline se despliega inmediatamente
  Y muestra el texto estructurado del libro sin errores de red
  Y el consumo de datos móviles es de 0 KB.

ESCENARIO: Persistencia del progreso de lectura
  DADO que el usuario leyó hasta el Capítulo 3 de "Hercólubus o Planeta Rojo"
  CUANDO cierra el visor y reabre la misma obra posteriormente
  ENTONCES el lector restaura automáticamente la lectura en el Capítulo 3
  Y muestra la barra de progreso correspondiente.

ESCENARIO: Conmutación de tema visual de lectura
  DADO que el usuario prefiere lectura nocturna de bajo brillo
  CUANDO selecciona el tema "Obsidiana" (OLED Negro)
  ENTONCES el fondo cambia a #050508 con tipografía dorada #BFA84C y marfil #FFF7D6
  Y el contraste cumple con el estándar WCAG 2.1 AA.
```
