/**
 * @module GentlemanSddBridge
 * @description Integration bridge connecting EOS with Gentleman Programming,
 * Cursor Rules (.mdc), and Engram Persistent Memory (mem_save, mem_context).
 * ROI6: formatEngramMemoryEnvelope delegates to SSOT engram-contract.
 */

import { randomBytes } from 'node:crypto';
import { buildEngramEnvelope } from '../memory/engram-contract.js';

export class GentlemanSddBridge {
  constructor(options = {}) {
    this.history = [];
  }

  /**
   * Generates a Cursor MDC Rule file tailored to the active mission and architecture
   * @param {object} missionContext
   * @returns {string} MDC formatted rule string
   */
  generateCursorRules(missionContext = {}) {
    const missionId = missionContext.mission_id || 'MIS-ACTIVE';
    const phase = missionContext.phase || 'VISION_INTAKE';
    const domain = missionContext.domain || 'CORE_SYSTEM';

    return `---
description: "EOS & Gentleman Programming SDD Governance Rule for Cursor"
globs: ["src/**/*.js", "tests/**/*.test.js"]
---
# EOS SDD Governance — ${missionId} (${phase})

## Active Phase: ${phase}
- **Architecture Philosophy**: Clean / Hexagonal / Screaming Architecture (Gentleman Programming).
- **Core Directives**:
  1. Domain entities must NEVER import Application or Infrastructure layers.
  2. All feature changes must follow TDD (Red-Green-Refactor).
  3. No mutations outside authorized write roots (\`allowed_write_roots\`).
  4. Always verify evidence before claiming DONE.
`;
  }

  /**
   * Formats an EOS architectural decision or milestone into an Engram-compliant mem_save payload.
   * ROI6: returns unified envelope (Gentleman fields + seal fields) via SSOT contract.
   * @param {object} event { title, type, decision, rationale, affectedPaths, learnings }
   * @returns {object} Engram envelope (schema eos.engram.envelope/v1)
   */
  formatEngramMemoryEnvelope(event = {}) {
    const title = event.title || 'Architectural Decision Record';
    const type = event.type || 'architecture';
    const topicKey = event.topic_key || `sdd/${(event.domain || 'core').toLowerCase()}`;

    const content = [
      `What: ${event.decision || event.what || 'Architecture milestone completed'}`,
      `Why: ${event.rationale || event.why || 'Enforce Clean Architecture and SDD invariants'}`,
      `Where: ${Array.isArray(event.affectedPaths) ? event.affectedPaths.join(', ') : event.where || 'src/core/'}`,
      event.learnings ? `Learned: ${event.learnings}` : ''
    ].filter(Boolean).join('\n');

    return buildEngramEnvelope({
      title,
      type,
      scope: 'project',
      topic_key: topicKey,
      key: topicKey,
      capture_prompt: false,
      content,
      tags: Array.isArray(event.tags) ? event.tags : ['gentleman', 'sdd']
    });
  }

  /**
   * Ingests and binds an MCP tool call request into an EOS governed TaskContract
   * @param {object} mcpCall { server, tool, arguments }
   * @returns {object} Governed Task Contract
   */
  adaptMcpCallToTaskContract(mcpCall = {}) {
    const taskId = `TASK-MCP-${Date.now()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    return {
      schema_version: '1.0.0',
      task_id: taskId,
      task_type: 'MCP_TOOL_INVOCATION',
      assigned_role: 'MCP_ADAPTER',
      objective: `Execute tool ${mcpCall.server}.${mcpCall.tool}`,
      input_payload: mcpCall.arguments || {},
      allowed_tools: [`${mcpCall.server}.${mcpCall.tool}`],
      required_authority: 'LEVEL_1',
      status: 'DISPATCHED'
    };
  }
}
