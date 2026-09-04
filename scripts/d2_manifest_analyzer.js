import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const candidateGroups = [
  { id: 'PILOT-01-FUNDACION', prefix: 'Fundacion', type: 'pilot', name: 'Fundacion Alexander Renovations UI & Models' },
  { id: 'PILOT-02-LUXE-REGISTRY', prefix: 'Luxe-Registry', type: 'pilot', name: 'Luxe Registry Pilot Architecture & Contracts' },
  { id: 'PILOT-03-MULTIMODAL', prefix: 'Multimodal-Creative-Suite', type: 'pilot', name: 'Multimodal Creative Suite Mock Sandbox' },
  { id: 'PILOT-04-EOS-LAB', prefix: 'EOS-Lab', type: 'pilot', name: 'EOS Lab Sandbox & Andes Retreat Prototype' },
  { id: 'AUDIT-01-ROOT-REPORTS', prefix: 'ROOT_AUDITS', type: 'audit', name: 'Root Level Phase P0/P1 Dated Audit Verdicts' },
  { id: 'AUDIT-02-ALEXANDER-AUDITS', prefix: 'audit/alexander-', type: 'audit', name: 'Alexander Discovery & Definition Legacy Audits' },
  { id: 'AUDIT-03-CONSOLIDATION-AUDITS', prefix: 'audit/consolidation', type: 'audit', name: 'Phase 1 Consolidation Audits' },
  { id: 'AUDIT-04-READINESS-AUDITS', prefix: 'audit/readiness', type: 'audit', name: 'Milestone Baseline Readiness Audits' },
  { id: 'AUDIT-05-DOCS-ARCHIVE', prefix: 'docs/archive', type: 'audit', name: 'Superseded Phase 0 Documentation Archive' }
];

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  let results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else {
      results.push(full.replace(/\\/g, '/'));
    }
  }
  return results;
}

const trackedFiles = new Set(execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n'));

// Scan src and tests for references
const coreFiles = getFiles('src').concat(getFiles('tests')).concat(getFiles('scripts/engine'));
const coreContents = coreFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const groupResults = candidateGroups.map(grp => {
  let files = [];
  if (grp.prefix === 'ROOT_AUDITS') {
    files = fs.readdirSync('.').filter(f => (f.endsWith('.md') && (f.startsWith('EOS_') || f.startsWith('P1_1_'))));
  } else if (grp.prefix.includes('alexander-')) {
    files = getFiles('audit/alexander-definition').concat(getFiles('audit/alexander-discovery'));
  } else {
    files = getFiles(grp.prefix);
  }

  const fileDetails = files.map(f => {
    const norm = f.replace(/\\/g, '/');
    const content = fs.readFileSync(norm);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const isTracked = trackedFiles.has(norm);
    const basename = path.basename(norm);
    const isReferencedInCore = coreContents.includes(basename) || coreContents.includes(norm);
    return { path: norm, size: content.length, sha256, isTracked, isReferencedInCore };
  });

  const totalSize = fileDetails.reduce((a, b) => a + b.size, 0);
  const trackedCount = fileDetails.filter(f => f.isTracked).length;
  const referencedCount = fileDetails.filter(f => f.isReferencedInCore).length;

  return {
    ...grp,
    fileCount: fileDetails.length,
    totalSize,
    trackedCount,
    untrackedCount: fileDetails.length - trackedCount,
    referencedCount,
    files: fileDetails
  };
});

fs.writeFileSync('audit/purification/d2_groups_raw.json', JSON.stringify(groupResults, null, 2));

console.log('D.2 Group analysis complete. Total groups evaluated:', groupResults.length);
for (const g of groupResults) {
  console.log(`- ${g.id} (${g.name}): ${g.fileCount} files, ${g.totalSize} bytes, ${g.referencedCount} referenced in core`);
}
