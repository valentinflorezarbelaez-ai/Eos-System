#!/usr/bin/env node

/**
 * @file bin/eos-sentinel.js
 * @description Autonomous background Sentinel Daemon CLI for EOS.
 * Maintains continuous self-observation, cryptographic drift defense, and hot FDIR healing.
 */

import { EOSSentinelDaemon } from '../src/core/sentinel-daemon.js';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const config = {
    intervaloMs: 5000,
    rootPath: process.cwd()
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--interval' && args[i + 1]) {
      config.intervaloMs = parseInt(args[i + 1], 10) || 5000;
      i++;
    } else if (args[i] === '--root' && args[i + 1]) {
      config.rootPath = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
🛡️ EOS SENTINEL DAEMON — Autonomous Defensive Watchdog

Usage:
  node bin/eos-sentinel.js [options]
  npm run sentinel:daemon

Options:
  --interval <ms>   Heartbeat interval in milliseconds (default: 5000)
  --root <path>     Workspace root path to defend (default: current directory)
  --help, -h        Show this help message
`);
      process.exit(0);
    }
  }

  return config;
};

const main = async () => {
  const config = parseArgs();
  console.log('=============================================================');
  console.log('🛡️  EOS SENTINEL DAEMON — AUTONOMOUS CRYPTOGRAPHIC WATCHDOG');
  console.log('=============================================================');
  console.log(`📍 Root Workspace : ${config.rootPath}`);
  console.log(`⏱️  Heartbeat Pulse : every ${config.intervaloMs / 1000}s`);

  const sentinel = new EOSSentinelDaemon(config);

  try {
    const lineasBase = sentinel.detector.generarLineasBase();
    console.log('🔒 Lineas Base Criptográficas cargadas con éxito.');
    await sentinel.iniciar(lineasBase);
    console.log('👁️  Vigilancia activa en caliente. Presione Ctrl+C para detener.\n');
  } catch (error) {
    console.error(`🚨 Error al iniciar el centinela: ${error.message}`);
    process.exit(1);
  }

  const shutdown = () => {
    console.log('\n🛡️ [EOS SENTINEL] > Recibida señal de parada. Deteniendo latido...');
    sentinel.detener();
    console.log('✅ Centinela detenido de forma segura.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch(err => {
  console.error(`Fatal Sentinel Error: ${err.message}`);
  process.exit(1);
});
