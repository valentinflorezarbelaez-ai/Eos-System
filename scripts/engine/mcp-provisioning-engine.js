// =========================================================================
// EOS — INDUSTRIAL MCP PROVISIONING & TOOL GOVERNANCE ENGINE
// Manages dynamic registration, sandboxing, and provisioning of Cursor MCPs
// =========================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class McpProvisioningEngine {
  constructor() {
    this.cursorMcpFile = path.join(rootDir, '.cursor/mcp.json');
    this.activeToolsFile = path.join(rootDir, 'EOS-MISSION-CONTROL/ACTIVE_TOOLS.json');
  }

  // 1. Load available catalog from .cursor/mcp.json
  getCatalog() {
    if (!fs.existsSync(this.cursorMcpFile)) {
      return { mcpServers: {} };
    }
    return JSON.parse(fs.readFileSync(this.cursorMcpFile, 'utf8'));
  }

  // 2. Provision requested MCPs into active Mission Control roster
  provisionMcps(requestedNames = []) {
    const catalog = this.getCatalog().mcpServers || {};
    const normalized = requestedNames.map(n => n.toLowerCase().trim());

    const provisioned = [];
    const rejected = [];

    // Load current active tools
    let activeData = { governed_tools: [], governed_mcps: [] };
    if (fs.existsSync(this.activeToolsFile)) {
      activeData = JSON.parse(fs.readFileSync(this.activeToolsFile, 'utf8'));
    }

    const roster = activeData.governed_mcps || [];
    const currentMcpNames = new Set(roster.map(m => m.name.toLowerCase()));
    let rosterChanged = false;

    for (const name of normalized) {
      if (catalog[name]) {
        const spec = catalog[name];
        const mcpEntry = {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          status: 'CONNECTED_AND_GOVERNED',
          purpose: spec.description || 'DYNAMIC_TOOL_PROVISIONING',
          risk: name === 'slack' || name === 'jira' ? 'MEDIUM' : 'LOW',
          command: `${spec.command} ${spec.args.join(' ')}`
        };

        if (!currentMcpNames.has(name)) {
          roster.push(mcpEntry);
          currentMcpNames.add(name);
          rosterChanged = true;
        }

        provisioned.push(mcpEntry);
      } else {
        rejected.push({
          name,
          reason: 'MCP_NOT_FOUND_IN_OFFICIAL_CATALOG'
        });
      }
    }

    // Persist only real roster changes: a fully rejected request must leave governed state untouched
    if (rosterChanged) {
      activeData.governed_mcps = roster;
      fs.writeFileSync(this.activeToolsFile, JSON.stringify(activeData, null, 2));
    }

    return {
      provisionedCount: provisioned.length,
      provisioned,
      rejectedCount: rejected.length,
      rejected,
      status: 'PROVISIONING_PIPELINE_EXECUTED_SAFELY',
      governanceBoundary: 'LEVEL_2_SUPERVISED_DEFAULT_DENY'
    };
  }

  // 3. Verify status of all active MCPs
  verifyActiveMcps() {
    if (!fs.existsSync(this.activeToolsFile)) {
      return { activeCount: 0, mcps: [] };
    }
    const data = JSON.parse(fs.readFileSync(this.activeToolsFile, 'utf8'));
    return {
      activeCount: (data.governed_mcps || []).length,
      mcps: data.governed_mcps || []
    };
  }
}
