/**
 * @module AutonomousContractSynthesizer
 * @description Automatic type-inference and contract synthesis engine.
 * Compiles Draft 2020-12 JSON Schemas, runtime invariant validators,
 * and property-based fuzzing edge cases from raw domain samples.
 */

import { randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class AutonomousContractSynthesizer {
  constructor(options = {}) {
    this.synthesizedContracts = new Map();
  }

  /**
   * Infers JSON Schema type from a JS value
   * @private
   */
  _inferType(val) {
    if (val === null || val === undefined) return { type: 'null' };
    if (Array.isArray(val)) {
      if (val.length === 0) return { type: 'array', items: {} };
      const itemSchema = this._inferType(val[0]);
      return { type: 'array', items: itemSchema };
    }
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { type: 'integer' } : { type: 'number' };
    }
    if (typeof val === 'boolean') return { type: 'boolean' };
    if (typeof val === 'string') return { type: 'string' };
    if (typeof val === 'object') {
      return this._inferObjectSchema(val);
    }
    return { type: 'string' };
  }

  /**
   * Infers object schema recursively
   * @private
   */
  _inferObjectSchema(obj) {
    const properties = {};
    const required = [];

    for (const [key, val] of Object.entries(obj)) {
      properties[key] = this._inferType(val);
      required.push(key);
    }

    return {
      type: 'object',
      properties,
      required: required.sort(),
      additionalProperties: false
    };
  }

  /**
   * Generates property-based testing edge cases
   * @private
   */
  _generateEdgeCases(schema) {
    const edgeCases = [];

    // 1. Minimum valid object
    const validMinimal = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      if (v.type === 'string') validMinimal[k] = 'test-value';
      else if (v.type === 'integer' || v.type === 'number') validMinimal[k] = 1;
      else if (v.type === 'boolean') validMinimal[k] = true;
      else if (v.type === 'array') validMinimal[k] = [];
      else if (v.type === 'object') validMinimal[k] = {};
    }
    edgeCases.push({ label: 'VALID_MINIMAL', payload: validMinimal, expectedValid: true });

    // 2. Extra unpermitted property
    edgeCases.push({
      label: 'INVALID_ADDITIONAL_PROPERTY',
      payload: { ...validMinimal, __unauthorized_field__: 'bad' },
      expectedValid: false
    });

    // 3. Null / undefined required property
    const firstReq = (schema.required || [])[0];
    if (firstReq) {
      const missingReq = { ...validMinimal };
      delete missingReq[firstReq];
      edgeCases.push({
        label: 'INVALID_MISSING_REQUIRED_FIELD',
        payload: missingReq,
        expectedValid: false
      });
    }

    return edgeCases;
  }

  /**
   * Synthesizes a Draft 2020-12 JSON Schema and test fixtures from domain samples
   * @param {object} params
   * @param {string} params.entityName
   * @param {object} params.sampleData
   * @param {Array<string>} [params.customRequired]
   * @returns {object} Synthesized contract package
   */
  synthesizeContract(params = {}) {
    const { entityName = 'DomainEntity', sampleData = {}, customRequired } = params;

    if (typeof sampleData !== 'object' || sampleData === null) {
      throw new Error('SYNTHESIZER_ERROR: sampleData must be a non-null object');
    }

    const inferred = this._inferObjectSchema(sampleData);
    const required = Array.isArray(customRequired) ? customRequired.sort() : inferred.required;

    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: `${entityName}Schema`,
      description: `Autonomously synthesized JSON Schema for ${entityName}`,
      type: 'object',
      properties: inferred.properties,
      required,
      additionalProperties: false
    };

    const edgeCases = this._generateEdgeCases(schema);

    const contractPackage = {
      contract_id: `CTR-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      entity_name: entityName,
      schema,
      edge_cases: edgeCases,
      synthesized_at: new Date().toISOString()
    };

    contractPackage.sha256 = calculateSha256(JSON.stringify(contractPackage));
    this.synthesizedContracts.set(entityName, contractPackage);
    return contractPackage;
  }
}
