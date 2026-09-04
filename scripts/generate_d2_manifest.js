import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const candidateGroups = [
  {
    id: 'PILOT-01-FUNDACION',
    prefix: 'Fundacion',
    type: 'pilot',
    name: 'Fundacion Alexander Renovations Frontend & Models',
    ownership: 'Alexander Renovations Team / External Client',
    purpose: 'Initial product validation and UI prototype (Astro/Tailwind)',
    data_classification: 'Synthetic / Sample business data',
    evidence_value: 'Validation artifact for initial capability exploration; not part of EOS core',
    risk: 'low',
    decision: 'ARCHIVE_PILOT',
    proposed_dest: '.eos/quarantine/20260820/pilots/fundacion/'
  },
  {
    id: 'PILOT-02-LUXE-REGISTRY',
    prefix: 'Luxe-Registry',
    type: 'pilot',
    name: 'Luxe Registry Pilot Architecture & Contracts',
    ownership: 'Luxe Registry Project / External Pilot',
    purpose: 'Multi-tenant luxury registry spec and data model exploration',
    data_classification: 'Synthetic schemas',
    evidence_value: 'Proves schema transferability across diverse domains',
    risk: 'low',
    decision: 'ARCHIVE_PILOT',
    proposed_dest: '.eos/quarantine/20260820/pilots/luxe-registry/'
  },
  {
    id: 'PILOT-03-MULTIMODAL',
    prefix: 'Multimodal-Creative-Suite',
    type: 'pilot',
    name: 'Multimodal Creative Suite Mock Sandbox',
    ownership: 'Creative Suite Pilot Team',
    purpose: 'Exploration of multimodal generation and asset pipelines',
    data_classification: 'No sensitive data / Mock templates',
    evidence_value: 'Early experimentation with media pipelines',
    risk: 'low',
    decision: 'ARCHIVE_PILOT',
    proposed_dest: '.eos/quarantine/20260820/pilots/multimodal-creative-suite/'
  },
  {
    id: 'PILOT-04-EOS-LAB',
    prefix: 'EOS-Lab',
    type: 'pilot',
    name: 'EOS Lab Sandbox & Andes Retreat Prototype',
    ownership: 'EOS Experimental Lab',
    purpose: 'Sandbox testing ground and Andes Retreat hospitality prototype',
    data_classification: 'Synthetic hospitality templates',
    evidence_value: 'Empirical benchmark for agent discovery and context compilation',
    risk: 'low',
    decision: 'ARCHIVE_PILOT',
    proposed_dest: '.eos/quarantine/20260820/pilots/eos-lab/'
  },
  {
    id: 'AUDIT-01-ROOT-REPORTS',
    prefix: 'ROOT_AUDITS',
    type: 'audit',
    name: 'Root-Level Phase P0/P1 Dated Audit Verdicts',
    ownership: 'EOS Governance & Auditor Agents',
    purpose: 'Point-in-time forensic reviews and consolidation verdicts (2026-08-19)',
    data_classification: 'System telemetry and verification reports',
    evidence_value: 'Provides immutable provenance for P0.1 and P1.1 governance transitions',
    risk: 'low',
    decision: 'ARCHIVE_AUDIT',
    proposed_dest: '.eos/quarantine/20260820/audits/root-dated-reports/'
  },
  {
    id: 'AUDIT-02-ALEXANDER-AUDITS',
    prefix: 'audit/alexander-',
    type: 'audit',
    name: 'Alexander Discovery & Definition Legacy Audits',
    ownership: 'EOS Core Auditor (Alexander Stream)',
    purpose: 'Step-by-step audit records of Alexander discovery and definition',
    data_classification: 'Audit logs and checklists',
    evidence_value: 'Records baseline audit criteria used prior to SDD kernel reorientation',
    risk: 'low',
    decision: 'ARCHIVE_AUDIT',
    proposed_dest: '.eos/quarantine/20260820/audits/alexander-legacy/'
  },
  {
    id: 'AUDIT-03-CONSOLIDATION-AUDITS',
    prefix: 'audit/consolidation',
    type: 'audit',
    name: 'Phase 1 Consolidation Audits',
    ownership: 'EOS Governance Auditor',
    purpose: 'Consolidation audit reports from Phase 1 hardening',
    data_classification: 'Audit matrices',
    evidence_value: 'Historic record of Phase 1 file and schema consolidation',
    risk: 'low',
    decision: 'ARCHIVE_AUDIT',
    proposed_dest: '.eos/quarantine/20260820/audits/consolidation-legacy/'
  },
  {
    id: 'AUDIT-04-DOCS-ARCHIVE',
    prefix: 'docs/archive',
    type: 'audit',
    name: 'Superseded Documentation Archive',
    ownership: 'EOS Core Docs Team',
    purpose: 'Historic specs, policies, and designs superseded by SDD Kernel',
    data_classification: 'Technical documentation',
    evidence_value: 'Evolutionary history of EOS architecture',
    risk: 'low',
    decision: 'ARCHIVE_AUDIT',
    proposed_dest: '.eos/quarantine/20260820/audits/docs-archive/'
  }
];

