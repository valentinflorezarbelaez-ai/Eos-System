/**
 * @module OperatorNext
 * @description Suggest the next local governed CLI action. Read-only.
 */

import fs from 'node:fs';
import path from 'node:path';

export function listLocalMissions(missionsRoot) {
  if (!missionsRoot || !fs.existsSync(missionsRoot)) {
    return [];
  }
  return fs
    .readdirSync(missionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('MIS-'))
    .map((d) => {
      const dir = path.join(missionsRoot, d.name);
      const pkgPath = path.join(dir, 'mission-package.json');
      let phase = null;
      let status = null;
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          phase = pkg.phase || null;
          status = pkg.status || null;
        } catch {
          /* ignore */
        }
      }
      const hasCursorPackage = fs.existsSync(path.join(dir, 'cursor', 'CURSOR_PROMPT.md'));
      const hasReport = fs.existsSync(path.join(dir, 'reports', 'executive-report.json'));
      const evidenceDir = path.join(dir, 'evidence');
      let hasReturn = fs.existsSync(path.join(dir, 'return-pkg.json'));
      if (!hasReturn && fs.existsSync(evidenceDir)) {
        hasReturn = fs.readdirSync(evidenceDir).some((f) => f.startsWith('return-') && f.endsWith('.json'));
      }
      return {
        mission_id: d.name,
        phase,
        status,
        hasCursorPackage,
        hasReport,
        hasReturn,
        dir
      };
    });
}

/**
 * @param {{ doctorOk: boolean, missions: object[] }} input
 * @returns {{ command: string, reason: string, mission_id: string|null }}
 */
export function suggestNextAction(input = {}) {
  const doctorOk = input.doctorOk !== false;
  const missions = input.missions || [];

  if (!doctorOk) {
    return {
      command: 'eos doctor',
      reason: 'Control plane check failed — fix pin/homedir leak first',
      mission_id: null
    };
  }

  if (missions.length === 0) {
    return {
      command: 'eos mission create --goal "<tu objetivo>" --project .',
      reason: 'No local missions yet',
      mission_id: null
    };
  }

  const open = missions.filter(
    (m) => m.status !== 'completed' && m.status !== 'closed' && m.status !== 'COMPLETED'
  );
  const focus = open[open.length - 1] || missions[missions.length - 1];
  const id = focus.mission_id;

  if (focus.status === 'paused' || focus.status === 'PAUSED') {
    return {
      command: `eos mission resume ${id}`,
      reason: 'Mission is paused',
      mission_id: id
    };
  }

  if (!focus.phase || focus.phase === 'VISION_INTAKE') {
    return {
      command: `eos mission plan ${id}`,
      reason: 'Mission exists but is not planned',
      mission_id: id
    };
  }

  if (focus.phase === 'PLAN' && !focus.hasCursorPackage) {
    return {
      command: `eos mission package ${id} --target cursor`,
      reason: 'Plan exists; Cursor package is missing',
      mission_id: id
    };
  }

  if (focus.phase === 'PLAN' && focus.hasCursorPackage && focus.hasReport) {
    return {
      command: `eos mission inspect ${id}`,
      reason: 'Report exists — inspect, then close when the human accepts the verdict',
      mission_id: id
    };
  }

  if (focus.phase === 'PLAN' && focus.hasCursorPackage && !focus.hasReturn && !focus.hasReport) {
    return {
      command: `eos mission submit ${id} --file <return-pkg.json>`,
      reason: 'Package is ready — execute CURSOR_PROMPT.md in Cursor, then submit the return package',
      mission_id: id
    };
  }

  if (focus.phase === 'PLAN' && focus.hasCursorPackage && !focus.hasReport) {
    return {
      command: `eos mission report ${id} --format markdown`,
      reason: 'Return ingested — compile the executive report',
      mission_id: id
    };
  }

  return {
    command: `eos mission inspect ${id}`,
    reason: `Active mission in phase ${focus.phase}`,
    mission_id: id
  };
}

/**
 * LOW_RISK may be auto-applied. Everything else needs a human (HITL).
 * @param {string} command
 * @returns {'LOW_RISK'|'HITL_REQUIRED'|'NONE'}
 */
export function classifyApplyBand(command) {
  if (!command) return 'NONE';
  if (command === 'eos doctor') return 'LOW_RISK';
  if (/^eos mission inspect\s+\S+/.test(command)) return 'LOW_RISK';
  if (/^eos mission report\s+\S+/.test(command)) return 'LOW_RISK';
  return 'HITL_REQUIRED';
}

export function formatNextReport({ doctor, suggestion, missions, lessonCount = 0 }) {
  const lines = [
    '================================================================================',
    'EOS NEXT — siguiente acción local gobernada',
    '================================================================================',
    `DOCTOR: ${doctor.ok ? 'PASS' : 'FAIL'}`,
    `MISSIONS: ${missions.length}`,
    suggestion.mission_id ? `FOCUS: ${suggestion.mission_id}` : 'FOCUS: (none)',
    `LESSONS: ${typeof lessonCount === 'number' ? lessonCount : 0} (next package includes last 5)`,
    `APPLY_BAND: ${classifyApplyBand(suggestion.command)}`,
    'ROLES: Director=humano (visión) | EOS=analiza/propone/ejecuta',
    `WHY: ${suggestion.reason}`,
    `RUN: ${suggestion.command}`,
    '================================================================================'
  ];
  return lines.join('\n');
}
