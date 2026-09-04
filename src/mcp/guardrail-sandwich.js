import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * EOS MCP Guardrail Sandwich (Perimeter Defense & Red Teaming Shield)
 * Strict L0 (Node.js built-ins only) implementation providing pre-tool and post-tool security controls.
 */

export const PROTECTED_FILES = [
  'CONSTITUTION.md',
  'docs/core/CONSTITUTION.md',
  'DEPENDENCY_POLICY_L0.md',
  '.agents/AGENTS.md',
  'docs/core/DIVINE_MATHEMATICAL_AXIOMS.md',
  'docs/core/PLEROMA_INTERCONNECTION_LAW.md'
];

export const PROTECTED_EXTENSIONS = [
  '.key',
  '.pem',
  '.cert',
  'id_rsa',
  'id_ecdsa',
  'id_ed25519'
];

export const INJECTION_SIGNATURES = [
  { pattern: /bypass\s+(?:the\s+)?(?:constitution|guardrails?|checks?)/i, risk: 'CRITICAL', label: 'INJECTION_CONSTITUTION_BYPASS' },
  { pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i, risk: 'HIGH', label: 'INJECTION_PROMPT_IGNORE_INSTRUCTIONS' },
  { pattern: /grant\s+(?:full\s+)?write\s+authority\s+without/i, risk: 'HIGH', label: 'INJECTION_AUTHORITY_ESCALATION' },
  { pattern: /override\s+(?:the\s+)?guardrails?/i, risk: 'HIGH', label: 'INJECTION_GUARDRAIL_OVERRIDE' },
  { pattern: /elevate\s+to\s+level\s+3\s+without/i, risk: 'HIGH', label: 'INJECTION_LEVEL_ESCALATION' },
  { pattern: /disable\s+(?:fdir|integrity|verification|checks?)/i, risk: 'HIGH', label: 'INJECTION_DISABLE_VERIFICATION' },
  { pattern: /--no-verify/i, risk: 'HIGH', label: 'INJECTION_GIT_NO_VERIFY' },
  { pattern: /relax\s+assertions?/i, risk: 'HIGH', label: 'INJECTION_RELAX_ASSERTIONS' },
  { pattern: /skip\s+(?:all\s+)?tests?/i, risk: 'HIGH', label: 'INJECTION_SKIP_TESTS' }
];

export const SECRET_PATTERNS = [
  { pattern: /sk_live_[0-9a-zA-Z]{16,}/g, label: 'STRIPE_LIVE_KEY' },
  { pattern: /Bearer\s+eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, label: 'JWT_BEARER_TOKEN' },
  { pattern: /ghp_[0-9a-zA-Z]{20,}/g, label: 'GITHUB_PAT' },
  { pattern: /xox[baprs]-[0-9a-zA-Z]{10,}/g, label: 'SLACK_TOKEN' },
  { pattern: /AKIA[0-9A-Z]{16}/g, label: 'AWS_ACCESS_KEY_ID' },
  { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g, label: 'PRIVATE_KEY_BLOCK' }
];

/**
 * Pre-tool input guardrail inspecting arguments against injection patterns,
 * protected file tampering, and external boundary violations.
 * @param {string} toolName
 * @param {object} params
 * @param {object} [context]
 * @returns {object}
 */
