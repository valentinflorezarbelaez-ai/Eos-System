import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Directory that contains bin/eos.js and src/mcp-server.js.
 * Never use process.cwd() — Cursor MCP often starts in the user home folder.
 */
export function resolveControlPlaneRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}
