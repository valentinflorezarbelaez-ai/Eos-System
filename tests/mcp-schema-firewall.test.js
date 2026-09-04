import test from 'node:test';
import assert from 'node:assert/strict';
import { EOSMCPSchemaValidator } from '../src/core/runtime/mcp-schema-validator.js';
import { CANONICAL_TOOLS } from '../src/mcp-server.js';

test('⚙️ MCP Schema Firewall — Universal Perimeter Insulation (74/74 Coverage)', async (t) => {
  const validator = new EOSMCPSchemaValidator();

  await t.test('100% of the 74 canonical tools are indexed with strict schemas in both dot and snake formats', () => {
    assert.strictEqual(CANONICAL_TOOLS.length, 78);
    for (const tool of CANONICAL_TOOLS) {
      const dotKey = tool.name;
      const snakeKey = tool.name.replace(/\./g, '_');
      assert.ok(validator.schemas[dotKey], `Schema missing for dot notation: ${dotKey}`);
      assert.ok(validator.schemas[snakeKey], `Schema missing for snake notation: ${snakeKey}`);
      assert.strictEqual(validator.schemas[dotKey].additionalProperties, false);
      assert.strictEqual(validator.schemas[snakeKey].additionalProperties, false);
    }
  });

  await t.test('accepts clean valid payloads using standard dot notation format', () => {
    const validPayload = { idMision: 'MIS-NOMINAL-01', hashEvidencia: 'sha256-abc...' };
    assert.strictEqual(validator.validate('eos.orchestrator.advance', validPayload), true);
  });

  await t.test('repels parameters injected into the core kernel boot tool schema', () => {
    const compromisedPayload = {
      unauthorized_side_channel: 'malicious_fuzz_parameter'
    };

    assert.throws(
      () => validator.validate('eos_kernel_boot', compromisedPayload),
      /SECURITY_BREACH_SCHEMA_VIOLATION/
    );
  });

  await t.test('repels parameters injected into the context expansion tool via dot notation', () => {
    const compromisedPayload = {
      rawInstruction: 'Generate clean module blueprint.',
      extraneous_payload_ego: 'intrusion_vector'
    };

    assert.throws(
      () => validator.validate('eos.intent.expand', compromisedPayload),
      /SECURITY_BREACH_SCHEMA_VIOLATION/
    );
  });

  await t.test('fails securely and blocks execution if an undocumented tool attempts to bypass the perimeter', () => {
    assert.throws(
      () => validator.validate('eos_unregistered_clandestine_tool', {}),
      /lacks an explicit governance whitelist schema/
    );
  });
});
