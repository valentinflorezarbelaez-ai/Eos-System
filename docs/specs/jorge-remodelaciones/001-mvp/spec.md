# [SPEC-JORGE-001]: Jorge Remodelaciones High-Performance & Accessibility Modernization

* **Domain / Project:** `PRJ-JORGE-REMODELACIONES`
* **Status:** `APPROVED` (Authorized by Product Owner)
* **Traceability Links:** `ITK-JORGE-001` ➔ `SPEC-JORGE-001` ➔ `PLAN-JORGE-001` ➔ `EVD-JORGE-0001`

---

## 1. Context & Business Intent (The "Why")
Jorge Remodelaciones & Acabados is a residential finishing and remodeling contractor operating in the Oriente Antioqueño and Valle de Aburrá regions. The landing page serves as the primary digital acquisition asset, converting apartment owners of newly delivered grey-work ("obra gris") apartments into qualified WhatsApp leads with commercial advisor Alejandra Arbeláez (`+57 310 801 1600`).

The audit revealed critical performance bottlenecks (~6.3 MB uncompressed images), WCAG 2.1 AA keyboard accessibility failures (zero visible focus rings, missing skip link), dead initialization logic in `app.js` (uninvoked canvas particles and metric counters), and missing SEO infrastructure (`robots.txt`, `sitemap.xml`, absolute OpenGraph tags). This specification formalizes the remediation and engineering requirements to bring the landing page to elite production standards.

---

## 2. Actors & User Stories
* **US-01 (Prospective Homeowner)**: Como propietario de un apartamento en obra gris, quiero explorar los acabados de cocinas y baños mediante comparadores interactivos de Antes y Después de carga ultrarrápida, para evaluar la calidad y tomar la decisión de remodelar.
* **US-02 (Mobile & Keyboard User)**: Como usuario que navega desde dispositivo móvil o mediante teclado/lector de pantalla, quiero acceder a todas las secciones, botones de WhatsApp y controles con anillos de foco visibles y controles táctiles fluidos, para cotizar sin barreras de accesibilidad.
* **US-03 (Search Engine Crawler & Social Sharer)**: Como rastreador de motores de búsqueda (Googlebot) o usuario que comparte el enlace por WhatsApp, quiero recibir metadatos canónicos, sitemap y previsualizaciones OpenGraph de alta definición, para posicionar orgánicamente y maximizar la tasa de clics (CTR).

---

## 3. Functional Requirements (EARS Syntax)

* **FR-01 (Event-Driven — Initialization Hook)**:
  CUANDO el documento HTML complete su carga (`DOMContentLoaded`), EL SISTEMA deberá inicializar simultáneamente el header con backdrop blur, la navegación móvil, el lienzo de partículas espaciales (`initParticles`), los contadores animados de métricas (`initMetricCounters`), los sliders de comparación interactiva (`initSplitSliders`), los filtros de galería (`initGalleryFilter`), el visor lightbox (`initLightbox`) y el botón flotante de WhatsApp (`initFloatingWhatsApp`).

* **FR-02 (State-Driven — Split Before/After Slider Interaction)**:
  MIENTRAS el usuario arrastre el deslizador (vía mouse, touch o teclado sobre el input de rango), EL SISTEMA deberá actualizar instantáneamente el ancho de la capa superior (`beforeLayer.style.width`) y la posición del divisor central (`handle.style.left`) sincronizados en un rango de 0% a 100% con `touch-action: pan-y`.

* **FR-03 (Event-Driven — Gallery Category Filtering)**:
  CUANDO el usuario seleccione una categoría en la botonera de filtros (`Cocina`, `Baño`, `Social`, `Clóset` o `Todos`), EL SISTEMA deberá ocultar las tarjetas que no coincidan aplicando la clase `is-hidden` y presentar las tarjetas coincidentes con transición suave sin alterar el flujo del DOM.

* **FR-04 (Event-Driven — Lightbox Modal Dialogue)**:
  CUANDO el usuario active una tarjeta de galería, EL SISTEMA deberá abrir el diálogo modal con `role="dialog"`, `aria-modal="true"`, bloquear el desplazamiento del fondo (`body.style.overflow = 'hidden'`), cargar la imagen de alta resolución con su título descriptivo y enfocar el botón de cierre.

* **FR-05 (Error / Unwanted Condition — Modal Escape & Backdrop Handling)**:
  SI el usuario presiona la tecla `Escape`, hace clic en el botón de cierre o pulsa el fondo oscurecido (`backdrop`), ENTONCES EL SISTEMA deberá cerrar el diálogo, restaurar el scroll del documento y devolver el foco al elemento que detonó la apertura.

* **FR-06 (Ubiquitous / Permanent — WhatsApp Lead Generation Routing)**:
  EL SISTEMA mantendrá enlaces de acción directa (`wa.me/573108011600`) pre-redactados con parámetros URL codificados para cada punto de contacto (Hero, Paquetes, Proceso, Hub de WhatsApp y Botón Flotante), incorporando obligatoriamente `target="_blank"` y `rel="noopener noreferrer"`.

---

## 4. Non-Functional & Quality Requirements (NFR)

* **NFR-A11Y-01 (Keyboard Focus Visibility — WCAG 2.4.7)**:
  Todos los elementos interactivos (`<a>`, `<button>`, `<input type="range">`, `[tabindex="0"]`) deberán exhibir un anillo de foco visible (`:focus-visible`) con contraste mínimo de 3:1 contra el fondo oscuro (utilizando `--corp-blue-hover: #3B82F6` con outline de 2px y outline-offset de 2px).

