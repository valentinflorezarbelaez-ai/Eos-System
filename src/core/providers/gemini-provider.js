/**
 * @file gemini-provider.js
 * @description Pure Node.js native Google Gemini AI client (SPEC-0013 / Tier-2).
 *
 * Implements direct REST invocation of Google Generative Language API
 * with secure environment resolution, deterministic timeouts, JSON mode,
 * and bounded memory protection.
 *
 * PRODUCTION_READY: NO | Fundacion Delta=0 | Zero external npm dependencies
 */

export class GeminiProviderError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code = 'GEMINI_PROVIDER_ERROR', details = {}) {
    super(message);
    this.name = 'GeminiProviderError';
    this.code = code;
    this.details = details;
  }
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB bound

/**
 * Invoke Google Gemini generateContent REST endpoint.
 *
 * @param {object} options
 * @param {string} options.prompt - Text prompt
 * @param {string} [options.systemInstruction] - Optional system prompt
 * @param {string} [options.model] - Model identifier (default: gemini-3.6-flash)
 * @param {number} [options.temperature] - Generation temperature (default: 0.2)
 * @param {boolean} [options.jsonMode] - When true, sets responseMimeType to application/json
 * @param {string} [options.apiKey] - Google AI Studio API key (default: process.env.GEMINI_API_KEY)
 * @param {number} [options.timeoutMs] - Request timeout in ms (default: 15000)
 * @param {number} [options.maxBytes] - Max response byte limit (default: 2 MiB)
 * @param {Function} [options.fetchImpl] - Injectable fetch for testing
 * @returns {Promise<{ text: string, data: any, model: string, usage: object|null }>}
 */
export async function queryGemini({
  prompt,
  systemInstruction = null,
  model = DEFAULT_GEMINI_MODEL,
  temperature = 0.2,
  jsonMode = false,
  apiKey = process.env.GEMINI_API_KEY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new GeminiProviderError(
      'PROMPT_REQUIRED: prompt must be a non-empty string',
      'PROMPT_REQUIRED'
    );
  }

  const resolvedKey = apiKey || process.env.GEMINI_API_KEY;
  if (!resolvedKey || typeof resolvedKey !== 'string' || !resolvedKey.trim()) {
    throw new GeminiProviderError(
      'KEY_MISSING: GEMINI_API_KEY not configured in environment or options',
      'KEY_MISSING'
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(resolvedKey.trim())}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: Number.isFinite(temperature) ? temperature : 0.2,
      responseMimeType: jsonMode ? 'application/json' : 'text/plain'
    }
  };

  if (systemInstruction && typeof systemInstruction === 'string' && systemInstruction.trim()) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction.trim() }]
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw new GeminiProviderError(
        `TIMEOUT: Gemini request exceeded ${timeoutMs}ms`,
        'TIMEOUT'
      );
    }
    throw new GeminiProviderError(
      `NETWORK_ERROR: ${err && err.message ? err.message : String(err)}`,
      'NETWORK_ERROR',
      { originalError: err }
    );
  } finally {
    clearTimeout(timer);
  }

  const rawText = await res.text();
  if (Buffer.byteLength(rawText, 'utf8') > maxBytes) {
    throw new GeminiProviderError(
      `PAYLOAD_OVERSIZE: Response exceeded maximum bound of ${maxBytes} bytes`,
      'PAYLOAD_OVERSIZE'
    );
  }

  let body;
  try {
    body = JSON.parse(rawText);
  } catch (err) {
    throw new GeminiProviderError(
      `PARSE_ERROR: Failed to parse Gemini response as JSON: ${rawText.slice(0, 200)}`,
      'PARSE_ERROR'
    );
  }

  if (!res.ok) {
    const errMsg = (body && body.error && body.error.message) || `HTTP error ${res.status}`;
    throw new GeminiProviderError(
      `API_ERROR: ${errMsg}`,
      'API_ERROR',
      { status: res.status, errorPayload: body && body.error }
    );
  }

  const candidate = body.candidates && body.candidates[0];
  const text = (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) || '';

  let parsedData = null;
  if (jsonMode) {
    try {
      parsedData = JSON.parse(text);
    } catch (err) {
      throw new GeminiProviderError(
        `JSON_PARSE_ERROR: Candidate text is not valid JSON in jsonMode: ${text.slice(0, 200)}`,
        'JSON_PARSE_ERROR'
      );
    }
  }

  return {
    text,
    data: parsedData,
    model,
    usage: body.usageMetadata || null
  };
}
