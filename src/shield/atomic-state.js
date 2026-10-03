import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * JSON state file without a check-then-act gap.
 * Missing file → empty state. Writes go to a temp sibling, then rename.
 * @param {string} filePath
 * @param {typeof fs} [fsImpl]
 */
export function readJsonState(filePath, fsImpl = fs) {
  let raw;
  try {
    raw = fsImpl.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { ok: true, state: null, reason: 'ENOENT' };
    }
    return {
      ok: false,
      state: null,
      code: (err && err.code) || 'READ_FAILED',
      message: err && err.message ? err.message : 'read failed'
    };
  }

  const text = typeof raw === 'string' ? raw : String(raw);
  if (text.trim() === '') {
    return { ok: false, state: null, code: 'EMPTY', message: 'empty file' };
  }

  try {
    return { ok: true, state: JSON.parse(text) };
  } catch (err) {
    return {
      ok: false,
      state: null,
      code: 'INVALID_JSON',
      message: err.message
    };
  }
}

/**
 * @param {string} filePath
 * @param {unknown} value
 * @param {typeof fs} [fsImpl]
 */
export function writeJsonState(filePath, value, fsImpl = fs) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch (err) {
    return { ok: false, code: 'SERIALIZE_FAILED', message: err.message };
  }
  if (typeof text !== 'string') {
    return { ok: false, code: 'SERIALIZE_FAILED', message: 'value is not JSON' };
  }

  const dir = path.dirname(filePath);
  fsImpl.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  fsImpl.writeFileSync(tmp, text, 'utf8');
  try {
    fsImpl.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fsImpl.unlinkSync(tmp);
    } catch {
      /* temp cleanup is best-effort after a failed rename */
    }
    throw err;
  }
  return { ok: true, path: filePath };
}