* **NFR-A11Y-02 (Skip to Main Content — WCAG 2.4.1)**:
  El primer elemento enfocable en el DOM dentro del `<body>` deberá ser un enlace de salto directo al contenido principal (`<a href="#main-content" class="skip-link">Saltar al contenido principal</a>`), visualmente oculto hasta recibir foco por teclado.

* **NFR-A11Y-03 (Prefers-Reduced-Motion — WCAG 2.3.3)**:
  Bajo la consulta `@media (prefers-reduced-motion: reduce)`, el sistema deberá desactivar la física interactiva del canvas de partículas, congelar las estrellas como fondo estático, eliminar transiciones largas y desactivar el scroll suave forzado.

* **NFR-PERF-01 (Media Payload Optimization & Formats)**:
  Todas las imágenes de la galería y comparadores deberán suministrarse en formato WebP con compresión de alta calidad y fallback en JPEG, reduciendo el peso total de medios de 6.3 MB a menos de 1.5 MB (>75% de reducción).

* **NFR-PERF-02 (Cumulative Layout Shift Prevention)**:
  Cada elemento `<img>` deberá contener atributos explícitos `width` y `height`, junto con `loading="lazy"` (excepto la imagen principal de Hero con `loading="eager"`) y `decoding="async"`.

* **NFR-SEO-01 (Search Engine Crawling & Canonicalization)**:
  El proyecto deberá proveer `robots.txt` permitiendo el rastreo público, `sitemap.xml` con prioridad y fecha de actualización, y la etiqueta `<link rel="canonical" href="https://jorge-remodelaciones.vercel.app/">` en `<head>`.

* **NFR-SEO-02 (Social Graph & Favicon Complete Definition)**:
  La etiqueta `og:image` deberá declarar una URL absoluta canónica, incorporando etiquetas complementarias `twitter:card="summary_large_image"` y favicon SVG/PNG embebido para evitar códigos de error 404.

* **NFR-SEC-01 (Safe External Linkage & Content Hygiene)**:
  Toda mutación de texto dinámico en el DOM utilizará `textContent` en lugar de `innerHTML`. Todos los enlaces externos continuarán asegurados con `rel="noopener noreferrer"`.

---

## 5. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Inicialización completa de componentes interactivos
  DADO que un visitante carga la página web en un navegador estándar
  CUANDO se dispara el evento 'DOMContentLoaded'
  ENTONCES la función 'initParticles' inicializa el canvas de partículas
  Y la función 'initMetricCounters' observa y anima los contadores numéricos
  Y los comparadores antes/después quedan operativos para arrastrar

ESCENARIO 02: Navegación accesible por teclado en el comparador y botones
  DADO que un usuario utiliza únicamente el teclado (tecla TAB)
  CUANDO el foco se sitúa sobre el slider de Antes/Después o cualquier botón
  ENTONCES se dibuja un contorno azul brillante (:focus-visible) claramente identificable
  Y el usuario puede modificar la posición del divisor usando las flechas izquierda y derecha

ESCENARIO 03: Respeto a preferencias de reducción de movimiento
  DADO que el sistema operativo del usuario tiene activada la opción 'Reducir movimiento'
  CUANDO el usuario ingresa a la página web
  ENTONCES el canvas de partículas no ejecuta bucle de animación interactiva (requestAnimationFrame)
  Y las transiciones de expansión/desplazamiento se ejecutan de forma instantánea

ESCENARIO 04: Rendimiento de carga y optimización de medios
  DADO un dispositivo móvil con conexión 4G limitada
  CUANDO el navegador solicita los recursos de la página
  ENTONCES el peso total transferido de imágenes no supera los 1.5 MB
  Y ninguna imagen provoca desplazamiento acumulativo de diseño (CLS < 0.05)
```

---

## 6. Scope Boundaries
* **In Scope (Dentro de alcance)**:
  - Reparación del ciclo de inicialización de `app.js` (`initParticles`, `initMetricCounters`).
  - Implementación completa de estilos de foco accesible (`:focus-visible`), enlace de salto y `prefers-reduced-motion`.
  - Optimización de imágenes (WebP con fallback, dimensiones explícitas, `decoding="async"`).
  - Creación de `robots.txt`, `sitemap.xml`, favicon y metadatos canónicos / Twitter Card en `<head>`.
  - Adición de `touch-action: pan-y` para sliders táctiles en dispositivos móviles.
* **Out of Scope (Fuera de alcance)**:
  - Reescritura del proyecto a frameworks pesados (React, Next.js, Vue).
  - Modificación del número de teléfono comercial (`+57 310 801 1600`) ni de las tarifas de los paquetes.
  - Creación de backend o base de datos externa (permanece como arquitectura JAMstack estática).

---

## 7. Verification & Proof Plan
* **Auditor Verification Checks**:
  1. `accessibility-auditor`: 0 violaciones de foco o contraste.
  2. `seo-auditor`: `robots.txt`, `sitemap.xml` y OpenGraph validados.
  3. `performance-auditor`: Reducción de peso >75% y dimensiones CLS presentes en todos los `<img>`.
  4. `quality-auditor`: Inicialización completa sin errores en consola.
* **Required Evidence Artifact**: `docs/evidence/EVD-JORGE-0001.json`
