import { createHash } from 'node:crypto';
import { OkidanokhValidator } from './okidanokh-validator.js';

/**
 * EOS Heptaparaparshinokh Ledger - Law of Seven Edition
 * L0 (Node built-ins only). Enforces discrete 7-note progression with mandatory conscious shock points.
 */
export class EOSHeptaparaparshinokhLedger {
  constructor(config = {}) {
    this.octaves = new Map();
    this.notes = Object.freeze([
      'DO_GENESIS',
      'RE_TRANSIT',
      'MI_STORAGE',
      'FA_TRANSMUTATION',
      'SOL_CONSOLIDATION',
      'LA_IMMUNIZATION',
      'SI_CONSUMMATION'
    ]);
  }

  /**
   * Initializes a new persistence octave in DO_GENESIS.
   * @param {string} processId
   * @param {object} payload
   * @returns {Readonly<object>}
   */
  startOctave(processId, payload = {}) {
    if (!processId) {
      throw new Error('GOVERNANCE FAULT: processId is mandatory to start an octave.');
    }
    if (this.octaves.has(processId)) {
      throw new Error(`OCTAVE_DRIFT_EXCEPTION: Process [${processId}] already active in octave ledger.`);
    }

    const initialHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const octave = {
      processId,
      currentNote: 'DO_GENESIS',
      history: [{ note: 'DO_GENESIS', hash: `sha256-${initialHash}`, ts: new Date().toISOString() }],
      payload
    };

    this.octaves.set(processId, octave);
    return Object.freeze({ ...octave, history: [...octave.history] });
  }

  /**
   * Advances the octave note by note, asserting conscious shock points.
   * @param {string} processId
   * @param {string} targetNote
   * @param {object} [shockProof]
   * @returns {Readonly<object>}
   */
  advanceNote(processId, targetNote, shockProof = {}) {
    const octave = this.octaves.get(processId);
    if (!octave) {
      throw new Error(`GOVERNANCE FAULT: Process [${processId}] not found in octave ledger.`);
    }

    const currentIndex = this.notes.indexOf(octave.currentNote);
    const targetIndex = this.notes.indexOf(targetNote);

    if (targetIndex !== currentIndex + 1) {
      throw new Error(`OCTAVE_DRIFT_EXCEPTION: Step-by-step progression required. Cannot transition from ${octave.currentNote} to ${targetNote}.`);
    }

    // ⚡ Shock Point MI-FA (Intervalo de Integridad)
    if (octave.currentNote === 'MI_STORAGE' && targetNote === 'FA_TRANSMUTATION') {
      const isValidShock = OkidanokhValidator.validate(shockProof?.okidanokhEnvelope);
      if (!isValidShock) {
        throw new Error('OCTAVE_DRIFT_EXCEPTION: Mi-Fa Shock Point requires a valid Okidanokh Seal.');
      }
    }

    const stepHash = createHash('sha256')
      .update(`${octave.processId}:${targetNote}:${new Date().toISOString()}`)
      .digest('hex');

    octave.currentNote = targetNote;
    octave.history.push({ note: targetNote, hash: `sha256-${stepHash}`, ts: new Date().toISOString() });

    return Object.freeze({ ...octave, history: [...octave.history] });
  }

  /**
   * Seals the octave in SI-DO transcendence interval.
   * @param {string} processId
   * @param {object} [ledgerDb]
   * @returns {Readonly<object>}
   */
  sealOctave(processId, ledgerDb = null) {
    const octave = this.octaves.get(processId);
    if (!octave) {
      throw new Error(`GOVERNANCE FAULT: Process [${processId}] not found in octave ledger.`);
    }
    if (octave.currentNote !== 'SI_CONSUMMATION') {
      throw new Error(`OCTAVE_DRIFT_EXCEPTION: Cannot seal octave before reaching SI_CONSUMMATION.`);
    }

    const pleromaHash = createHash('sha256')
      .update(JSON.stringify(octave.history))
      .digest('hex');

    if (ledgerDb && typeof ledgerDb.appendSefirotNode === 'function') {
      ledgerDb.appendSefirotNode(
        `INT-HEPTA-${processId.toUpperCase()}`,
        octave.history[octave.history.length - 1].hash,
        `sha256-${pleromaHash}`,
        { targetTemple: 'CONSUMMATION_SEAL' }
      );
    }

    const sealed = {
      ...octave,
      status: 'CONSUMMATED',
      pleromaHash: `sha256-${pleromaHash}`
    };

    return Object.freeze(sealed);
  }
}
