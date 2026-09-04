# [SPEC-JORGE-002]: Mobile-First Responsive Perfection & Fluid Ergonomics

* **Domain / Project:** `PRJ-JORGE-REMODELACIONES`
* **Status:** `APPROVED` (User Explicit Request)
* **Traceability Links:** `ITK-JORGE-001` ➔ `SPEC-JORGE-002` ➔ `PLAN-JORGE-002` ➔ `EVD-0040`

---

## 1. Context & Business Intent (The "Why")
Over 80% of residential remodeling prospects in Colombia explore housing options, quote requests, and before/after comparisons on mobile devices (smartphones, WhatsApp referrals, Instagram/Facebook links).

This specification establishes strict mobile-first ergonomics, fluid typography via CSS `clamp()`, 44px+ touch targets, seamless hamburger-to-X micro-animations, body scroll locking during drawer expansion, safe area insets for notched phones (`viewport-fit=cover`), and tablet breakpoint bridging (640px-1023px) so the page looks elite on every screen size from 320px up to 4K displays.

---

## 2. Actors & User Stories
* **US-01 (Smartphone Homeowner — Small Viewport 320px-375px)**: Como usuario con un teléfono compacto (iPhone SE / Galaxy A), quiero ver títulos y tarjetas perfectamente proporcionados sin desbordamiento horizontal ni texto cortado, para navegar de forma natural con una sola mano.
* **US-02 (Mobile Nav Drawer User)**: Como usuario móvil que abre el menú hamburguesa, quiero que el botón se transforme en un ícono de cierre 'X', que el fondo quede bloqueado para evitar scroll indeseado, y que los enlaces tengan áreas táctiles generosas (44px+).
* **US-03 (Tablet & Foldable User — 640px-900px)**: Como usuario en tablet o dispositivo plegable, quiero ver cuadrículas armónicas de paquetes (3 columnas) y confianza (2x2 o 4 columnas) que aprovechen el ancho disponible sin obligar a scroll vertical excesivo.

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Hamburger Morphing & Scroll Lock)**:
  CUANDO el usuario pulse el botón hamburguesa (`#nav-toggle`), EL SISTEMA deberá transformar las 3 barras en un aspa de cierre ('X') mediante transiciones CSS, alternar el atributo `aria-expanded`, aplicar la clase `.is-open` al menú y bloquear el scroll del documento (`document.body.style.overflow = 'hidden'`).

* **FR-02 (Event-Driven — Drawer Dismissal & Scroll Release)**:
  CUANDO el usuario seleccione un enlace del menú, presione la tecla `Escape` o haga clic fuera del drawer, EL SISTEMA deberá cerrar el menú, restaurar el botón a 3 barras y restablecer el desplazamiento natural del documento (`document.body.style.overflow = ''`).

* **FR-03 (Ubiquitous / Permanent — Safe Area Insets & Viewport Fit)**:
  EL SISTEMA declarará `viewport-fit=cover` en la metaetiqueta viewport y aplicará `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)` en el header flotante, el botón sticky de WhatsApp y el footer para prevenir recortes en pantallas con notch o barra de inicio virtual.

* **FR-04 (State-Driven — Fluid Typography Scaling)**:
  MIENTRAS la ventana gráfica del dispositivo varíe entre 320px y 1440px, EL SISTEMA escalará continuamente los títulos mediante funciones CSS `clamp()` (`clamp(1.75rem, 6vw, 2.85rem)` para Hero y `clamp(1.5rem, 5vw, 2.5rem)` para secciones), asegurando que ninguna línea de texto desborde su contenedor.

* **FR-05 (State-Driven — Ergonomic Touch Targets)**:
  MIENTRAS se rendericen elementos interactivos en viewports móviles (<768px), EL SISTEMA garantizará dimensiones táctiles mínimas de 44x44px en botones de filtro, botón hamburguesa, botón flotante y enlaces de navegación.

---

## 4. Non-Functional & Quality Requirements (NFR)

* **NFR-MBL-01 (Zero Horizontal Scroll Invariant)**:
  El documento no deberá producir desplazamiento horizontal (`scrollWidth === clientWidth`) en anchos de 320px, 360px, 375px, 390px, 412px, 768px ni 1024px.
* **NFR-MBL-02 (Symmetrical Mobile Trust Grid)**:
  La barra de confianza (`.trust-bar__grid`) adoptará una disposición 2x2 en móviles con espaciado uniforme, reduciendo la altura vertical en un 50%.
* **NFR-MBL-03 (Tablet Breakpoint Bridging)**:
  En pantallas de 640px a 1023px, la cuadrícula de paquetes (`.packages__grid`) se adaptará en 3 columnas fluidas o rejilla balanceada.
* **NFR-MBL-04 (Touch Feedback)**:
  Todos los botones y tarjetas táctiles incorporarán retroalimentación visual al toque (`:active { transform: scale(0.97); }`).

---

## 5. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Apertura y cierre del menú móvil con bloqueo de scroll
  DADO un usuario en un smartphone con viewport de 375px
  CUANDO hace tap sobre el botón de menú hamburguesa
  ENTONCES el botón se transforma suavemente en una 'X'
  Y el menú se desliza con fondo blur
  Y el scroll de la página queda completamente bloqueado

ESCENARIO 02: Cierre automático al seleccionar una sección
  DADO que el menú móvil está abierto
  CUANDO el usuario hace tap en el enlace 'PROYECTOS'
  ENTONCES el menú se cierra
  Y la página se desplaza suavemente hasta la sección '#proyectos'
  Y el scroll del documento queda liberado

ESCENARIO 03: Ausencia total de desbordamiento horizontal
  DADO un dispositivo móvil con pantalla de 320px (ancho mínimo estándar)
  CUANDO la página se carga y se recorre verticalmente hasta el footer
  ENTONCES no existe barra de desplazamiento horizontal ni margen fantasma a la derecha
```

---

## 6. Verification Plan
* Validar en múltiples viewports: 320x640, 375x812, 412x915, 768x1024.
* Probar apertura/cierre de navegación y bloqueo de scroll.
* Registrar evidencia formal en `docs/evidence/EVD-0040.json`.