export function preToolGuardrail(toolName, params = {}, context = {}) {
  const serialized = JSON.stringify(params || {});

  // 1. Check for prompt injection signatures & verification bypass
  for (const item of INJECTION_SIGNATURES) {
    if (item.pattern.test(serialized)) {
      return {
        allowed: false,
        status: 'BLOCKED_PROMPT_INJECTION',
        riskLevel: item.risk,
        blockedPattern: item.label,
        reason: `INJECTION_SIGNATURE_DETECTED: Input matches prohibited adversarial signature [${item.label}].`,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 2. Check for protected files mutations
  const targetPath = params?.targetPath || params?.filePath || params?.file || params?.path || params?.TargetFile;
  if (targetPath && typeof targetPath === 'string') {
    const normalizedPath = targetPath.replace(/\\/g, '/');

    for (const protectedFile of PROTECTED_FILES) {
      if (normalizedPath === protectedFile || normalizedPath.endsWith(`/${protectedFile}`)) {
        return {
          allowed: false,
          status: 'BLOCKED_CONSTITUTIONAL_MUTATION',
          riskLevel: 'CRITICAL',
          blockedPattern: 'PROTECTED_CONSTITUTIONAL_FILE',
          reason: `CONSTITUTIONAL_VIOLATION: Mutation of core invariant file [${protectedFile}] is strictly forbidden.`,
          timestamp: new Date().toISOString()
        };
      }
    }

    for (const ext of PROTECTED_EXTENSIONS) {
      if (normalizedPath.toLowerCase().endsWith(ext)) {
        return {
          allowed: false,
          status: 'BLOCKED_KEY_MUTATION',
          riskLevel: 'CRITICAL',
          blockedPattern: 'PROTECTED_CRYPTOGRAPHIC_KEY',
          reason: `SECURITY_VIOLATION: Direct mutation of cryptographic key [${targetPath}] is strictly forbidden.`,
          timestamp: new Date().toISOString()
        };
      }
    }

    // 3. External Boundary Violation
    const isExternalTarget = normalizedPath.includes('Fundacion') ||
      (!normalizedPath.includes('Eos system') && !normalizedPath.startsWith('dist') && !normalizedPath.startsWith('src') && !normalizedPath.startsWith('tests') && !normalizedPath.startsWith('docs') && !normalizedPath.startsWith('scripts') && path.isAbsolute(targetPath));

    const isAuthorized = (context.authorizationLevel && context.authorizationLevel >= 2) || params.authorized === true;

    if (isExternalTarget && !isAuthorized) {
      return {
        allowed: false,
        status: 'BLOCKED_EXTERNAL_BOUNDARY_VIOLATION',
        riskLevel: 'HIGH',
        blockedPattern: 'UNAUTHORIZED_EXTERNAL_PATH',
        reason: `UNAUTHORIZED_EXTERNAL_PATH: Mutation of target [${targetPath}] strictly requires Level 2+ implementation authorization.`,
        timestamp: new Date().toISOString()
      };
    }
  }

  return {
    allowed: true,
    status: 'INPUT_SANITIZED_AND_ALLOWED',
    riskLevel: 'LOW',
    sanitizedArgs: params,
    timestamp: new Date().toISOString()
  };
}

/**
 * Post-tool output guardrail verifying outputs and redacting secret tokens.
 * @param {string} toolName
 * @param {any} output
 * @param {object} [context]
 * @returns {object}
 */
export function postToolGuardrail(toolName, output, context = {}) {
  let serialized = typeof output === 'string' ? output : JSON.stringify(output || {});
  let secretFound = false;
  let detectedPatterns = [];

  for (const item of SECRET_PATTERNS) {
    if (item.pattern.test(serialized)) {
      secretFound = true;
      detectedPatterns.push(item.label);
      serialized = serialized.replace(item.pattern, '[REDACTED_SECRET]');
    }
  }

  let payload;
  try {
    payload = typeof output === 'string' ? serialized : JSON.parse(serialized);
  } catch {
    payload = serialized;
  }

  return {
    allowed: true,
    sanitized: secretFound,
    status: secretFound ? 'SECRETS_REDACTED' : 'OUTPUT_CLEAN',
    riskLevel: secretFound ? 'HIGH' : 'LOW',
    detectedSecrets: detectedPatterns,
    payload,
    sanitizedOutput: payload,
    timestamp: new Date().toISOString()
  };
}

/**
 * Class wrapper maintaining backwards compatibility with existing test harness.
 */
export class GuardrailSandwich {
  evaluateInputGuardrail(toolName, args = {}, context = {}) {
    return preToolGuardrail(toolName, args, context);
  }

  evaluateOutputGuardrail(toolName, result, context = {}) {
    return postToolGuardrail(toolName, result, context);
  }

  preToolGuardrail(toolName, args = {}, context = {}) {
    return preToolGuardrail(toolName, args, context);
  }

  postToolGuardrail(toolName, result, context = {}) {
    return postToolGuardrail(toolName, result, context);
  }
}
