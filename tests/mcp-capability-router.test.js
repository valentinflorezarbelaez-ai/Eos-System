/**
 * @file tests/mcp-capability-router.test.js
 * @description TDD suite for SPEC-0009 Dynamic MCP Capability Router & Multi-Tool Orchestrator.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  McpCapabilityRouter,
  parseTaskCapabilities,
  CAPABILITY_MAP,
  McpCapabilityError
} from '../src/core/mcp/mcp-capability-router.js';

describe('McpCapabilityRouter (SPEC-0009)', () => {
  describe('parseTaskCapabilities', () => {
    it('extracts comma-separated capabilities from @needs(...) annotation', () => {
      const task = '- [ ] Implement visual regression tests @needs(BROWSER_QA, DESIGN)';
      const caps = parseTaskCapabilities(task);
      assert.deepEqual(caps, ['BROWSER_QA', 'DESIGN']);
    });

    it('handles mixed case and extra whitespace gracefully', () => {
      const task = '- [x] Deploy edge function @needs(  database , vcs  ) in production';
      const caps = parseTaskCapabilities(task);
      assert.deepEqual(caps, ['DATABASE', 'VCS']);
    });

    it('returns empty array when no @needs annotation is present', () => {
      const task = '- [ ] Plain task without any tool requirement annotations';
      const caps = parseTaskCapabilities(task);
      assert.deepEqual(caps, []);
    });

    it('handles falsy or malformed input fail-closed', () => {
      assert.deepEqual(parseTaskCapabilities(''), []);
      assert.deepEqual(parseTaskCapabilities(null), []);
      assert.deepEqual(parseTaskCapabilities(undefined), []);
      assert.deepEqual(parseTaskCapabilities(123), []);
    });
  });

  describe('resolveMcpEnvelope', () => {
    const mockAvailableConfig = {
      servers: {
        'StitchMCP': { command: 'npx' },
        'chrome-devtools-mcp': { command: 'npx' },
        'github': { command: 'npx' },
        'engram': { command: 'engram' },
        'eos-local': { command: 'node' }
      }
    };

    it('projects minimal servers for DESIGN and BROWSER_QA in VERIFY phase (L0_READONLY)', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      const envelope = router.resolveMcpEnvelope({
        capabilities: ['DESIGN', 'BROWSER_QA'],
        phase: 'VERIFY'
      });

      assert.equal(envelope.status, 'RESOLVED');
      assert.equal(envelope.profile, 'L0_READONLY');
      assert.equal(envelope.authority.writeAllowed, false);
      assert.equal(envelope.PRODUCTION_READY, 'NO');

      // Contains requested capabilities
      assert.ok(envelope.resolvedServers.includes('StitchMCP'));
      assert.ok(envelope.resolvedServers.includes('chrome-devtools-mcp'));
      // Contains baseline core servers
      assert.ok(envelope.resolvedServers.includes('eos-local'));
      assert.ok(envelope.resolvedServers.includes('engram'));
      // Does NOT contain unrequested servers
      assert.ok(!envelope.resolvedServers.includes('github'));
      assert.ok(!envelope.resolvedServers.includes('supabase'));
    });

    it('enforces L1_LOCAL_GOVERNED and writeAllowed=true during APPLY phase', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      const envelope = router.resolveMcpEnvelope({
        capabilities: ['VCS'],
        phase: 'APPLY'
      });

      assert.equal(envelope.status, 'RESOLVED');
      assert.equal(envelope.profile, 'L1_LOCAL_GOVERNED');
      assert.equal(envelope.authority.writeAllowed, true);
      assert.ok(envelope.resolvedServers.includes('github'));
      assert.ok(envelope.authority.restrictedRoots.some((r) => r.toLowerCase().includes('fundacion')));
    });

    it('resolves capabilities directly from task description string', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      const taskText = '- [ ] Validate commit history @needs(VCS)';
      const envelope = router.resolveMcpEnvelope({
        taskText,
        phase: 'REVIEW'
      });

      assert.equal(envelope.status, 'RESOLVED');
      assert.deepEqual(envelope.capabilities, ['VCS']);
      assert.ok(envelope.resolvedServers.includes('github'));
    });

    it('fails closed with status DEFICIENT when required capability has no active server', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      const envelope = router.resolveMcpEnvelope({
        capabilities: ['DATABASE'], // Not in mockAvailableConfig
        phase: 'APPLY'
      });

      assert.equal(envelope.status, 'DEFICIENT');
      assert.ok(envelope.missingRequiredServers.includes('DATABASE'));
      assert.ok(!envelope.resolvedServers.includes('supabase'));
      assert.ok(!envelope.resolvedServers.includes('postgres'));
    });

    it('throws McpCapabilityError when phase is invalid or unrecognized', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      assert.throws(
        () => router.resolveMcpEnvelope({ capabilities: ['VCS'], phase: 'UNKNOWN_PHASE' }),
        (err) => err instanceof McpCapabilityError && err.code === 'INVALID_PHASE'
      );
    });

    it('returns defensively immutable envelope', () => {
      const router = new McpCapabilityRouter({ availableConfig: mockAvailableConfig });
      const envelope = router.resolveMcpEnvelope({
        capabilities: ['VCS'],
        phase: 'APPLY'
      });

      assert.throws(() => {
        envelope.resolvedServers.push('malicious-server');
      }, TypeError);
    });
  });

  describe('Constitutional Invariants', () => {
    it('always preserves Fundacion Delta=0 and PRODUCTION_READY=NO', () => {
      const router = new McpCapabilityRouter();
      const envelope = router.resolveMcpEnvelope({
        capabilities: ['CORE_GOVERNANCE'],
        phase: 'INTAKE'
      });
      assert.equal(envelope.PRODUCTION_READY, 'NO');
      assert.ok(envelope.authority.restrictedRoots.length > 0);
    });
  });
});
