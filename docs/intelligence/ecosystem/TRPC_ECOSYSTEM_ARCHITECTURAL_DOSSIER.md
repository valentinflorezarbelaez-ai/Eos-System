# Dossier de Arquitectura e Inteligencia: tRPC (TypeScript Remote Procedure Call)

> **Principio Fundamental:**  
> **"It's just functions"**. tRPC elimina la necesidad de esquemas manuales y pipelines de generación de código (`codegen`) en aplicaciones TypeScript full-stack, logrando **Type-Safety de punta a punta** únicamente a través de la inferencia estática del compilador de TypeScript.

---

## 1. La Evolución de las APIs: REST vs GraphQL vs gRPC vs tRPC

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPARATIVA DE PARADIGMAS DE COMUNICACIÓN                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1] REST (Representational State Transfer)                                 │
│      • Enfoque: Recursos y Verbos HTTP (GET, POST, PUT, DELETE).            │
│      • Fricción: Desincronización frecuente de tipos entre cliente/servidor │
│        y necesidad de Swagger/OpenAPI manual o sobredocumentado.            │
│                                                                             │
│  [2] GRAPHQL                                                                │
│      • Enfoque: Grafo de consultas y esquemas declarativos (`.graphql`).    │
│      • Fricción: Complejidad de resolvers, sobrecosto en tiempo de          │
│        ejecución (parsing de queries AST) y pipelines pesados de codegen.   │
│                                                                             │
│  [3] gRPC (Protocol Buffers)                                                │
│      • Enfoque: RPC binario de altísimo rendimiento con `.proto`.          │
│      • Fricción: Requiere paso de compilación estricto y adaptadores web    │
│        complejos para navegadores (gRPC-Web).                               │
│                                                                             │
│  [4] tRPC (TypeScript RPC)                                                  │
│      • Enfoque: Llamadas a procedimientos directos sin intermediarios.      │
│      • Magia: El cliente importa SOLO `type AppRouter = typeof appRouter`.  │
│      • Ventaja: CERO código generado, CERO dependencias en runtime en el    │
│        cliente y refactorización instantánea en todo el monorepo.           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Anatomía y Bloques de Construcción de tRPC

### A. Procedimientos (`Procedures`)
El átomo ejecutor en tRPC. Se dividen en tres arquetipos:
1. **`query`**: Operaciones de solo lectura (cacheables, mapeadas internamente a HTTP GET).
2. **`mutation`**: Operaciones que mutan estado o ejecutan efectos colaterales (mapeadas a HTTP POST).
3. **`subscription`**: Flujos en tiempo real bidireccionales mediante WebSockets o SSE.

### B. Enrutadores (`Routers`)
Colecciones jerárquicas de procedimientos bajo espacios de nombres (`namespaces`):
```typescript
export const appRouter = router({
  user: userRouter,
  billing: billingRouter,
  telemetry: telemetryRouter,
});

// El contrato de tipos exportado para el cliente:
export type AppRouter = typeof appRouter;
```

### C. Contexto e Inyección de Dependencias (`Context`)
Objeto construido por cada solicitud entrante (`createContext`). Contiene sesiones de usuario, conexiones a base de datos, credenciales y telemetría accesible por todos los procedimientos.

### D. Middlewares y Cadena de Responsabilidad (`Middlewares`)
Interceptores que se ejecutan antes y después del resolver. Permiten:
* Autenticación estricta y RBAC (Role-Based Access Control).
* Validación de cuotas de tokens y rate-limiting.
* Enriquecimiento del Contexto con datos de usuario autenticado.

### E. Validación de Entrada/Salida (`Input & Output Validation`)
Integración nativa con validadores de esquema (Zod, Valibot, ArkType) que blindan los límites del sistema contra payloads maliciosos o corruptos:
```typescript
export const getUserById = publicProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    return ctx.db.users.findById(input.id);
  });
```

### F. Transformadores de Datos (`SuperJSON`)
Elimina la limitación de JSON estándar serializando transparentemente tipos de datos nativos de JavaScript (`Date`, `Map`, `Set`, `BigInt`, `RegExp`, `undefined`).

### G. Request Batching (`httpBatchLink`)
Agrupa automáticamente múltiples consultas concurrentes disparadas por el frontend en una única petición HTTP, eliminando el problema de $N+1$ viajes de red.

---

## 3. Matriz de Evaluación Arquitectónica para EOS

| Dimensión | Puntuación | Análisis Técnico |
| :--- | :--- | :--- |
| **Type Safety** | `10 / 10` | Inferencia estática pura sin sincronización manual. |
| **Developer Experience (DX)** | `10 / 10` | Autocompletado inmediato y errores en tiempo de compilación. |
| **Sobrecosto de Bundle** | `< 2 KB` | Huella de cliente prácticamente nula (`zero-runtime backend leak`). |
| **Rendimiento de Red** | `9.5 / 10` | Request batching automático y soporte HTTP/2 & WebSockets. |
| **Ajuste para Monorepos / AI**| `10 / 10` | Ideal para conectar motores de agentes con interfaces y microservicios. |
