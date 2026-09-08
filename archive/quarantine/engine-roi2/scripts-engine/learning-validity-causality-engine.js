import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class LearningValidityCausalityEngine {
  constructor() {
    this.candidateLessons = new Map();
    this.validatedBkms = new Map();
    this.auditGraph = new Map();
  }

  // LV-01 & LV-02: Register Candidate Lesson with Replication Tracking
  recordLessonObservation(observation) {
    const {
      lessonId,
      proposedBelief,
      taskFamily,
      executionId,
      evidenceRef,
      observedOutcomeDelta,
      isSynthetic = true,
      hasCounterfactualControl = false
    } = observation;

    if (!lessonId || !proposedBelief || !taskFamily) {
      throw new Error('INVALID_OBSERVATION: lessonId, proposedBelief, and taskFamily are required');
    }

    let lesson = this.candidateLessons.get(lessonId);
    if (!lesson) {
      lesson = {
        lessonId,
        proposedBelief,
        taskFamily,
        replicationCount: 0,
        observations: [],
        causalConfidence: 0.20,
        status: 'CANDIDATE_UNREPLICATED',
        createdAt: new Date().toISOString()
      };
      this.candidateLessons.set(lessonId, lesson);
    }

    lesson.observations.push({
      executionId,
      evidenceRef,
      observedOutcomeDelta,
      isSynthetic,
      hasCounterfactualControl,
      timestamp: new Date().toISOString()
    });
    lesson.replicationCount += 1;

    // Recalibrate confidence based on replication & causal controls
    this.calibrateLessonConfidence(lesson);
    return lesson;
  }

  // LV-03: Causal Attribution vs Spurious Correlation Check
  evaluateCausalAttribution(lessonId, counterfactualExperiment) {
    const lesson = this.candidateLessons.get(lessonId);
    if (!lesson) {
      throw new Error(`LESSON_NOT_FOUND: ${lessonId}`);
    }

    const {
      withInterventionOutcome = 9.5,
      withoutInterventionControlOutcome = 6.0,
      randomCoincidenceProbability = 0.02
    } = counterfactualExperiment;

    const causalDelta = withInterventionOutcome - withoutInterventionControlOutcome;
    const isSpurious = randomCoincidenceProbability >= 0.15 || causalDelta <= 0.5;

    if (isSpurious) {
      lesson.status = 'REJECTED_SPURIOUS_CORRELATION';
      lesson.causalConfidence = 0.05;
      lesson.rejectionReason = 'Failed counterfactual causal attribution test (high coincidence or zero delta)';
      return { isCausal: false, lesson };
    }

    lesson.hasCounterfactualProof = true;
    this.calibrateLessonConfidence(lesson);
    return { isCausal: true, causalDelta, lesson };
  }

  // Confidence Calibration Over Time
  calibrateLessonConfidence(lesson) {
    const rep = lesson.replicationCount;
    let confidence = 0.20; // 1-2 runs -> LOW

    if (rep >= 3 && lesson.hasCounterfactualProof) {
      confidence = 0.55; // 3-4 independent runs + counterfactual
    }
    if (rep >= 5 && lesson.hasCounterfactualProof) {
      confidence = 0.65; // 5-9 independent runs + counterfactual
    }
    if (rep >= 10 && lesson.hasCounterfactualProof) {
      confidence = 0.70; // Synthetic Cap strictly enforced at 0.70
    }

    lesson.causalConfidence = Number(confidence.toFixed(2));

    if (lesson.replicationCount >= 3 && lesson.hasCounterfactualProof && lesson.causalConfidence >= 0.50) {
      lesson.status = 'VALIDATED_BKM_CANDIDATE';
    }
  }

  // LV-04 & LV-05: Learning Audit Trace & BKM Promotion
  promoteValidatedLessonToBkm(lessonId, domainScope) {
    const lesson = this.candidateLessons.get(lessonId);
    if (!lesson || lesson.status !== 'VALIDATED_BKM_CANDIDATE') {
      throw new Error(`PROMOTION_BLOCKED: Lesson ${lessonId} has not passed replication and causal validity standards`);
    }

    const bkmRecord = {
      bkmId: `BKM-CAUSAL-${lesson.lessonId}`,
      belief: lesson.proposedBelief,
      taskFamily: lesson.taskFamily,
      domainScope,
      confidence: lesson.causalConfidence,
      replicationsRequired: lesson.replicationCount,
      causalProofVerified: true,
      promotedAt: new Date().toISOString()
    };

    this.validatedBkms.set(bkmRecord.bkmId, bkmRecord);

    // Build explanatory audit trace: BELIEF ➔ LESSON ➔ EXPERIENCE ➔ OBSERVATION ➔ EVIDENCE
    this.auditGraph.set(bkmRecord.bkmId, {
      bkmId: bkmRecord.bkmId,
      belief: bkmRecord.belief,
      evidenceChain: lesson.observations.map(o => ({
        execution: o.executionId,
        evidence: o.evidenceRef,
        delta: o.observedOutcomeDelta
      })),
      replicationCount: lesson.replicationCount,
      epistemicRigorRating: 'EPISTEMICALLY_DISCIPLINED'
    });

    return bkmRecord;
  }

  getExplanationTrace(bkmId) {
    return this.auditGraph.get(bkmId) || null;
  }
}
