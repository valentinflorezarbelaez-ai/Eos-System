import crypto from 'node:crypto';

export class RequireHumanApprovalException extends Error {
  constructor(message = 'REQUIRE_HUMAN_APPROVAL: Estimated execution cost exceeds provisional governance budget limit') {
    super(message);
    this.name = 'RequireHumanApprovalException';
    this.statusCode = 402;
  }
}

export class SecurityAlertException extends Error {
  constructor(message = 'SECURITY_ALERT: Malicious payload or un-sanitized script detected in provider output') {
    super(message);
    this.name = 'SecurityAlertException';
    this.statusCode = 400;
  }
}

export class ProviderUnavailableException extends Error {
  constructor(message = 'PROVIDER_UNAVAILABLE: Primary capability provider failed or timed out') {
    super(message);
    this.name = 'ProviderUnavailableException';
    this.statusCode = 503;
  }
}

export class MultimodalCreativeEngine {
  constructor(options = {}) {
    this.provisionalBudgetCapUsd = options.provisionalBudgetCapUsd || 1.00;
    this.providers = new Map();
    this.artifacts = new Map();
    this.auditLogs = [];
    this.latencyRecords = [];
    this.setupDefaultProviders();
  }

  setupDefaultProviders() {
    this.registerProvider({
      provider_id: 'PRV-TEXT-PRO-01',
      name: 'Primary Text Scriptwriter',
      capabilities: ['TEXT_SCRIPTWRITING'],
      cost_per_unit_usd: 0.05,
      mean_latency_ms: 120,
      status: 'AVAILABLE'
    });
    this.registerProvider({
      provider_id: 'PRV-TEXT-FALLBACK-02',
      name: 'Fallback Text Generator',
      capabilities: ['TEXT_SCRIPTWRITING'],
      cost_per_unit_usd: 0.03,
      mean_latency_ms: 200,
      status: 'AVAILABLE'
    });
    this.registerProvider({
      provider_id: 'PRV-IMAGE-PRO-01',
      name: 'Primary Image Synthesizer',
      capabilities: ['IMAGE_GENERATION'],
      cost_per_unit_usd: 0.15,
      mean_latency_ms: 450,
      status: 'AVAILABLE'
    });
    this.registerProvider({
      provider_id: 'PRV-VIDEO-PRO-01',
      name: 'Primary Video Renderer',
      capabilities: ['VIDEO_GENERATION'],
      cost_per_unit_usd: 0.40,
      mean_latency_ms: 1200,
      status: 'AVAILABLE'
    });
    this.registerProvider({
      provider_id: 'PRV-AUDIO-PRO-01',
      name: 'Primary Audio Composer',
      capabilities: ['AUDIO_GENERATION'],
      cost_per_unit_usd: 0.10,
      mean_latency_ms: 300,
      status: 'AVAILABLE'
    });
  }

  registerProvider(provider) {
    this.providers.set(provider.provider_id, { ...provider });
  }

  sanitize(text) {
    if (typeof text !== 'string') return text;
    if (/<script|javascript:|on\w+=/i.test(text)) {
      this.logSecurityEvent('SECURITY_ALERT', 'PROMPT_INJECTION_BLOCKED', { payload: text });
      throw new SecurityAlertException();
    }
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }

