import { authorizeApiKey } from './api-key-gate.js';

export const READONLY_GATEWAY_TOOLS = [
  {
    name: 'eos.doctor',
    description: 'Instant control-plane health diagnosis and homedir path-leak detection',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'eos.mission.status',
    description: 'Get current mission status and telemetry',
    inputSchema: {
      type: 'object',
      properties: {
        missionId: { type: 'string', description: 'Mission ID to query' }
      }
    }
  },
  {
    name: 'eos.authority.check',
    description: 'Check monotonic authority permissions and gates',
    inputSchema: {
      type: 'object',
      properties: {
        requiredLevel: { type: 'string', description: 'Required minimum autonomy authority level' },
        grantedLevel: { type: 'string', description: 'Current granted autonomy authority level' }
      },
      required: ['requiredLevel', 'grantedLevel']
    }
  }
];

const READONLY_NAMES = new Set(READONLY_GATEWAY_TOOLS.map((tool) => tool.name));

function canonicalToolName(name) {
  if (!name || typeof name !== 'string') return '';
  if (name.includes('_') && !name.includes('.')) return name.replace(/_/g, '.');
  return name;
}

function rpcError(id, code, message) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message }
  };
}

export async function handleGatewayRpc({
  request,
  env = {},
  storePath,
  invokeTool,
  authenticated = false
}) {
  const id = request?.id ?? null;
  const method = request?.method;

  if (typeof method === 'string' && method.startsWith('notifications/')) {
    return null;
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'eos-mission-os', version: '1.4.0' }
      }
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: READONLY_GATEWAY_TOOLS }
    };
  }

  if (method === 'tools/call') {
    if (!authenticated) {
      const auth = authorizeApiKey({
        presented: env?.EOS_API_KEY,
        storePath
      });
      if (!auth.ok) {
        return rpcError(id, -32001, 'UNAUTHORIZED');
      }
    }

    const name = canonicalToolName(request?.params?.name);
    if (!READONLY_NAMES.has(name)) {
      return rpcError(id, -32601, 'TOOL_NOT_IN_READONLY_GATEWAY');
    }

    const args = request?.params?.arguments && typeof request.params.arguments === 'object'
      ? request.params.arguments
      : {};
    const result = await invokeTool(name, args);
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      }
    };
  }

  return rpcError(id, -32601, `Method '${method}' not found`);
}

export async function handleStdioLine({ line, env, storePath, invokeTool }) {
  if (!line || !String(line).trim()) return null;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }
  return handleGatewayRpc({ request, env, storePath, invokeTool });
}
