import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * EOS Manifest Synchronizer - L0 (Node built-ins only)
 * Recalculates current physical SHA-256 hashes and byte counts for the RC file tree
 * and updates tests/RC_FILE_MANIFEST.json atomically.
 */
function synchronizeManifest() {
  console.log('⚖️ [EOS AUDITOR] > Initiating baseline snapshot synchronization...');

  const rootPath = process.cwd();
  const manifestPath = path.join(rootPath, 'tests', 'RC_FILE_MANIFEST.json');
  const tmpManifestPath = path.join(rootPath, 'tests', `.RC_FILE_MANIFEST.${process.pid}.tmp`);

  if (!fs.existsSync(manifestPath)) {
    console.error('🚨 [SYNC FAULT] > tests/RC_FILE_MANIFEST.json does not exist.');
    process.exit(1);
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const updatedFiles = [];
    let updatedCount = 0;

    // Iterar y recalcular sobre la estructura del manifiesto real
    for (const fileNode of manifest.files) {
      const absolutePath = path.resolve(fileNode.path);

      if (!fs.existsSync(absolutePath)) {
        console.error(`🚨 [SYNC PANIC] > Mandatory RC file missing from disk: ${fileNode.path}`);
        process.exit(1);
      }

      // Calcular hash real y tamaño en bytes
      const fileBuffer = fs.readFileSync(absolutePath);
      const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const currentBytes = fileBuffer.length;

      if (currentHash !== fileNode.sha256) {
        updatedCount++;
      }

      updatedFiles.push({
        ...fileNode,
        sha256: currentHash,
        bytes: currentBytes
      });
    }

    const updatedManifest = {
      ...manifest,
      timestamp_utc: new Date().toISOString(),
      file_count: updatedFiles.length,
      files: updatedFiles
    };

    // Escritura Atómica Defensiva (Evita truncados si el proceso muere a mitad de volcado)
    fs.writeFileSync(tmpManifestPath, JSON.stringify(updatedManifest, null, 2), 'utf-8');
    fs.renameSync(tmpManifestPath, manifestPath);

    console.log(`\n📊 [SYNC REPORT] > Baseline synchronized. Total files: ${updatedFiles.length} | Mutated keys updated: ${updatedCount}`);
    console.log('🍏 STATUS: BASELINE_SEALED — tests/RC_FILE_MANIFEST.json is now perfectly aligned with current disk bytes.');
    process.exit(0);

  } catch (error) {
    console.error(`🚨 [SYNC CRITICAL PANIC] > Failed to synchronize manifest: ${error.message}`);
    try { fs.unlinkSync(tmpManifestPath); } catch {}
    process.exit(1);
  }
}

synchronizeManifest();
