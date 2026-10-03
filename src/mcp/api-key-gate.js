import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_PREFIX = 'eos_';
const SALT_BYTES = 16;
const KEY_LEN = 32;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const MAX_PRESENTED_LENGTH = 256;

export function resolveApiKeyStorePath(root, env = process.env) {
  const override = env?.EOS_MCP_API_KEY_FILE;
  if (override && String(override).trim()) {
    return path.resolve(String(override).trim());
  }
  return path.join(root, '.eos', 'mcp-api-key.json');
}

export function issueApiKey({ storePath } = {}) {
  if (!storePath) {
    throw new Error('MISSING_STORE_PATH');
  }
  const secret = KEY_PREFIX + randomBytes(KEY_LEN).toString('base64url');
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(secret, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  });
  const record = {
    version: 1,
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
    keyLen: KEY_LEN,
    n: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    createdAt: new Date().toISOString()
  };
  const body = `${JSON.stringify(record, null, 2)}\n`;
  if (body.includes(secret)) {
    throw new Error('REFUSED_RAW_KEY_PERSIST');
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, storePath);
  return { secret, storePath };
}

export function readKeyRecord(storePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function hexBuffer(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(value)) return null;
  return Buffer.from(value, 'hex');
}

export function verifyApiKey(candidate, record) {
  if (!record || record.kdf !== 'scrypt') return false;
  const salt = hexBuffer(record.salt);
  const expected = hexBuffer(record.hash);
  if (!salt || !expected || expected.length === 0) return false;
  if (typeof candidate !== 'string') return false;
  if (candidate.length === 0 || candidate.length > MAX_PRESENTED_LENGTH) return false;
  let actual;
  try {
    actual = scryptSync(candidate, salt, expected.length, {
      N: Number(record.n) || SCRYPT_N,
      r: Number(record.r) || SCRYPT_R,
      p: Number(record.p) || SCRYPT_P
    });
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function authorizeApiKey({ presented, storePath }) {
  const record = readKeyRecord(storePath);
  if (!verifyApiKey(presented, record)) {
    return { ok: false, reason: 'UNAUTHORIZED' };
  }
  return { ok: true };
}
