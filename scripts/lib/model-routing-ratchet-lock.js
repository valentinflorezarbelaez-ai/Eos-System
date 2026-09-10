/**
 * @module model-routing-ratchet-lock
 * S6 — Model routing + ratchet ritual verify lock (Ladder 7 K6).
 *
 * Fail-closed: docs/harness/MODEL_ROUTING.md and docs/harness/RATCHET_RITUAL.md
 * must exist with required section needles + NON-CLAIM / PRODUCTION_READY=NO.
 *
 * NON-CLAIM: guidance != auto model switch without evidence;
 * ratchet ritual != autonomous self-heal.
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const MODEL_ROUTING_DOC = 'docs/harness/MODEL_ROUTING.md';
export const RATCHET_RITUAL_DOC = 'docs/harness/RATCHET_RITUAL.md';

/** Sections / needles aligned with tests/eos-s6-model-routing-ratchet.test.js */
export const MODEL_ROUTING_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Purpose',
  '## 2. Task classes → model tiers',
  '## 3. Practical rules (operator)',
  'Antigravity-first',
  'FAST',
  'HIGH',
  'NON-CLAIM',
  'auto model switch',
  'PRODUCTION_READY',
  'ADR-0018'
]);

export const RATCHET_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 1. Purpose',
  '## 2. Ritual steps (ordered)',
  '## 3. Control classes (Hashimoto / LIDR → EOS)',
  'error',
  'control',
  'AGENTS',
  'hooks',
  'CI evals',
  'subagents',
  'NON-CLAIM',
  'PRODUCTION_READY',
  'capture → classify → control → verify → freeze'
]);

export const MODEL_ROUTING_RATCHET_REQUIRED_PATHS = Object.freeze([
  MODEL_ROUTING_DOC,
  RATCHET_RITUAL_DOC,
  'docs/architecture/adrs/ADR-0018-model-routing-ratchet.md',
  'scripts/lib/model-routing-ratchet-lock.js',
  'tests/eos-s6-model-routing-ratchet.test.js',
  'docs/releases/EOS_S6_MODEL_ROUTING_RATCHET_2026-09-09.md',
  'openspec/changes/eos-s6-model-routing-ratchet/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.routingText]
 * @param {string} [options.ratchetText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.docMissing]
 * @returns {{ ok: boolean, checks: object[], failures: object[] }}
 */
export function auditModelRoutingRatchetLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];

  if (options.docMissing === true) {
    failures.push({
      path: MODEL_ROUTING_DOC,
      message: 'S6 model routing doc missing (fail-closed)',
      type: 'model-routing-ratchet-lock'
    });
    return { ok: false, checks, failures };
  }

  function loadDoc(rel, override) {
    if (override !== undefined) return override;
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) {
      failures.push({
        path: rel,
        message: 'S6 required doc missing (fail-closed): ' + rel,
        type: 'model-routing-ratchet-lock'
      });
      return null;
    }
    checks.push({
      path: rel + ' exists',
      status: 'VERIFIED',
      type: 'model-routing-ratchet-lock'
    });
    return fs.readFileSync(full, 'utf8');
  }

  const routingText = loadDoc(MODEL_ROUTING_DOC, options.routingText);
  const ratchetText = loadDoc(RATCHET_RITUAL_DOC, options.ratchetText);
  if (routingText === null || ratchetText === null) {
    return { ok: false, checks, failures };
  }

  function requireSections(rel, text, needles) {
    let ok = true;
    for (const needle of needles) {
      if (!text.includes(needle)) {
        ok = false;
        failures.push({
          path: rel,
          message: 'S6 required section/needle missing: ' + needle,
          type: 'model-routing-ratchet-lock'
        });
      }
    }
    if (ok) {
      checks.push({
        path: rel + ' required sections present',
        status: 'VERIFIED',
        type: 'model-routing-ratchet-lock'
      });
    }
  }

  requireSections(MODEL_ROUTING_DOC, routingText, MODEL_ROUTING_REQUIRED_SECTIONS);
  requireSections(RATCHET_RITUAL_DOC, ratchetText, RATCHET_RITUAL_REQUIRED_SECTIONS);

  function requireProductionReadyNo(rel, text) {
    const productionReadyNo =
      text.includes('PRODUCTION_READY:** NO') ||
      text.includes('PRODUCTION_READY: NO') ||
      text.includes('**PRODUCTION_READY:** NO');
    if (!productionReadyNo) {
      failures.push({
        path: rel,
        message: 'S6 doc must keep PRODUCTION_READY: NO',
        type: 'model-routing-ratchet-lock'
      });
    } else {
      checks.push({
        path: rel + ' PRODUCTION_READY=NO',
        status: 'VERIFIED',
        type: 'model-routing-ratchet-lock'
      });
    }
  }

  requireProductionReadyNo(MODEL_ROUTING_DOC, routingText);
  requireProductionReadyNo(RATCHET_RITUAL_DOC, ratchetText);

  const routingNonClaim =
    routingText.includes('NON-CLAIM') &&
    (/auto model switch/i.test(routingText) ||
      /automatic model/i.test(routingText) ||
      /Guidances*[≠!=]+s*runtime auto-router/i.test(routingText) ||
      /guidances*[≠!=]+s*runtime auto-router/i.test(routingText));
  if (!routingNonClaim) {
    failures.push({
      path: MODEL_ROUTING_DOC,
      message:
        'S6 MODEL_ROUTING must state NON-CLAIM no auto model switch / guidance!=auto-router',
      type: 'model-routing-ratchet-lock'
    });
  } else {
    checks.push({
      path: 'S6 MODEL_ROUTING NON-CLAIM no auto switch',
      status: 'VERIFIED',
      type: 'model-routing-ratchet-lock'
    });
  }

  const ratchetNonClaim =
    ratchetText.includes('NON-CLAIM') &&
    (/autonomous self-heal/i.test(ratchetText) ||
      /Rituals*[≠!=]+s*verify/i.test(ratchetText) ||
      /rituals*[≠!=]+s*verify/i.test(ratchetText) ||
      /≠s*autonomous/i.test(ratchetText));
  if (!ratchetNonClaim) {
    failures.push({
      path: RATCHET_RITUAL_DOC,
      message:
        'S6 RATCHET_RITUAL must state NON-CLAIM ritual!=autonomous self-heal / ritual!=verify',
      type: 'model-routing-ratchet-lock'
    });
  } else {
    checks.push({
      path: 'S6 RATCHET_RITUAL NON-CLAIM != self-heal',
      status: 'VERIFIED',
      type: 'model-routing-ratchet-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of MODEL_ROUTING_RATCHET_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required S6 model-routing-ratchet path missing',
          type: 'model-routing-ratchet-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures
  };
}