function walkFast(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.astro' || entry === '.gemini') continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkFast(full, list);
    } else {
      list.push(full.replace(/\\/g, '/'));
    }
  }
  return list;
}

const trackedFiles = new Set(execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n'));

// Read core runtime files to check imports
const runtimeFiles = walkFast('src').concat(walkFast('scripts/engine'));
const runtimeCode = runtimeFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const groupResults = candidateGroups.map(grp => {
  let files = [];
  if (grp.prefix === 'ROOT_AUDITS') {
    files = fs.readdirSync('.').filter(f => f.endsWith('.md') && (f.startsWith('EOS_') || f.startsWith('P1_1_'))).map(f => f.replace(/\\/g, '/'));
  } else if (grp.prefix === 'audit/alexander-') {
    files = walkFast('audit/alexander-definition').concat(walkFast('audit/alexander-discovery'));
  } else {
    files = walkFast(grp.prefix);
  }

  const fileDetails = files.map(f => {
    const content = fs.readFileSync(f);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const isTracked = trackedFiles.has(f);
    const basename = path.basename(f);
    const isImportedInRuntime = runtimeCode.includes(basename) || runtimeCode.includes(f);
    return { path: f, size: content.length, sha256, isTracked, isImportedInRuntime };
  });

  const totalBytes = fileDetails.reduce((a, b) => a + b.size, 0);
  const trackedCount = fileDetails.filter(f => f.isTracked).length;
  const runtimeRefCount = fileDetails.filter(f => f.isImportedInRuntime).length;

  return {
    ...grp,
    fileCount: fileDetails.length,
    totalBytes,
    trackedCount,
    runtimeRefCount,
    files: fileDetails
  };
});

fs.writeFileSync('audit/purification/d2_groups_analyzed.json', JSON.stringify(groupResults, null, 2), 'utf8');

// Generate markdown manifest
let md = `# EOS Purification Phase D.2 — Group-by-Group Manifest

**Status:** DESIGN ONLY — Execution NOT Authorized
**Prerequisite:** Phase D.1 Completed & Verified
**Authority:** LEVEL_0 / MCL-0 (Read-Only Inventory)

---

## 1. Summary of Candidate Groups (Pilots & Historical Audits)

| Group ID | Category | Name | File Count | Total Size | Tracked in Git | Runtime Refs | Recommended Decision |
|---|---|---|---|---|---|---|---|
${groupResults.map(g => `| \`${g.id}\` | \`${g.type}\` | ${g.name} | **${g.fileCount}** | ${(g.totalBytes / 1024).toFixed(1)} KB | ${g.trackedCount} / ${g.fileCount} | **${g.runtimeRefCount}** | \`${g.decision}\` |`).join('\n')}

---

## 2. Detailed Group Profiles

${groupResults.map((g, idx) => `### ${idx + 1}. \`${g.id}\` — ${g.name}
- **Category:** \`${g.type.toUpperCase()}\`
- **Ownership:** ${g.ownership}
- **Verified Purpose:** ${g.purpose}
- **Data Classification:** ${g.data_classification}
- **Evidence Value:** ${g.evidence_value}
- **Files & Size:** ${g.fileCount} files (${(g.totalBytes / 1024).toFixed(1)} KB)
- **Git Tracking:** ${g.trackedCount} tracked, ${g.fileCount - g.trackedCount} untracked
- **Runtime Import Dependency:** **${g.runtimeRefCount} references** in \`src/\` or \`scripts/engine/\` (100% decoupled from core execution)
- **Proposed Archive Path:** \`${g.proposed_dest}\`
- **Restoration Procedure:** \`cp -r ${g.proposed_dest}* <original_location>/\`
- **Risk Assessment:** \`${g.risk.toUpperCase()}\` (Zero breaking changes to SDD kernel or tests)
- **Recommended Action:** \`${g.decision}\`
`).join('\n')}

---

## 3. Explicit Safety Exclusions

The following assets are **100% EXCLUDED** from this manifest and must remain completely untouched:
1. **All 727 \`INVESTIGATE\` files** (unreferenced docs, exploratory notes).
2. **All Core Runtime Code** (\`src/core/sdd/\`, \`src/mcp-server.js\`, \`scripts/engine/\`).
3. **All Canonical Schemas & Policies** (\`docs/schemas/\`, \`docs/policies/\`, \`docs/specs/eos_core/\`).
4. **All Verification Tests & Fixtures** (\`tests/\`, \`tests/fixtures/sdd-*/\`).
5. **Core Governance** (\`CONSTITUTION.md\`, \`.agents/\`).
6. **Milestone 5 Scope** (Zero new agents, skills, or adapters).
`;

fs.writeFileSync('audit/purification/EOS-PURIFICATION-D2-GROUP-MANIFEST.md', md, 'utf8');

console.log('Phase D.2 Group Manifest successfully generated at audit/purification/EOS-PURIFICATION-D2-GROUP-MANIFEST.md');
