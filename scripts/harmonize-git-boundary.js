import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EOS Git Boundary Harmonizer - L0 (Node built-ins only)
 * Enforces strict alignment between the physical untracked workspace state and the canonical release taxonomy.
 */
function isPatternMatch(filePath, pattern) {
  const normFile = filePath.replace(/\\/g, '/');
  const normPattern = pattern.replace(/\\/g, '/');

  if (normFile === normPattern) return true;
  if (normPattern.endsWith('/') && normFile.startsWith(normPattern)) return true;
  if (normPattern.endsWith('/*') && normFile.startsWith(normPattern.slice(0, -1))) return true;
  if (normPattern.endsWith('/**/*') && normFile.startsWith(normPattern.slice(0, -4))) return true;

  // Convert glob pattern to regular expression
  const regexPattern = '^' + normPattern
    .replace(/\./g, '\\.')
    .replace(/\/\*\*\/\*/g, '(/.*)?')
    .replace(/\/\*\*/g, '(/.*)?')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*') + '$';

  try {
    return new RegExp(regexPattern).test(normFile);
  } catch {
    return false;
  }
}

export function auditGitBoundary(options = {}) {
  const root = options.root || process.cwd();
  if (!options.silent) console.log('👁️ [EOS BOUNDARY] > Iniciando armonización y purga de Git Boundary...');

  const boundaryConfigPath = path.join(root, 'docs', 'design', 'p0', 'EOS_CANONICAL_GIT_BOUNDARY.json');

  if (!fs.existsSync(boundaryConfigPath)) {
    console.error('🚨 [BOUNDARY FAULT] > Falta el mapa maestro: docs/design/p0/EOS_CANONICAL_GIT_BOUNDARY.json');
    if (!options.silent && !options.returnOnly) process.exit(1);
    return { status: 'ERROR', error: 'MISSING_BOUNDARY_CONFIG' };
  }

  try {
    const boundaryConfig = JSON.parse(fs.readFileSync(boundaryConfigPath, 'utf-8'));
    const authorizedPatterns = [
      ...(boundaryConfig.requiredForCanonical || []),
      ...(boundaryConfig.experimentalLabModules || []),
      ...(boundaryConfig.boundary_disposition?.REQUIRED_FOR_CANONICAL_RELEASE || []),
      ...(boundaryConfig.boundary_disposition?.EXPERIMENTAL_LAB_MODULES || [])
    ];

    const gitStatusBuffer = execSync('git status --porcelain', { stdio: 'pipe', cwd: root });
    const gitLines = gitStatusBuffer.toString().trim().split('\n').filter(Boolean);

    let untrackedPollutionCount = 0;
    const dirtyFilesLog = [];
    const alignedFilesLog = [];

    if (!options.silent) console.log(`🔍 [EOS BOUNDARY] > Analizando ${gitLines.length} nodos modificados o sin trackear...`);

    for (const line of gitLines) {
      const statusToken = line.slice(0, 2).trim();
      const relativeFilePath = line.slice(3).trim();

      if (statusToken === '??') {
        const isAuthorized = authorizedPatterns.some(pattern => isPatternMatch(relativeFilePath, pattern));

        if (!isAuthorized) {
          untrackedPollutionCount++;
          dirtyFilesLog.push({ path: relativeFilePath, type: 'UNTRACKED_CHAOS' });
        } else {
          alignedFilesLog.push({ path: relativeFilePath, status: 'CANONICAL_WHITELISTED' });
        }
      }
    }

    if (!options.silent) {
      console.log(`\n📊 [REPORT] > Nodos canónicos whitelisted: ${alignedFilesLog.length} | Archivos en estado de caos: ${untrackedPollutionCount}`);
    }

    if (untrackedPollutionCount > 0) {
      console.error('🚨 STATUS: FAILED — GIT_BOUNDARY_VIOLATION detected.');
      console.error('El espacio de trabajo contiene archivos flotantes no autorizados en el plano P0:');
      console.error(JSON.stringify(dirtyFilesLog, null, 2));
      if (!options.silent && !options.returnOnly) process.exit(1);
      return { status: 'FAILED', untrackedPollutionCount, dirtyFilesLog };
    }

    if (!options.silent) console.log('🍏 STATUS: VERIFIED — Git Boundary perfectamente armonizado con la taxonomía P0.');
    if (!options.silent && !options.returnOnly) process.exit(0);
    return { status: 'VERIFIED', alignedCount: alignedFilesLog.length };

  } catch (error) {
    console.error(`🚨 [BOUNDARY CRITICAL PANIC] > Fallo fatal en el subproceso git plumbing: ${error.message}`);
    if (!options.silent && !options.returnOnly) process.exit(1);
    return { status: 'ERROR', message: error.message };
  }
}

if (process.argv[1] && process.argv[1].endsWith('harmonize-git-boundary.js')) {
  auditGitBoundary();
}
