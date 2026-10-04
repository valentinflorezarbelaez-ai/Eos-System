/**
 * @module SchemaValidator
 * @description L0 JSON Schema subset validator (required, type, enum, properties, pattern).
 * No external deps. Fail-closed for Mission OS local contracts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_ROOT = path.resolve(__dirname, '../../../docs/schemas/local');

export class SchemaValidator {
  /**
   * @param {object} [options]
   * @param {string} [options.schemaRoot]
   */
  constructor(options = {}) {
    this.schemaRoot = options.schemaRoot || DEFAULT_SCHEMA_ROOT;
    this._cache = new Map();
  }

  loadSchema(schemaFileName) {
    if (this._cache.has(schemaFileName)) return this._cache.get(schemaFileName);

    let schemaStr;
    let p = path.join(this.schemaRoot, schemaFileName);

    try {
      // PERF: Replace fs.existsSync with direct read/catch to avoid TOCTOU and save an I/O stat call
      schemaStr = fs.readFileSync(p, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;

      const fallback = path.resolve(this.schemaRoot, '..', schemaFileName);
      try {
        schemaStr = fs.readFileSync(fallback, 'utf8');
      } catch (fallbackErr) {
        if (fallbackErr.code !== 'ENOENT') throw fallbackErr;

        const notFoundErr = new Error(`SCHEMA_NOT_FOUND: ${p}`);
        notFoundErr.code = 'SCHEMA_NOT_FOUND';
        throw notFoundErr;
      }
    }

    const schema = JSON.parse(schemaStr);
    this._cache.set(schemaFileName, schema);
    return schema;
  }

  /**
   * @returns {{ valid: boolean, errors: Array<{path:string,message:string}> }}
   */
  validate(data, schemaOrFileName) {
    const schema =
      typeof schemaOrFileName === 'string' ? this.loadSchema(schemaOrFileName) : schemaOrFileName;
    const errors = [];
    this._validateNode(data, schema, '', errors);
    return { valid: errors.length === 0, errors };
  }

  /**
   * Throws SCHEMA_VALIDATION_FAILED if invalid.
   */
  assertValid(data, schemaOrFileName, label = 'document') {
    const result = this.validate(data, schemaOrFileName);
    if (!result.valid) {
      const detail = result.errors
        .slice(0, 8)
        .map((e) => `${e.path || '/'}: ${e.message}`)
        .join('; ');
      const err = new Error(`SCHEMA_VALIDATION_FAILED [${label}]: ${detail}`);
      err.code = 'SCHEMA_VALIDATION_FAILED';
      err.errors = result.errors;
      throw err;
    }
    return result;
  }

  _validateNode(data, schema, pathStr, errors) {
    if (!schema || typeof schema !== 'object') return;

    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const ok = types.some((t) => this._matchesType(data, t));
      if (!ok) {
        errors.push({
          path: pathStr || '/',
          message: `expected type ${types.join('|')}, got ${data === null ? 'null' : typeof data}`
        });
        return;
      }
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({ path: pathStr || '/', message: `value not in enum` });
    }

    if (typeof data === 'string' && schema.pattern) {
      if (!new RegExp(schema.pattern).test(data)) {
        errors.push({ path: pathStr || '/', message: `does not match pattern ${schema.pattern}` });
      }
    }

    if (schema.type === 'object' || (data && typeof data === 'object' && !Array.isArray(data))) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(schema.required)) {
          for (const key of schema.required) {
            if (!(key in data) || data[key] === undefined) {
              errors.push({ path: pathStr ? `${pathStr}.${key}` : key, message: 'required property missing' });
            }
          }
        }
        if (schema.properties) {
          for (const [key, sub] of Object.entries(schema.properties)) {
            if (key in data && data[key] !== undefined) {
              this._validateNode(data[key], sub, pathStr ? `${pathStr}.${key}` : key, errors);
            }
          }
        }
      }
    }

    if (schema.type === 'array' && Array.isArray(data) && schema.items) {
      data.forEach((item, i) => this._validateNode(item, schema.items, `${pathStr}[${i}]`, errors));
    }
  }

  _matchesType(data, type) {
    switch (type) {
      case 'object':
        return data !== null && typeof data === 'object' && !Array.isArray(data);
      case 'array':
        return Array.isArray(data);
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number' && !Number.isNaN(data);
      case 'integer':
        return Number.isInteger(data);
      case 'boolean':
        return typeof data === 'boolean';
      case 'null':
        return data === null;
      default:
        return true;
    }
  }
}
