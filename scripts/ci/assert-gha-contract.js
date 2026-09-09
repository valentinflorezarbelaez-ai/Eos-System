#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadCicdContract(rootDir) {
  const contractPath = path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.json');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

export function readWorkflow(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing workflow file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function listJobIds(yaml) {
  const jobsIndex = yaml.search(/^jobs:\s*$/m);
  if (jobsIndex === -1) {
    throw new Error('Workflow is missing a top-level jobs: mapping');
  }
  const jobsBlock = yaml.slice(jobsIndex);
  const ids = [];
  for (const match of jobsBlock.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)) {
    ids.push(match[1]);
  }
  if (ids.length === 0) {
    throw new Error('Workflow declares jobs: but no job ids');
  }
  return ids;
}

function assertContains(yaml, needle, label) {
  if (!yaml.includes(needle)) {
    throw new Error(`${label} must contain ${JSON.stringify(needle)}`);
  }
}

function assertPinnedAction(yaml, name, sha) {
  const pattern = new RegExp(`uses:\\s*${name}@${sha}\\b`);
  if (!pattern.test(yaml)) {
    throw new Error(`Action ${name} must be pinned to SHA ${sha}`);
  }
}

export function assertGithubActionsContract(rootDir) {
  const contract = loadCicdContract(rootDir);
  const failures = [];

  if (contract.provider !== 'github-actions') {
    failures.push('provider must be github-actions');
  }
  if (contract.production_deploy !== 'FORBIDDEN') {
    failures.push('production_deploy must be FORBIDDEN');
  }
  if (contract.fundacion_mutation !== 'FORBIDDEN') {
    failures.push('fundacion_mutation must be FORBIDDEN');
  }
  if (contract.dependency_policy !== 'L0_NODE_BUILTINS_ONLY') {
    failures.push('dependency_policy must remain L0_NODE_BUILTINS_ONLY');
  }

  for (const [key, workflow] of Object.entries(contract.workflows)) {
    let yaml;
    try {
      yaml = readWorkflow(rootDir, workflow.path);
    } catch (err) {
      failures.push(err.message);
      continue;
    }

    if (!yaml.includes(`name: ${workflow.name}`)) {
      failures.push(`${workflow.path} must set name: ${workflow.name}`);
    }

    if (!yaml.includes('permissions:')) {
      failures.push(`${workflow.path} must declare permissions:`);
    }
    if (!/permissions:\s*\n[ \t]+contents:\s*read\b/.test(yaml)) {
      failures.push(`${workflow.path} must set contents: read`);
    }
    if (/permissions:[\s\S]*contents:\s*write/.test(yaml)) {
      failures.push(`${workflow.path} must not grant contents: write`);
    }

    for (const event of workflow.on) {
      if (!yaml.includes(event)) {
        failures.push(`${workflow.path} must trigger on ${event}`);
      }
    }

    let jobIds = [];
    try {
      jobIds = listJobIds(yaml);
    } catch (err) {
      failures.push(`${workflow.path}: ${err.message}`);
    }
    for (const job of workflow.jobs) {
      if (!jobIds.includes(job)) {
        failures.push(`${workflow.path} missing job ${job}`);
      }
    }

    for (const pattern of contract.forbidden_workflow_patterns) {
      if (yaml.includes(pattern)) {
        failures.push(`${workflow.path} contains forbidden pattern ${JSON.stringify(pattern)}`);
      }
    }

    try {
      assertPinnedAction(yaml, 'actions/checkout', contract.pinned_actions['actions/checkout'].sha);
      assertPinnedAction(yaml, 'actions/setup-node', contract.pinned_actions['actions/setup-node'].sha);
    } catch (err) {
      failures.push(`${workflow.path}: ${err.message}`);
    }

    if (!yaml.includes(`node-version: '${contract.node_version}'`) && !yaml.includes(`node-version: "${contract.node_version}"`)) {
      failures.push(`${workflow.path} must use Node ${contract.node_version}`);
    }

    if (!yaml.includes('Fundacion')) {
      failures.push(`${workflow.path} must assert Fundacion freeze`);
    }

    if (key === 'ci') {
      try {
        assertContains(yaml, 'scripts/verify-eos.js --strict', 'CI verify');
        assertContains(yaml, 'npm test', 'CI tests');
        assertContains(yaml, 'evaluate:release', 'CI release engine');
        assertContains(yaml, 'verify:independent', 'CI independent harness');
        assertContains(yaml, 'audit:system', 'CI system audit');
        assertContains(yaml, 'gameday:long-run', 'CI GameDay long-run');
        assertContains(yaml, 'seam-pack', 'CI seam-pack job');
        assertContains(yaml, 'test:roi3', 'CI ROI seam pack');
        assertContains(yaml, 'test:n2', 'CI Ladder3 N seam pack');
        assertContains(yaml, 'test:n6', 'CI Ladder3 N seam pack end');
        assertContains(yaml, 'test:p2', 'CI Ladder4 P2 seam-pack lock');
        assertContains(yaml, 'test:p3', 'CI Ladder4 P3 hooks-install smoke');
        assertContains(yaml, 'test:p4', 'CI Ladder4 P4 mission-local EVD');
        assertContains(yaml, 'test:p5', 'CI Ladder4 P5 MCP catalog');
        assertContains(yaml, 'test:p6', 'CI Ladder4 P6 complexity inventory');
        assertContains(yaml, 'test:q2', 'CI Ladder5 Q2 seam-pack lock');
        assertContains(yaml, 'test:q3', 'CI Ladder5 Q3 doctor/fusion-light');
        assertContains(yaml, 'test:q4', 'CI Ladder5 Q4 complexity recount');
        assertContains(yaml, 'test:q5', 'CI Ladder5 Q5 mission-artifact');
        assertContains(yaml, 'test:q6', 'CI Ladder5 Q6 P6 inventory lock');
      } catch (err) {
        failures.push(err.message);
      }
    }

    if (key === 'cd_release_gate') {
      if (workflow.production_deploy !== false) {
        failures.push('cd_release_gate.production_deploy must be false');
      }
      for (const [envName, envValue] of Object.entries(workflow.requires_env || {})) {
        if (!yaml.includes(`${envName}: '${envValue}'`) && !yaml.includes(`${envName}: "${envValue}"`)) {
          failures.push(`${workflow.path} must set ${envName}=${envValue}`);
        }
      }
      try {
        assertPinnedAction(yaml, 'actions/upload-artifact', contract.pinned_actions['actions/upload-artifact'].sha);
      } catch (err) {
        failures.push(`${workflow.path}: ${err.message}`);
      }
      if (!yaml.includes('PRODUCTION_READY')) {
        failures.push(`${workflow.path} must state PRODUCTION_READY is not implied`);
      }
    }
  }

  // Fail-closed: every workflow YAML under .github/workflows must be declared
  // in CI_CD_CONTRACT.json (prevents orphan soft-CI like legacy eos-ci.yml).
  const workflowsDir = path.join(rootDir, '.github', 'workflows');
  if (fs.existsSync(workflowsDir)) {
    const allowedBasenames = new Set(
      Object.values(contract.workflows).map((w) => path.basename(w.path))
    );
    for (const name of fs.readdirSync(workflowsDir)) {
      if (!/\.(yml|yaml)$/i.test(name)) continue;
      if (!allowedBasenames.has(name)) {
        failures.push(
          `orphan workflow .github/workflows/${name} is not declared in docs/governance/CI_CD_CONTRACT.json`
        );
      }
    }
  }

  // Required CI must not soft-pass.
  const ciYaml = readWorkflow(rootDir, contract.workflows.ci.path);
  if (/continue-on-error:\s*true/.test(ciYaml)) {
    failures.push('ci.yml must remain fail-closed (no continue-on-error: true)');
  }

  return {
    ok: failures.length === 0,
    failures,
    contract
  };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  const rootDir = path.resolve(__dirname, '../..');
  const result = assertGithubActionsContract(rootDir);
  if (!result.ok) {
    console.error('EOS GitHub Actions CI/CD contract FAILED:');
    for (const failure of result.failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }
  console.log('EOS GitHub Actions CI/CD contract VERIFIED');
}
