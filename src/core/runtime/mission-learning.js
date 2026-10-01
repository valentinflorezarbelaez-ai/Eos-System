/**
 * @module MissionLearning
 * @description Append-only operational lessons. Improves the next prompt; does not mutate the constitution.
 */

import fs from 'node:fs';
import path from 'node:path';

export function learningLogPath(baseDir) {
  return path.join(baseDir, '.eos', 'learning', 'lessons.jsonl');
}

export function appendLesson(baseDir, lesson = {}) {
  if (!lesson.mission_id || !lesson.lesson) {
    throw new Error('INVALID_LESSON: mission_id and lesson are required');
  }
  const entry = {
    timestamp: new Date().toISOString(),
    mission_id: lesson.mission_id,
    goal: lesson.goal || '',
    verdict: lesson.verdict || 'UNKNOWN',
    lesson: String(lesson.lesson).slice(0, 500),
    evidence_class: lesson.evidence_class || 'UNKNOWN'
  };
  const file = learningLogPath(baseDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

export function lastLessonForMission(baseDir, missionId) {
  const all = loadRecentLessons(baseDir, 500);
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (all[i].mission_id === missionId) return all[i];
  }
  return null;
}

export function appendLessonIfNew(baseDir, lesson = {}) {
  const prev = lastLessonForMission(baseDir, lesson.mission_id);
  if (prev && prev.verdict === (lesson.verdict || 'UNKNOWN') && prev.lesson === String(lesson.lesson || '').slice(0, 500)) {
    return { skipped: true, entry: prev };
  }
  return { skipped: false, entry: appendLesson(baseDir, lesson) };
}

export function loadRecentLessons(baseDir, limit = 5) {
  const file = learningLogPath(baseDir);
  let lines;
  try {
    // Optimization: avoid TOCTOU anti-pattern by removing existsSync prior to read
    lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
  const parsed = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      /* skip corrupt */
    }
  }
  return parsed.slice(-Math.max(1, limit));
}

export function lessonFromReport(missionId, direction, jsonReport) {
  const verdict = jsonReport?.executive_summary?.epistemic_verdict || 'UNKNOWN';
  const goal = direction?.goal || jsonReport?.executive_summary?.goal || '';
  const chain = jsonReport?.evidence_verification_summary?.hash_chain_integrity;
  const lesson =
    verdict === 'NOT_PROVEN'
      ? 'Do not treat ledger task status as proven outcome; require command evidence before VERIFIED'
      : `Closed with verdict ${verdict}; keep TDD and scoped diffs`;
  return {
    mission_id: missionId,
    goal,
    verdict,
    lesson,
    evidence_class: chain === 'VALID' ? 'MEASURED' : 'UNKNOWN'
  };
}