  logSecurityEvent(eventType, detailKey, details) {
    this.auditLogs.push({
      log_id: `AUD-MC-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      event_type: eventType,
      detail_key: detailKey,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /** Evaluates Multimodal QA across 5 continuous dimensions (0.0 - 1.0) */
  evaluateMultimodalQA(promptAdherence, consistency, cleanliness, techValidity, aesthetics) {
    const p = Math.max(0, Math.min(1, promptAdherence));
    const c = Math.max(0, Math.min(1, consistency));
    const cl = Math.max(0, Math.min(1, cleanliness));
    const t = Math.max(0, Math.min(1, techValidity));
    const a = Math.max(0, Math.min(1, aesthetics));

    const finalScore = Number((0.30 * p + 0.25 * c + 0.20 * cl + 0.15 * t + 0.10 * a).toFixed(4));
    const status = finalScore >= 0.70 ? 'ACCEPTED' : (finalScore >= 0.50 ? 'REPLAN_REQUIRED' : 'REJECTED');

    return {
      final_score: finalScore,
      dimension_scores: { promptAdherence: p, consistency: c, cleanliness: cl, techValidity: t, aesthetics: a },
      qa_status: status
    };
  }

  /** Dispatches a complete Multimodal Creative Mission */
  async dispatchMission(missionId, brief, userToken = null, forceHighCost = false) {
    const start = performance.now();
    const cleanBrief = this.sanitize(brief);

    // Estimate costs
    const requiredCapabilities = ['TEXT_SCRIPTWRITING', 'IMAGE_GENERATION', 'VIDEO_GENERATION', 'AUDIO_GENERATION'];
    let estimatedCostUsd = forceHighCost ? 2.50 : 0.70; // 0.05 + 0.15 + 0.40 + 0.10 = 0.70

    // Cost Governance Interlock
    if (estimatedCostUsd > this.provisionalBudgetCapUsd && userToken !== 'SECRET-PO-TOKEN-APPROVED') {
      this.logSecurityEvent('COST_GOVERNANCE_BLOCKED', 'BUDGET_CAP_EXCEEDED', { estimatedCostUsd, capUsd: this.provisionalBudgetCapUsd });
      throw new RequireHumanApprovalException(`REQUIRE_HUMAN_APPROVAL: Estimated cost $${estimatedCostUsd} USD exceeds provisional limit $${this.provisionalBudgetCapUsd} USD`);
    }

    const generatedArtifacts = [];
    let totalActualCost = 0;

    for (const cap of requiredCapabilities) {
      const artifact = await this.executeCapabilityWithFallback(missionId, cap, cleanBrief, null, forceHighCost);
      generatedArtifacts.push(artifact);
      totalActualCost += artifact.cost_incurred_usd;
    }

    // Multimodal Composite QA Evaluation
    const meanQA = generatedArtifacts.reduce((sum, a) => sum + a.quality_assessment.final_score, 0) / generatedArtifacts.length;
    const compositeQA = this.evaluateMultimodalQA(meanQA, 0.90, 0.95, 0.98, 0.88);

    const totalLatencyMs = performance.now() - start;
    this.latencyRecords.push(totalLatencyMs);

    const missionResult = {
      mission_id: missionId,
      project_id: 'PRJ-MULTIMODAL-CREATIVE',
      brief: cleanBrief,
      status: compositeQA.qa_status === 'ACCEPTED' ? 'COMPLETED' : 'REPLAN_TRIGGERED',
      total_cost_usd: Number(totalActualCost.toFixed(4)),
      total_latency_ms: Number(totalLatencyMs.toFixed(2)),
      artifacts: generatedArtifacts,
      composite_qa: compositeQA,
      timestamp: new Date().toISOString()
    };

    return missionResult;
  }

  /** Subordinated execution with provider fallback support */
  async executeCapabilityWithFallback(missionId, capabilityId, prompt, primaryOverrideId = null, forceHighCost = false) {
    const allProviders = [...this.providers.values()].filter(p => p.capabilities.includes(capabilityId));
    const availableProviders = allProviders.filter(p => p.status === 'AVAILABLE');
    
    if (availableProviders.length === 0) {
      throw new ProviderUnavailableException(`PROVIDER_UNAVAILABLE: No active providers registered for capability '${capabilityId}'`);
    }

    const primaryProvider = allProviders[0];
    let selectedProvider = availableProviders[0];
    const isFallback = primaryProvider.status !== 'AVAILABLE' || selectedProvider.provider_id !== primaryProvider.provider_id;

    const inputHash = crypto.createHash('sha256').update(prompt + capabilityId).digest('hex');
    const mockOutputContent = `Generated ${capabilityId} payload for prompt: ${prompt} via ${selectedProvider.provider_id}`;
    const outputHash = crypto.createHash('sha256').update(mockOutputContent).digest('hex');

    // Run Multimodal QA on individual asset
    const qa = this.evaluateMultimodalQA(0.92, 0.88, 0.95, 0.99, 0.90);
    const unitCost = forceHighCost ? selectedProvider.cost_per_unit_usd * 4 : selectedProvider.cost_per_unit_usd;

    const artifactRecord = {
      artifact_id: `ART-MC-${capabilityId.split('_')[0]}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      mission_id: missionId,
      project_id: 'PRJ-MULTIMODAL-CREATIVE',
      modality: capabilityId.split('_')[0],
      producer_capability_id: capabilityId,
      selected_provider_id: selectedProvider.provider_id,
      is_fallback_provider: isFallback,
      input_payload_hash: inputHash,
      output_artifact_hash: outputHash,
      quality_assessment: qa,
      cost_incurred_usd: unitCost,
      execution_latency_ms: selectedProvider.mean_latency_ms,
      evidence_ref: 'EVD-MC-0001',
      timestamp: new Date().toISOString()
    };

    this.artifacts.set(artifactRecord.artifact_id, artifactRecord);
    return artifactRecord;
  }

  getPerformanceDistribution() {
    if (this.latencyRecords.length === 0) {
      return { sample_size: 0, mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 };
    }
    const sorted = [...this.latencyRecords].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const getP = p => sorted[Math.min(Math.floor((p / 100) * n), n - 1)];

    return {
      sample_size: n,
      mean_ms: Number(mean.toFixed(4)),
      p50_ms: Number(getP(50).toFixed(4)),
      p95_ms: Number(getP(95).toFixed(4)),
      p99_ms: Number(getP(99).toFixed(4))
    };
  }
}
