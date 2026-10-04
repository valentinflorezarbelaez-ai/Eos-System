const ALLOWED = new Set([
  'eos.doctor',
  'eos.mission.status',
  'eos.authority.check'
]);

function canonicalize(name) {
  const lower = String(name).toLowerCase();
  if (lower.includes('_') && !lower.includes('.')) return lower.replace(/_/g, '.');
  return lower;
}

function readField(text, name) {
  const match = text.match(new RegExp(`\\b${name}\\s*[:=]\\s*([^\\s,;]+)`, 'i'));
  return match ? match[1] : '';
}

function refuse(code, message) {
  return { ok: false, code, message };
}

function allow(tool, args) {
  return {
    ok: true,
    tool,
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: args }
    }
  };
}

export function planChatTurn({ apiKey, text } = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key) {
    return refuse(
      'MISSING_KEY',
      'Falta la clave local. Pégala en esta pestaña. No se guarda en el repositorio.'
    );
  }

  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) {
    return refuse(
      'UNKNOWN_TOOL',
      'Este chat llama solo a eos.doctor, eos.mission.status y eos.authority.check.'
    );
  }

  const named = raw.match(/\beos(?:[._][a-z0-9]+)+\b/gi) || [];
  const canonical = named.map(canonicalize);
  const unknown = canonical.filter((name) => !ALLOWED.has(name));
  if (unknown.length > 0) {
    return refuse(
      'UNKNOWN_TOOL',
      `${unknown[0]} no está en este chat. Solo se llaman eos.doctor, eos.mission.status y eos.authority.check. Las herramientas de escritura se rechazan.`
    );
  }

  let tool = canonical.find((name) => ALLOWED.has(name)) || '';
  if (!tool && /\b(autoridad|authority)\b/i.test(raw)) tool = 'eos.authority.check';
  if (!tool && (/\b(misi[oó]n|mission)\b/i.test(raw) || /estado de la misi[oó]n/i.test(raw))) {
    tool = 'eos.mission.status';
  }
  if (!tool && /\b(doctor|diagn[oó]stico)\b/i.test(raw)) tool = 'eos.doctor';
  if (!tool) {
    return refuse(
      'UNKNOWN_TOOL',
      'Este chat no llama esa herramienta. Puedes pedir eos.doctor, eos.mission.status o eos.authority.check.'
    );
  }

  if (tool === 'eos.authority.check') {
    const requiredLevel = readField(raw, 'requiredLevel');
    const grantedLevel = readField(raw, 'grantedLevel');
    if (!requiredLevel || !grantedLevel) {
      return refuse(
        'MISSING_ARGS',
        'eos.authority.check pide requiredLevel y grantedLevel. Ejemplo: autoridad requiredLevel=LEVEL_2 grantedLevel=LEVEL_2'
      );
    }
    return allow(tool, { requiredLevel, grantedLevel });
  }

  if (tool === 'eos.mission.status') {
    const missionId = readField(raw, 'missionId');
    return allow(tool, missionId ? { missionId } : {});
  }

  return allow('eos.doctor', {});
}

export function renderGatewayBody(body) {
  if (!body || typeof body !== 'object') {
    return { kind: 'error', text: 'La puerta no devolvió un objeto.' };
  }
  const unauthorized = body.error === 'UNAUTHORIZED'
    || (body.error && body.error.message === 'UNAUTHORIZED');
  if (unauthorized) {
    return {
      kind: 'refused',
      code: 'UNAUTHORIZED',
      text: 'La clave no autoriza esta llamada.'
    };
  }
  if (body.error) {
    const message = typeof body.error === 'string'
      ? body.error
      : (body.error.message || 'ERROR');
    return { kind: 'error', code: message, text: `La puerta respondió: ${message}.` };
  }
  const raw = body.result && body.result.content && body.result.content[0]
    ? body.result.content[0].text
    : undefined;
  if (typeof raw !== 'string') {
    return { kind: 'error', text: 'La respuesta no trae texto.' };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === 'object' && parsed.VERDICT) {
    const leak = parsed.HOMEDIR_LEAK ? ` HOMEDIR_LEAK: ${parsed.HOMEDIR_LEAK}.` : '';
    return { kind: 'doctor', text: `Doctor. VERDICT: ${parsed.VERDICT}.${leak}` };
  }
  return { kind: 'result', text: raw };
}
