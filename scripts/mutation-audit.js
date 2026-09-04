#!/usr/bin/env node

/**
 * ============================================================================
 * EOS SYSTEM - CRISOL DE FUEGO: MOTOR DE PRUEBAS DE MUTACIÓN ACTIVA
 * Archivo: scripts/mutation-audit.js
 * Cumplimiento: L0 (NODE_BUILTINS_ONLY) - node:fs, node:path, node:crypto, node:child_process, node:os
 *
 * Propósito:
 *   Someter la suite de pruebas al factor "Morir": inyectar mutaciones sintéticas
 *   deterministas en src/core/runtime/ para verificar si las pruebas detectan y
 *   aniquilan cada alteración (KILLED) o si existen vacíos de prueba (SURVIVED).
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';

const ROOT_DIR = process.cwd();
const TARGET_DIR = path.join(ROOT_DIR, 'src', 'core', 'runtime');
const REPORT_FILE = path.join(ROOT_DIR, 'docs', 'audits', 'MUTATION_AUDIT_REPORT.json');
const CONCURRENCY = Math.max(1, Math.min(os.cpus().length - 1, 4));
const TEST_TIMEOUT_MS = 25000;

// Parse optional CLI args (--sample <N>, --file <filename>)
const args = process.argv.slice(2);
let sampleLimit = null;
let targetFileFilter = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sample' && args[i + 1]) {
    sampleLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--file' && args[i + 1]) {
    targetFileFilter = args[i + 1];
    i++;
  }
}

// Reglas de Mutación Deterministas (El Crisol)
const MUTATORS = [
  {
    name: 'EQUALITY_INVERSION',
    regex: /===/g,
    replace: '!==',
    description: 'Invierte igualdad estricta a desigualdad'
  },
  {
    name: 'INEQUALITY_INVERSION',
    regex: /!==/g,
    replace: '===',
    description: 'Invierte desigualdad estricta a igualdad'
  },
  {
    name: 'RELATIONAL_GREATER',
    regex: />=/g,
    replace: '<',
    description: 'Invierte operador mayor o igual a menor estricto'
  },
  {
    name: 'RELATIONAL_LESS',
    regex: /<=/g,
    replace: '>',
    description: 'Invierte operador menor o igual a mayor estricto'
  },
  {
    name: 'BOOLEAN_TRUE_TO_FALSE',
    regex: /\btrue\b/g,
    replace: 'false',
    description: 'Sustituye constante booleana true por false'
  },
  {
    name: 'BOOLEAN_FALSE_TO_TRUE',
    regex: /\bfalse\b/g,
    replace: 'true',
    description: 'Sustituye constante booleana false por true'
  },
  {
    name: 'LOGICAL_AND_TO_OR',
    regex: /&&/g,
    replace: '||',
    description: 'Altera conjunción lógica a disyunción'
  },
  {
    name: 'LOGICAL_OR_TO_AND',
    regex: /\|\|/g,
    replace: '&&',
    description: 'Altera disyunción lógica a conjunción'
  }
];

function log(msg, symbol = 'ℹ') {
  console.log(`[${new Date().toISOString().substring(11, 19)}] ${symbol}  ${msg}`);
}

function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * 1. Escaneo y Descubrimiento de Archivos Fuente
 */
function discoverTargetFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(discoverTargetFiles(fullPath));
    } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
      if (!targetFileFilter || file.includes(targetFileFilter)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * 2. Generación del Catálogo de Mutantes
 */
function generateMutants(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const mutants = [];
  let mutantSeq = 0;

  lines.forEach((line, lineIndex) => {
    // Evitar líneas de comentarios, encabezados o logs cosméticos
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('console.log')) {
      return;
    }

    MUTATORS.forEach((mutator) => {
      if (mutator.regex.test(line)) {
        mutator.regex.lastIndex = 0; // Reset regex
        const mutatedLine = line.replace(mutator.regex, mutator.replace);
        
        if (mutatedLine !== line) {
          mutantSeq++;
          const mutatedLines = [...lines];
          mutatedLines[lineIndex] = mutatedLine;

          const mutantId = `MUT-${path.basename(filePath, '.js').toUpperCase()}-${String(mutantSeq).padStart(3, '0')}`;
          mutants.push({
            id: mutantId,
            file: filePath,
            relPath: path.relative(ROOT_DIR, filePath),
            line: lineIndex + 1,
            mutator: mutator.name,
            original: line.trim(),
            mutated: mutatedLine.trim(),
            content: mutatedLines.join('\n')
          });
        }
      }
    });
  });

  return mutants;
}

/**
 * 3. Ejecución Aislada de Pruebas contra un Mutante
 */
