// =========================================================================
// EOS — CANARY TUNNEL SUPERVISOR & HEARTBEAT DAEMON
// Maintains a persistent public HTTPS tunnel with automated keepalive pinging
// Prevents inactivity timeouts and automatically manages tunnel lifecycle
// =========================================================================

import { spawn } from 'node:child_process';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const statusFile = path.join(rootDir, 'docs/evidence/raw_telemetry/active_tunnel.json');

export class CanaryTunnelSupervisor {
  constructor(port = 3456) {
    this.port = port;
    this.currentUrl = null;
    this.sshProcess = null;
    this.heartbeatInterval = null;
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    this.spawnTunnel();
  }

  spawnTunnel() {
    if (!this.isRunning) return;

    console.log('[TUNNEL SUPERVISOR] Spawning SSH tunnel to localhost.run...');
    this.sshProcess = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=5',
      '-R', `80:localhost:${this.port}`,
      'nokey@localhost.run'
    ]);

    this.sshProcess.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(`[SSH STDOUT] ${text.trim()}`);

      const match = text.match(/https:\/\/([a-zA-Z0-9_-]+\.lhr\.life)/);
      if (match && match[0]) {
        this.currentUrl = match[0];
        console.log(`[TUNNEL SUPERVISOR] Active Public HTTPS URL: ${this.currentUrl}`);

        fs.writeFileSync(statusFile, JSON.stringify({
          active_url: this.currentUrl,
          connected_at: new Date().toISOString(),
          status: 'ONLINE'
        }, null, 2));

        this.startHeartbeat();
      }
    });

    this.sshProcess.stderr.on('data', (data) => {
      console.log(`[SSH STDERR] ${data.toString().trim()}`);
    });

    this.sshProcess.on('close', (code) => {
      console.log(`[TUNNEL SUPERVISOR] Tunnel process closed with code ${code}.`);
      this.stopHeartbeat();
      if (this.isRunning) {
        console.log('[TUNNEL SUPERVISOR] Reconnecting in 5 seconds...');
        setTimeout(() => this.spawnTunnel(), 5000);
      }
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    console.log('[TUNNEL SUPERVISOR] Starting 45-second heartbeat ping to prevent inactivity timeout...');
    this.heartbeatInterval = setInterval(() => {
      if (!this.currentUrl) return;

      https.get(`${this.currentUrl}/health`, (res) => {
        // Heartbeat ping successful
      }).on('error', (err) => {
        console.log(`[HEARTBEAT PING ERROR] ${err.message}`);
      });
    }, 45000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  stop() {
    this.isRunning = false;
    this.stopHeartbeat();
    if (this.sshProcess) {
      this.sshProcess.kill();
    }
  }
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const supervisor = new CanaryTunnelSupervisor(3456);
  supervisor.start();

  process.on('SIGINT', () => {
    supervisor.stop();
    process.exit(0);
  });
}
