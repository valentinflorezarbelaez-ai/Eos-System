/**
 * @module OrganicRoutingGate
 * @description ADR-0010 Gentleman organic routing: DIRECT | DELEGATED_DIRECT | SDD.
 * File/diff size alone must never force SDD ceremony. Fail-closed on accidental
 * SDD spawn; explicit request, accepted proposal, or forceSddOverride may proceed.
 * Not a new orchestrator — a classify/authorize helper for existing runtimes.
 */

export const ORGANIC_ROUTES = Object.freeze({
  DIRECT: 'DIRECT',
  DELEGATED_DIRECT: 'DELEGATED_DIRECT',
  SDD: 'SDD'
});

export const SDD_TRIGGER_FIELDS = Object.freeze([
  'explicitSddRequest',
  'acceptedProposal',
  'newFeature',
  'newSubsystem',
  'architecturalTradeoff',
  'externalWrite',
  'publicContractChange',
  'missionFsmPhaseChange'
]);

function truthy(value) {
  return value === true;
}

function collectSddTriggers(intent = {}) {
  return SDD_TRIGGER_FIELDS.filter((field) => truthy(intent[field]));
}

/**
 * Classify work. Size signals are recorded and ignored for the route decision.
 * @param {object} [intent]
 * @returns {{ route: string, triggers: string[], size_ignored: true, size_signals: object, rationale: string }}
 */
export function classifyOrganicRoute(intent = {}) {
  const size_signals = {
    byteSize: intent.byteSize ?? intent.byte_size ?? null,
    loc: intent.loc ?? null,
    fileCount: intent.fileCount ?? intent.file_count ?? null
  };
  const triggers = collectSddTriggers(intent);

  if (triggers.length > 0) {
    return {
      route: ORGANIC_ROUTES.SDD,
      triggers,
      size_ignored: true,
      size_signals,
      rationale: `SDD required by ADR-0010 triggers: ${triggers.join(', ')}`
    };
  }

  const delegated = truthy(intent.delegatedActor) || truthy(intent.delegated_actor);
  const route = delegated ? ORGANIC_ROUTES.DELEGATED_DIRECT : ORGANIC_ROUTES.DIRECT;
  return {
    route,
    triggers,
    size_ignored: true,
    size_signals,
    rationale:
      route === ORGANIC_ROUTES.DELEGATED_DIRECT
        ? 'DIRECT-eligible work executed by a delegated actor (size ignored)'
        : 'Smallest honest route is DIRECT (size ignored)'
  };
}

/**
 * Evaluate whether a heavy SDD/OpenSpec/mission ceremony may spawn.
 * Does not throw. Size-only intents are fail-closed.
 * @param {object} [intent]
 * @returns {{ allowed: boolean, blocked: boolean, code: string, classification: object, action: string, next_action?: string }}
 */
export function evaluateSddCeremonySpawn(intent = {}) {
  const classification = classifyOrganicRoute(intent);
  const wantsCeremony =
    truthy(intent.spawnSddCeremony) ||
    truthy(intent.spawn_sdd_ceremony) ||
    intent.intendedCeremony === 'SDD' ||
    intent.intended_ceremony === 'SDD';

  if (!wantsCeremony) {
    return {
      allowed: true,
      blocked: false,
      code: 'CEREMONY_NOT_REQUESTED',
      classification,
      action: 'PROCEED'
    };
  }

  const justified =
    truthy(intent.explicitSddRequest) ||
    truthy(intent.acceptedProposal) ||
    truthy(intent.forceSddOverride) ||
    truthy(intent.force_sdd_override) ||
    classification.route === ORGANIC_ROUTES.SDD;

  if (!justified) {
    return {
      allowed: false,
      blocked: true,
      code: 'ACCIDENTAL_SDD_SPAWN',
      classification,
      action: 'BLOCK',
      next_action:
        'Refuse SDD ceremony. Size alone does not force SDD. Pass explicitSddRequest, acceptedProposal, or forceSddOverride (ADR-0010).'
    };
  }

  return {
    allowed: true,
    blocked: false,
    code: truthy(intent.forceSddOverride) || truthy(intent.force_sdd_override)
      ? 'SDD_OVERRIDE'
      : 'SDD_JUSTIFIED',
    classification,
    action: 'PROCEED_SDD'
  };
}

/**
 * Fail-closed helper used before heavy SDD / orchestration spawn.
 * @param {object} [intent]
 * @returns {ReturnType<typeof evaluateSddCeremonySpawn>}
 */
export function assertSddCeremonyAuthorized(intent = {}) {
  const decision = evaluateSddCeremonySpawn(intent);
  if (!decision.allowed) {
    const err = new Error(
      `ACCIDENTAL_SDD_SPAWN: ${decision.next_action || 'SDD ceremony blocked (ADR-0010 organic routing).'}`
    );
    err.code = decision.code;
    err.decision = decision;
    throw err;
  }
  return decision;
}
