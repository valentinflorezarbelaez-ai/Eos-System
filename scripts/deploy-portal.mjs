import * as dns from 'node:dns';
import { spawn } from 'node:child_process';

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const portalPath = 'C:\\Users\\valen\\Eos-System';
console.log('Deploying EOS Portal from:', portalPath);

const env = { ...process.env, NODE_OPTIONS: '--dns-result-order=ipv4first' };
const proc = spawn('npx.cmd', ['--yes', 'vercel', '--prod', '--yes'], {
  cwd: portalPath,
  env,
  stdio: 'inherit',
  shell: true
});

proc.on('close', (code) => {
  console.log('Vercel Deploy exited with code:', code);
  process.exit(code || 0);
});
