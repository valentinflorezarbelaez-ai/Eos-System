const fs = require('fs');
const path = 'C:/Users/valen/Documents/APP fuerza/atp-strength-frontend/src/app/components/ZenDashboardView.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

let cardStart = -1;
let cardEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (cardStart < 0 && lines[i].includes('Tarjeta del Ejercicio con Sistema Guiado')) {
    cardStart = i;
  }
  if (cardStart >= 0 && cardEnd < 0 && lines[i].includes('Right Column: Sesión del Día')) {
    for (let j = i; j > cardStart; j--) {
      if (lines[j].trim() === '</>') {
        cardEnd = j - 1;
        break;
      }
    }
    break;
  }
}
console.log({ cardStart: cardStart + 1, cardEnd: cardEnd + 1, lines: cardEnd - cardStart + 1 });

const chunk = lines.slice(cardStart, cardEnd + 1);

const header = `"use client";

import {
  Calculator, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Layers, Settings2, TrendingUp, Zap,
} from "lucide-react";
import { RampingIndicator } from "@/app/components/RampingIndicator";
import {
  getExerciseCategory,
  getAssemblyCue,
} from "@/lib/workoutStrategies";
import type { useZenDashboard } from "@/app/hooks/useZenDashboard";

type Dash = ReturnType<typeof useZenDashboard>;

/** Exercise selection, set/rep counter, 1RM auto-regulation, and phase logging. */
export function WorkoutLogger({ d }: { d: Dash }) {
  const {
    activeExerciseIndex,
    currentSet, setCurrentSet,
    activePhaseStep, setActivePhaseStep,
    completedSetsMap, completedWarmupMap,
    showQuickCalibration, setShowQuickCalibration,
    setSelectedProgressEx, setShowProgressModal,
    timerDuration, remainingSeconds, isRunning,
    setIsRunning, setRemainingSeconds,
    activeDay, activeExercise, activeExMax,
    quickWeight, quickReps, inputWeight, inputReps,
    setQuickWeight, setQuickReps,
    handleUpdateQuickMax, handlePreviousExercise, handleNextExercise,
    handleCompleteWarmupPhase, handleCompleteSet,
    formatTime,
  } = d;

  return (
    <>
`;

const footer = `
    </>
  );
}
`;

let body = chunk.join('\n');
// Strip outer fragment if present - we wrap our own
// Replace F1-F4 grid block with RampingIndicator (heuristic)
const rampOldStart = body.indexOf('{/* 1. Fases de Calentamiento');
const rampOldEnd = body.indexOf('{/* 2. Series Efectivas');
if (rampOldStart >= 0 && rampOldEnd > rampOldStart) {
  const replacement = `{/* 1. Fases de Calentamiento / Aclimatación SNC (F1 a F4) */}
                  <RampingIndicator
                    variant="badge-grid"
                    exerciseName={activeExercise.name}
                    prescriptions={activeExMax?.prescriptions}
                    activePhaseStep={activePhaseStep}
                    completedWarmupKeys={completedWarmupMap[activeExercise.name] || []}
                    onSelectPhase={(key) => setActivePhaseStep(key)}
                  />

                  `;
  body = body.slice(0, rampOldStart) + replacement + body.slice(rampOldEnd);
}

const out = header + body + footer;
const outPath = 'C:/Users/valen/Documents/APP fuerza/atp-strength-frontend/src/app/components/WorkoutLogger.tsx';
fs.writeFileSync(outPath, out);
console.log('Wrote WorkoutLogger', out.split(/\n/).length, 'lines');

const before = lines.slice(0, cardStart);
const after = lines.slice(cardEnd + 1);
let patched = before.concat(['              <WorkoutLogger d={d} />'], after).join('\n');

if (!patched.includes('import { WorkoutLogger }')) {
  patched = patched.replace(
    'import { TimerDisplay } from "@/app/components/TimerDisplay";',
    'import { TimerDisplay } from "@/app/components/TimerDisplay";\nimport { WorkoutLogger } from "@/app/components/WorkoutLogger";'
  );
}

if (!patched.includes('from "@/lib/workoutStrategies"')) {
  patched = patched.replace(
    'import type { useZenDashboard } from "@/app/hooks/useZenDashboard";',
    'import { computeMetrics } from "@/lib/workoutStrategies";\nimport type { useZenDashboard } from "@/app/hooks/useZenDashboard";'
  );
}

patched = patched.replace(
  'completedSetsMap, completedWarmupMap,',
  'completedSetsMap, completedWarmupMap,\n    persistSessionProgress,\n    setIsRunning, setRemainingSeconds,'
);

patched = patched.replace(
  /Flame, Zap, Play, Pause, RotateCcw, CheckCircle2, Server, Calendar, Activity,\r?\n  ShieldCheck, Volume2, Lock, Maximize2, Minimize2, Layers, Sparkles,/,
  'Flame, Zap, RotateCcw, CheckCircle2, Calendar, Activity,\n  ShieldCheck, Lock, Maximize2, Layers, Sparkles,'
);

patched = patched.replace(
  'progressPercent, strokeDashoffset, atpSaturationPercent,',
  'atpSaturationPercent,'
);
patched = patched.replace(
  'formatTime, calculateSessionStats, playChime,',
  'formatTime, playChime,'
);

fs.writeFileSync(path, patched);
console.log('Patched ZenDashboardView', patched.split(/\n/).length, 'lines');
