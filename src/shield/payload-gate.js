/**
 * Reject a payload before it is treated as a contract.
 * Node built-ins only. Does not dispatch tools and does not read the kernel catalog.
 */

function violation(errors) {
  return { ok: false, code: 'SCHEMA_VIOLATION', errors };
}

function matchesType(value, prop) {
  if (!prop || typeof prop.type !== 'string') return false;
  if (prop.type === 'string') return typeof value === 'string';
  if (prop.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (prop.type === 'boolean') return typeof value === 'boolean';
  if (prop.type === 'array') {
    if (!Array.isArray(value)) return false;
    if (prop.items) return value.every((item) => matchesType(item, prop.items));
    return true;
  }
  return false;
}

/**
 * @param {unknown} payload
 * @param {{ type?: string, properties?: object, required?: string[], additionalProperties?: boolean }} schema
 */
export function acceptContractPayload(payload, schema) {
  if (!schema || schema.type !== 'object' || !schema.properties || typeof schema.properties !== 'object') {
    return violation([{ path: '/', message: 'schema must be an object schema with properties' }]);
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return violation([{ path: '/', message: 'payload must be a plain object' }]);
  }

  const errors = [];
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (payload[key] === undefined) {
      errors.push({ path: `/${key}`, message: 'required property missing' });
    }
  }

  const allowAdditional = schema.additionalProperties === true;
  for (const [key, value] of Object.entries(payload)) {
    const prop = schema.properties[key];
    if (!prop) {
      if (!allowAdditional) {
        errors.push({ path: `/${key}`, message: 'additional property rejected' });
      }
      continue;
    }
    if (!matchesType(value, prop)) {
      errors.push({ path: `/${key}`, message: `expected ${prop.type}` });
    }
  }

  if (errors.length > 0) return violation(errors);
  return { ok: true, contract: payload };
}

/**
 * Validate an MCP-shaped tool message. Does not call a tool.
 * @param {unknown} message
 * @param {object} schema schema for `params`
 */
export function acceptMcpToolPayload(message, schema) {
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return violation([{ path: '/', message: 'message must be an object' }]);
  }
  if (typeof message.method !== 'string' || message.method.trim() === '') {
    return violation([{ path: '/method', message: 'method must be a non-empty string' }]);
  }
  const params = message.params === undefined ? {} : message.params;
  const checked = acceptContractPayload(params, schema);
  if (!checked.ok) return checked;
  return {
    ok: true,
    contract: { method: message.method, params: checked.contract }
  };
}
