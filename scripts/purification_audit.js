import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve('.');
const report = {
  timestamp: new Date().toISOString(),
  git_status: 'READ_ONLY_INSPECTION',
  summary: {
    total_files: 0,
    canonical_operational: 0,
    tests: 0,
    schemas: 0,
    evidence_audits: 0,
    exact_duplicate_clusters: 0,
    exact_duplicates: []
  },
  import_graph: {},
  schema_inventory: [],
  release_inventory: []
};

// 1. Gather all files
const ignoreDirs = new Set(['.git', 'node_modules', '.missions', '.audit']);
const allFiles = [];
const hashToFiles = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      walk(full);
    } else {
      allFiles.push(rel);
      try {
        const content = fs.readFileSync(full);
        const hash = createHash('sha256').update(content).digest('hex');
        if (!hashToFiles.has(hash)) hashToFiles.set(hash, []);
        hashToFiles.get(hash).push({ path: rel, size: content.length });
      } catch (e) {}
    }
  }
}

walk(root);
report.summary.total_files = allFiles.length;

// 2. Identify exact duplicates
for (const [hash, fileList] of hashToFiles.entries()) {
  if (fileList.length > 1) {
    report.summary.exact_duplicates.push({
      sha256: hash,
      size: fileList[0].size,
      files: fileList.map(f => f.path)
    });
  }
}
report.summary.exact_duplicate_clusters = report.summary.exact_duplicates.length;

// 3. Trace imports in js files
const jsFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
for (const jsFile of jsFiles) {
  const content = fs.readFileSync(path.join(root, jsFile), 'utf8');
  const importMatches = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const staticMatch = line.match(/from\s+['"](.*?)['"]/);
    if (staticMatch) importMatches.push(staticMatch[1]);
    const requireMatch = line.match(/require\(['"](.*?)['"]\)/);
    if (requireMatch) importMatches.push(requireMatch[1]);
  }
  report.import_graph[jsFile] = importMatches;
}

// 4. Schema files
report.schema_inventory = allFiles.filter(f => f.startsWith('docs/schemas/') && f.endsWith('.json'));

// 5. Release files
const releasePkgPath = path.join(root, 'docs/releases/EOS_P3_CANONICAL_RELEASE_PACKAGE.json');
if (fs.existsSync(releasePkgPath)) {
  const releasePkg = JSON.parse(fs.readFileSync(releasePkgPath, 'utf8'));
  report.release_inventory = releasePkg.verification_summary?.schemas_inventory || [];
}

fs.writeFileSync('docs/audits/EOS_PURIFICATION_PHASE_A2_DEPENDENCY_REPORT.json', JSON.stringify(report, null, 2), 'utf8');
console.log('Phase A2 Trace Summary:');
console.log('- Total files inspected:', allFiles.length);
console.log('- Exact duplicate clusters found:', report.summary.exact_duplicate_clusters);
console.log('- JS Modules traced in import graph:', Object.keys(report.import_graph).length);
console.log('- Schemas indexed:', report.schema_inventory.length);
