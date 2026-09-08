// =========================================================================
// EOS — CANARY-REAL-001: TELEMETRY PROTOCOL & INSTRUMENTATION TEST SUITE
// Tests: PROTO-CANARY-REAL-001-TELEMETRY-001 compliance, zero PII, 13 events
// =========================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TelemetryEngine } from '../EOS-Lab/Canary-Real-001/src/components/TelemetryEngine.js';
import { AppendOnlyTelemetrySink } from '../scripts/engine/independent-telemetry-sink.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('TEL-01: TelemetryEngine initializes with anonymous session ID and zero initial buffer', () => {
  const telemetry = new TelemetryEngine({ missionId: 'CANARY-REAL-001' });

  assert.equal(telemetry.missionId, 'CANARY-REAL-001');
  assert.equal(telemetry.schemaVersion, '1.0.0');
  assert.ok(telemetry.sessionId.startsWith('sess_'));
  assert.equal(telemetry.getBufferedEvents().length, 0);
});

test('TEL-02: Privacy Guard — Replaces raw PII with cryptographic hashes and prefixes', () => {
  const telemetry = new TelemetryEngine();

  const event = telemetry.recordQualifiedLeadCreated({
    clientName: 'Alexander Montoya',
    phone: '3001234567',
    projectType: 'CASA_PARCELACION',
    scope: 'REMODELACION_INTEGRAL'
  });

  // Client Name must NOT be in metadata in plain text
  assert.equal(event.metadata_minima.clientName, undefined);
  assert.ok(event.metadata_minima.clientNameHash.startsWith('h_'));

  // Phone must be masked prefix only
  assert.equal(event.metadata_minima.phone, undefined);
  assert.equal(event.metadata_minima.phonePrefix, '300***');
});

test('TEL-03: Full 13 Canonical Telemetry Events are valid and conform to schema', () => {
  const telemetry = new TelemetryEngine();

  const canonicalTypes = [
    'page_view',
    'qualification_started',
    'qualification_step_completed',
    'qualification_step_abandoned',
    'out_of_coverage',
    'estimate_viewed',
    'estimate_disclaimer_viewed',
    'whatsapp_cta_clicked',
    'qualified_lead_created',
    'lead_response_time',
    'lead_qualified_by_human',
    'quote_requested',
    'conversion_outcome'
  ];

  for (const type of canonicalTypes) {
    const evt = telemetry.recordEvent(type, 1, { testKey: 'val' });
    assert.ok(evt.event_id.startsWith('EVT-CR001-'));
    assert.equal(evt.mission_id, 'CANARY-REAL-001');
    assert.equal(evt.event_type, type);
    assert.equal(evt.schema_version, '1.0.0');
    assert.ok(evt.trace_id.startsWith('trc_'));
    assert.ok(typeof evt.timestamp === 'string');
  }

  assert.equal(telemetry.getBufferedEvents().length, 13);
});

test('TEL-04: Telemetry streams into AppendOnlyTelemetrySink with cryptographic hash chaining', () => {
  const sink = new AppendOnlyTelemetrySink();
  const telemetry = new TelemetryEngine({
    sinkCallback: (evt) => {
      sink.recordEvent({
        eventId: evt.event_id,
        missionId: evt.mission_id,
        eventType: evt.event_type,
        input: evt.metadata_minima
      });
    }
  });

  telemetry.recordPageView();
  telemetry.recordQualificationStarted('CASA_PARCELACION');
  telemetry.recordStepCompleted(1);
  telemetry.recordEstimateViewed('CASA_PARCELACION', 'REMODELACION_INTEGRAL', '$60M - $150M COP');
  telemetry.recordWhatsAppCtaClicked({ budgetRange: '$60M - $150M COP' });

  assert.equal(sink.chain.length, 5);
  const isChainValid = sink.verifyChainIntegrity();
  assert.equal(isChainValid, true);
});

test('TEL-05: Protocol Invariant — Pre-registered baseline metrics file is present and targets are frozen', () => {
  const protocolPath = path.join(rootDir, 'docs/missions/CANARY_REAL_001/REAL_TELEMETRY_PROTOCOL.md');
  const baselinePath = path.join(rootDir, 'docs/missions/CANARY_REAL_001/BASELINE_METRICS.json');

  assert.ok(fs.existsSync(protocolPath), 'Protocol doc missing');
  assert.ok(fs.existsSync(baselinePath), 'Baseline metrics JSON missing');

  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  assert.equal(baselineData.mission_id, 'CANARY-REAL-001');
  assert.equal(baselineData.target_success_criteria.qualified_quote_conversion_rate, '>= 22.0%');
  assert.equal(baselineData.target_success_criteria.time_on_page_to_contact_sec, '<= 45.0');
  assert.equal(baselineData.target_success_criteria.user_trust_score, '>= 9.0 / 10');
  assert.equal(baselineData.target_success_criteria.form_dropoff_rate, '<= 25.0%');
});
