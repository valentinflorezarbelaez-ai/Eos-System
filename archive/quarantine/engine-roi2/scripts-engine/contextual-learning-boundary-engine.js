import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ContextualLearningBoundaryEngine {
  constructor() {
    this.learningPortfolio = new Map();
    this.conflictHistory = [];
  }

  // Register a Specialized BKM into the Learning Portfolio
  registerPortfolioBkm(portfolioKey, bkmDefinition) {
    const {
      bkmId,
      name,
      domain,
      targetDevice = 'DESKTOP_OR_GENERAL',
      userProfile = 'GENERAL_PUBLIC',
      riskTier = 'STANDARD',
      costProfile = 'STANDARD',
      validityBounds = {},
      workflowMethod
    } = bkmDefinition;

    const entry = {
      portfolioKey,
      bkmId,
      name,
      domain,
      targetDevice,
      userProfile,
      riskTier,
      costProfile,
      validityBounds,
      workflowMethod,
      registeredAt: new Date().toISOString()
    };

    this.learningPortfolio.set(portfolioKey, entry);
    return entry;
  }

  // Evaluate Mission against the 4 Context Shifts (Context, Tool, User, Constraint)
  evaluateContextualShift(missionProfile) {
    const {
      domain,
      deviceType = 'DESKTOP',
      userType = 'GENERAL_PUBLIC',
      riskTier = 'STANDARD',
      maxCostUsd = 1.0,
      toolsAvailable = []
    } = missionProfile;

    // Shift 1: User Shift (Accessibility Priority)
    if (userType === 'SCREEN_READER_ACCESSIBILITY_FIRST' || missionProfile.accessibilityLevel === 'AAA') {
      const a11yBkm = this.learningPortfolio.get('BKM_A11Y_FIRST');
      if (a11yBkm) {
        return {
          action: 'REUSE',
          shiftDetected: 'USER_SHIFT_ACCESSIBILITY',
          selectedBkm: a11yBkm,
          rationale: 'Applied specialized accessibility-first BKM tailored for screen reader and high-contrast users'
        };
      }
    }

    // Shift 2: Constraint Shift (Ultra-Low Budget / Trivial Fix)
    if (maxCostUsd <= 0.02 || missionProfile.complexity === 'TRIVIAL') {
      const lowCostBkm = this.learningPortfolio.get('BKM_LOW_COST_LEAN');
      if (lowCostBkm) {
        return {
          action: 'REUSE',
          shiftDetected: 'CONSTRAINT_SHIFT_BUDGET',
          selectedBkm: lowCostBkm,
          rationale: 'Rejected heavy parallel orchestration; selected lean low-cost BKM'
        };
      }
    }

    // Shift 3: Context Shift (Mobile-First Touch vs Desktop)
    if (deviceType === 'MOBILE_TOUCH_HEAVY') {
      const mobileBkm = this.learningPortfolio.get('BKM_MOBILE_FIRST');
      if (mobileBkm) {
        return {
          action: 'REUSE',
          shiftDetected: 'CONTEXT_SHIFT_MOBILE',
          selectedBkm: mobileBkm,
          rationale: 'Desktop conversion BKM rejected for mobile touch; specialized mobile BKM deployed'
        };
      } else {
        return {
          action: 'ADAPT',
          shiftDetected: 'CONTEXT_SHIFT_MOBILE_NO_EXACT_BKM',
          selectedBkm: null,
          rationale: 'No exact mobile BKM exists; adapting desktop BKM with mobile touch constraints'
        };
      }
    }

    // Shift 4: Tool Shift (Missing Preferred Tool)
    const generalBkm = this.learningPortfolio.get('BKM_GENERAL_DESKTOP');
    if (generalBkm) {
      const requiredTool = generalBkm.validityBounds.requiredTool || 'TOL-PLAYWRIGHT-MCP';
      if (!toolsAvailable.includes(requiredTool) && toolsAvailable.length > 0) {
        return {
          action: 'RESEARCH',
          shiftDetected: 'TOOL_SHIFT_MISSING_PRIMARY',
          selectedBkm: generalBkm,
          rationale: `Primary tool ${requiredTool} unavailable in toolset; research fallback tool before execution`
        };
      }

      return {
        action: 'REUSE',
        shiftDetected: 'NONE_EXACT_MATCH',
        selectedBkm: generalBkm,
        rationale: 'Mission profile matches General Desktop BKM validity boundaries'
      };
    }

    return {
      action: 'RESEARCH',
      shiftDetected: 'OUT_OF_BOUNDS',
      selectedBkm: null,
      rationale: 'No matching BKM in portfolio; initiating first-principles research'
    };
  }

  // Memory Conflict Resolution: Specialize rather than erase
  resolveMemoryConflict(conflictingObservations) {
    const { domain, desktopSuccess, mobileFailure } = conflictingObservations;

    const resolution = {
      conflictId: `CONF-RES-${Date.now()}`,
      domain,
      generalScope: 'DESKTOP_AND_STANDARD_SCREENS_ONLY',
      specializedExceptions: [
        { condition: 'DEVICE == MOBILE_TOUCH', rule: 'DEPLOY_MOBILE_TOUCH_BKM' }
      ],
      actionTaken: 'NARROWED_PARENT_SCOPE_AND_SPAWNED_CONTEXTUAL_RULE',
      historicalIntegrityPreserved: true,
      resolvedAt: new Date().toISOString()
    };

    this.conflictHistory.push(resolution);
    return resolution;
  }
}
