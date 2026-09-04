import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

/**
 * EOS Pleroma Purge Script
 * Limpia de forma determinista cualquier archivo residual o temporal de simulación.
 */
function ejecutarPurgaPleroma() {
  console.log('🧹 [PLEROMA PURGE] > Iniciando pira depurativa de residuos temporales...');

  let eliminados = 0;
  const patronesTemporales = [
    'test-scaffold-',
    'modulo-e2e-generado',
    'temp-'
  ];

  const directorios = [
    path.join(root, 'docs', 'specs'),
    path.join(root, 'src', 'core'),
    path.join(root, 'tests')
  ];

  for (const dir of directorios) {
    if (!fs.existsSync(dir)) continue;
    const archivos = fs.readdirSync(dir);
    for (const archivo of archivos) {
      if (patronesTemporales.some(p => archivo.includes(p))) {
        const rutaCompleta = path.join(dir, archivo);
        try {
          fs.unlinkSync(rutaCompleta);
          console.log(`🗑️  [PURGED] > ${path.relative(root, rutaCompleta)}`);
          eliminados++;
        } catch (err) {
          console.warn(`⚠️  [WARN] No se pudo eliminar ${archivo}: ${err.message}`);
        }
      }
    }
  }

  console.log(`✨ [PLEROMA PURGE] > Purga completada. Total de residuos eliminados: ${eliminados}`);
  process.exit(0);
}

ejecutarPurgaPleroma();
