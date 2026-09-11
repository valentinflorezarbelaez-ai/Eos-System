# Specification — Google Gemini Provider (SPEC-0013)

## Requirements (EARS Syntax)

- **Event-Driven**: CUANDO un agente invoca `queryGemini` con un prompt válido y `GEMINI_API_KEY` presente, EL SISTEMA retorna el texto generado o payload parseado si `jsonMode: true`.
- **Error Condition**: SI `GEMINI_API_KEY` no está configurada y no se pasa `apiKey` explícita, ENTONCES EL SISTEMA lanza `GeminiProviderError` con código `KEY_MISSING` sin realizar llamadas de red.
- **Error Condition**: SI la API de Google retorna código HTTP de error (4xx/5xx), ENTONCES EL SISTEMA lanza `GeminiProviderError` con código `API_ERROR` detallando el mensaje y status HTTP.
- **State-Driven**: MIENTRAS la llamada de red esté en progreso, EL SISTEMA respeta el `timeoutMs` configurado (default 15s) abortando vía `AbortController`.

## Acceptance Criteria (BDD)

```gherkin
ESCENARIO: Generación exitosa de texto con Gemini 3.6 Flash
  DADO que GEMINI_API_KEY está configurada en el entorno
  CUANDO se llama a queryGemini con { prompt: "Ping" }
  ENTONCES la respuesta contiene texto no vacío
  Y el modelo por defecto utilizado es "gemini-3.6-flash"

ESCENARIO: Rechazo fail-closed sin API key
  DADO que GEMINI_API_KEY no está definida
  CUANDO se llama a queryGemini({ prompt: "Test", apiKey: null })
  ENTONCES la función rechaza con error de código "KEY_MISSING"
```
