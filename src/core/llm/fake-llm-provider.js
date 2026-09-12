/**
 * @module fake-llm-provider
 * SPEC-0035 / Mission AD — Hermetic Fake LLM Provider.
 *
 * Deterministic, no-network adapter for CI and unit tests.
 * Always available; never reads API keys from the environment.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const FAKE_LLM_PRODUCTION_READY = 'NO';

export const FAKE_LLM_PROVIDER_ID = 'fake';

export const FAKE_LLM_CODES = Object.freeze({
  OK: 'OK',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

/**
 * @typedef {object} FakeCompleteRequest
 * @property {string} [prompt]
 * @property {string} [intent]
 * @property {string} [model]
 * @property {number} [maxTokens]
 * @property {Record<string, unknown>} [meta]
 */

/**
 * Create a hermetic fake LLM adapter.
 * @param {object} [options]
 * @param {(req: FakeCompleteRequest) => string} [options.responseFactory]
 * @param {string} [options.defaultResponse]
 * @returns {object}
 */
export function createFakeLlmProvider(options = {}) {
  const defaultResponse =
    typeof options.defaultResponse === 'string'
      ? options.defaultResponse
      : 'fake-ok';
  const responseFactory =
    typeof options.responseFactory === 'function'
      ? options.responseFactory
      : (req) => {
          const intent = req?.intent ? String(req.intent) : 'default';
          const prompt = req?.prompt != null ? String(req.prompt) : '';
          const snippet = prompt.slice(0, 48);
          return `fake:${intent}:${snippet || defaultResponse}`;
        };

  let completeCount = 0;

  return {
    id: FAKE_LLM_PROVIDER_ID,
    kind: 'eos-fake-llm-provider',
    PRODUCTION_READY: FAKE_LLM_PRODUCTION_READY,

    /**
     * @param {FakeCompleteRequest} request
     */
    async complete(request = {}) {
      if (request == null || typeof request !== 'object') {
        const err = new Error('fake complete requires an object request');
        err.code = FAKE_LLM_CODES.INVALID_REQUEST;
        throw err;
      }
      completeCount += 1;
      const text = responseFactory(request);
      return {
        ok: true,
        code: FAKE_LLM_CODES.OK,
        provider: FAKE_LLM_PROVIDER_ID,
        model: request.model || 'fake-deterministic-v1',
        text: String(text),
        usage: {
          promptTokens: String(request.prompt || '').length,
          completionTokens: String(text).length,
          totalTokens:
            String(request.prompt || '').length + String(text).length
        },
        meta: {
          hermetic: true,
          network: false,
          completeCount
        }
      };
    },

    async health() {
      return {
        ok: true,
        provider: FAKE_LLM_PROVIDER_ID,
        PRODUCTION_READY: FAKE_LLM_PRODUCTION_READY,
        hermetic: true,
        network: false,
        completeCount
      };
    },

    getState() {
      return {
        provider: FAKE_LLM_PROVIDER_ID,
        PRODUCTION_READY: FAKE_LLM_PRODUCTION_READY,
        hermetic: true,
        network: false,
        completeCount
      };
    }
  };
}

export default createFakeLlmProvider;
