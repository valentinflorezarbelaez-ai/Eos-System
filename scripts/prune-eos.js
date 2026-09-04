#!/usr/bin/env node
/**
 * @file scripts/prune-eos.js
 * @description Saneamiento y poda determinista del búnker EOS.
 * Escanea y elimina archivos huérfanos, temporales, o residuos no indexados.
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolveControlPlaneRoot } from '../src/core/runtime/control-plane-root.js';

const root = resolveControlPlaneRoot() || process.cwd();
const targetDirs = [
  path.join(root, 'docs', 'audits'),
  path.join(root, 'docs', 'evidence'),
  path.join(root, 'docs', 'sessions', 'checkpoints'),
  path.join(root, 'docs', 'specs'),
  path.join(root, 'src', 'core'),
  path.join(root, 'tests')
];

console.log('🧹 [EOS PURIFIER] > Iniciando escaneo de archivos huérfanos y basura...');
let archivosPurgados = 0;

function scanAndPrune(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'fixtures') {
        scanAndPrune(fullPath);
      }
    } else if (entry.isFile()) {
      const name = entry.name;
      if (
        name.endsWith('.tmp') ||
        name.endsWith('.bak') ||
        name.endsWith('.old') ||
        name.endsWith('.swp') ||
        name.endsWith('.swo') ||
        name.includes('copia') ||
        name.includes('test_old') ||
        name.startsWith('temp-') ||
        name.startsWith('test-scaffold-')
      ) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Eliminado residuo técnico: ${path.relative(root, fullPath)}`);
          archivosPurgados++;
        } catch (err) {
          console.warn(`⚠️ No se pudo eliminar ${fullPath}: ${err.message}`);
        }
      }
    }
  }
}

targetDirs.forEach(scanAndPrune);

console.log(`✨ [EOS PURIFIER] > Limpieza completada. Archivos basura removidos: ${archivosPurgados}.`);
process.exit(0);