function runTestForMutant(mutant) {
  return new Promise((resolve) => {
    const originalContent = fs.readFileSync(mutant.file, 'utf8');
    
    // Aplicar la mutación in-place atómicamente
    fs.writeFileSync(mutant.file, mutant.content, 'utf8');

    const start = Date.now();
    const child = spawn('node', ['--test', 'tests/*.test.js'], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        fs.writeFileSync(mutant.file, originalContent, 'utf8'); // Restaurar
        resolve({
          ...mutant,
          status: 'KILLED', // Timeout implica bucle inducido por la mutación = detección exitosa
          reason: 'TIMEOUT_KILLED',
          durationMs: Date.now() - start
        });
      }
    }, TEST_TIMEOUT_MS);

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        // Restauración garantizada inmediata del archivo original
        fs.writeFileSync(mutant.file, originalContent, 'utf8');

        // En mutación: un exitCode !== 0 significa que los tests FALLARON -> Mutante ANIQUILADO (éxito)
        // Si exitCode === 0, los tests pasaron a pesar de la alteración -> Mutante SOBREVIVIÓ (fallo de test)
        const isKilled = exitCode !== 0;

        resolve({
          ...mutant,
          status: isKilled ? 'KILLED' : 'SURVIVED',
          exitCode,
          durationMs: Date.now() - start,
          outputSnippet: isKilled ? '' : stdout.substring(0, 300)
        });
      }
    });
  });
}

/**
 * 4. Orquestador de Ejecución Concurrente
 */
async function processMutantsConcurrently(mutants) {
  const results = [];
  const total = mutants.length;
  let index = 0;

  async function worker() {
    while (index < total) {
      const current = mutants[index++];
      const res = await runTestForMutant(current);
      results.push(res);
      const symbol = res.status === 'KILLED' ? '⚔' : '⚠';
      log(`[${results.length}/${total}] ${res.id} (${res.mutator}) en L${res.line} -> ${res.status}`, symbol);
    }
  }

  // Ejecución en paralelo controlado
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * 5. Generación de Reporte Criptográfico Kaizen
 */
function compileAndSaveReport(results) {
  const total = results.length;
  const killed = results.filter((r) => r.status === 'KILLED').length;
  const survived = results.filter((r) => r.status === 'SURVIVED').length;
  const mutationScore = total > 0 ? ((killed / total) * 100).toFixed(2) : '100.00';

  const reportData = {
    timestamp: new Date().toISOString(),
    engine: 'EOS-CRISOL-MUTATION-RUNNER-V1',
    metrics: {
      totalMutants: total,
      killed,
      survived,
      mutationScore: `${mutationScore}%`,
      certified: parseFloat(mutationScore) === 100
    },
    survivedGaps: results
      .filter((r) => r.status === 'SURVIVED')
      .map((r) => ({
        id: r.id,
        file: r.relPath,
        line: r.line,
        mutator: r.mutator,
        original: r.original,
        mutated: r.mutated,
        kaizenAction: `TEST-GAP-DELTA: Añadir aserción para aniquilar mutación en ${r.relPath}:${r.line}`
      })),
    killedAudit: results
      .filter((r) => r.status === 'KILLED')
      .map((r) => ({ id: r.id, file: r.relPath, line: r.line, mutator: r.mutator }))
  };

  const serialized = JSON.stringify(reportData, null, 2);
  const sha256 = crypto.createHash('sha256').update(serialized).digest('hex');
  reportData.sha256 = sha256;

  ensureDirectoryExists(REPORT_FILE);
  fs.writeFileSync(REPORT_FILE, JSON.stringify(reportData, null, 2), 'utf8');

  return { reportData, sha256 };
}

/**
 * Punto de Entrada Principal
 */
async function main() {
  console.log('\n================================================================');
  console.log('      EOS SYSTEM - CRISOL DE MUTACIÓN ACTIVA (FACTOR MORIR)     ');
  console.log('================================================================\n');

  log(`Analizando entorno en: ${TARGET_DIR}`);
  const files = discoverTargetFiles(TARGET_DIR);
  log(`Archivos de runtime descubiertos: ${files.length}`);

  let allMutants = [];
  for (const f of files) {
    const mutants = generateMutants(f);
    allMutants = allMutants.concat(mutants);
  }

  log(`Catálogo de mutantes deterministas sintetizados: ${allMutants.length}`);

  if (sampleLimit && sampleLimit < allMutants.length) {
    log(`Aplicando límite de muestra representativa (--sample ${sampleLimit})`);
    allMutants = allMutants.slice(0, sampleLimit);
  }

  if (allMutants.length === 0) {
    log('No se generaron mutantes. Verifique los objetivos en src/core/runtime/.', '⚠');
    process.exit(0);
  }

  log(`Iniciando prueba de fuego concurrente (Workers: ${CONCURRENCY}, Total Mutantes: ${allMutants.length})...`);
  const results = await processMutantsConcurrently(allMutants);

  const { reportData, sha256 } = compileAndSaveReport(results);

  console.log('\n----------------------------------------------------------------');
  log(`MUTATION SCORE FINAL: ${reportData.metrics.mutationScore}`);
  log(`Mutantes Aniquilados (Killed): ${reportData.metrics.killed}`);
  log(`Mutantes Sobrevivientes (Survived): ${reportData.metrics.survived}`);
  log(`Firma Criptográfica SHA-256: ${sha256}`);
  log(`Reporte Consagrado en: docs/audits/MUTATION_AUDIT_REPORT.json`);
  console.log('----------------------------------------------------------------\n');

  if (reportData.metrics.survived > 0) {
    log(`Se han detectado ${reportData.metrics.survived} vacíos de prueba. Kaizen debe emitir TEST-GAP-DELTAs.`, '⚠');
    process.exit(1);
  } else {
    log('¡PERFECCIÓN ALCANZADA! Todos los mutantes han sido aniquilados por el fuego.', '⚔');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[CRITICAL] Error en el ejecutor de mutación:', err);
  process.exit(1);
});
