import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ProjectBootstrapEngine {
  constructor(baseOutputDir = path.join(rootDir, 'tests/fixtures/bootstrap-sandbox')) {
    this.baseOutputDir = baseOutputDir;
  }

  generateScaffold(projectConfig) {
    const {
      projectId,
      name,
      description,
      projectType = 'WEB_APPLICATION',
      owner = 'Product Owner / EOS Control Plane'
    } = projectConfig;

    if (!projectId || !name) {
      throw new Error('INVALID_CONFIG: projectId and name are strictly required');
    }

    const cleanId = projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const projectDir = path.join(this.baseOutputDir, cleanId);

    const directories = [
      '',
      'intake',
      'specs',
      'governance',
      'evidence',
      'audits',
      'experiments',
      'decisions'
    ];

    directories.forEach(d => {
      const dirPath = path.join(projectDir, d);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    const manifest = {
      project_id: projectId,
      name,
      description: description || `EOS Managed Project — ${name}`,
      project_type: projectType,
      lifecycle_status: 'INTAKE',
      technical_status: 'UNVERIFIED',
      business_status: 'DISCOVERY',
      owner,
      autonomy_level: 'SUPERVISED',
      created_at: new Date().toISOString(),
      governance: {
        external_write_barrier: 'ENFORCED',
        isolation_model: 'ZERO_UNAUTHORIZED_DELTA',
        level_2_authorization: 'NOT_AUTHORIZED',
        level_3_authorization: 'NOT_AUTHORIZED'
      }
    };

    fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(manifest, null, 2));

    const discoveryTemplate = `# USER & TECHNICAL DISCOVERY: ${name}

* **Project ID:** \`${projectId}\`
* **Status:** \`INTAKE_DISCOVERY\`
* **Created:** ${new Date().toISOString()}

## 1. Context & Objectives
[Document client background, primary objectives, and domain context]

## 2. User Segments & JTBD
[Document target users and Job-to-be-Done hypotheses]

## 3. Unknowns & Gaps
* GAP-001: [Define open gap]

## 4. Initial Governance Boundary
* Target Write Barrier: \`ENFORCED\`
`;
    fs.writeFileSync(path.join(projectDir, 'intake/DISCOVERY.md'), discoveryTemplate);

    return {
      projectId,
      projectDir,
      manifest,
      directoriesCreated: directories.length,
      status: 'BOOTSTRAPPED'
    };
  }

  cleanupSandbox() {
    if (fs.existsSync(this.baseOutputDir)) {
      fs.rmSync(this.baseOutputDir, { recursive: true, force: true });
    }
  }
}
