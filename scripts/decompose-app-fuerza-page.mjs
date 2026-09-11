/**
 * One-shot decomposer for APP Fuerza page.tsx
 * node scripts/decompose-app-fuerza-page.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = String.raw`C:\Users\valen\Documents\APP fuerza\atp-strength-frontend`;
const pagePath = path.join(root, 'src', 'app', 'page.tsx');
const backupPath = path.join(root, 'src', 'app', 'page.tsx.monolith.bak');

const raw = fs.readFileSync(pagePath, 'utf8');
if (!raw.includes('export default function ZenDashboard')) {
  console.error('Unexpected page.tsx — aborting');
  process.exit(1);
}
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log('Backup written:', backupPath);
}

const lines = raw.split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('export default function ZenDashboard'));
const retIdx = lines.findIndex((l, i) => i > start && /^  return \($/.test(l));

let body = lines.slice(start + 1, retIdx).join('\n');

// Strip inline playChime (moved to zenAudio)
body = body.replace(
  /\n  \/\/ Campana Zen[\s\S]*?\n  const playChime = \(isVictory: boolean = false\) => \{[\s\S]*?\n  \};\n/,
  '\n  // playChime from @/lib/zenAudio\n'
);

const hookSource = `"use client";

import { useState, useEffect, useCallback } from "react";
import { enqueueWalEntry, flushWalQueue, getPendingWalCount } from "@/lib/walSync";
import { playChime } from "@/lib/zenAudio";
import {
  SCHEDULE_DAYS,
  ALL_TRACKABLE_EXERCISES,
  computeMetrics,
  getSavedSession,
  getInitialMaxes,
  type ExerciseMaxData,
  type HistoryItem,
} from "@/lib/workoutStrategies";

export function useZenDashboard() {
${body}

  return {
    selectedDayKey, setSelectedDayKey,
    activeExerciseIndex, setActiveExerciseIndex,
    currentSet, setCurrentSet,
    activePhaseStep, setActivePhaseStep,
    completedSetsMap, setCompletedSetsMap,
    completedWarmupMap, setCompletedWarmupMap,
    backendOnline, pendingWalCount,
    zenFocusMode, setZenFocusMode,
    showPrepProtocol, setShowPrepProtocol,
    showProgressModal, setShowProgressModal,
    showResetModal, setShowResetModal,
    showVictoryModal, setShowVictoryModal,
    timerDuration, remainingSeconds, isRunning, timerTitle,
    maxesMap, selectedProgressEx, setSelectedProgressEx,
    inputOverrides, inputRpe, setInputRpe,
    showQuickCalibration, setShowQuickCalibration,
    formFormula, setFormFormula, formWeight, setFormWeight,
    formReps, setFormReps, formNotes, setFormNotes,
    isSavingMax, exerciseHistory,
    activeDay, activeExercise, activeExMax,
    activeOverrides, quickWeight, quickReps, inputWeight, inputReps,
    apiUrl, liveCalc, currentExMax,
    progressPercent, strokeDashoffset, atpSaturationPercent,
    totalDaySets, completedDaySets, dayProgressPercent, isDayFinished,
    persistSessionProgress, refreshHistory,
    handleUpdateQuickMax, handleStartTimer, togglePlayPause, handleResetTimer,
    handlePreviousExercise, handleNextExercise,
    handleResetExercise, handleResetDay,
    handleCompleteWarmupPhase, handleCompleteSet, handleSaveMax,
    setQuickWeight, setQuickReps, setInputWeight, setInputReps,
    calculateLive1RM, formatTime, calculateSessionStats, playChime,
    SCHEDULE_DAYS, ALL_TRACKABLE_EXERCISES,
  };
}
`;

const hooksDir = path.join(root, 'src', 'app', 'hooks');
fs.mkdirSync(hooksDir, { recursive: true });
const hookPath = path.join(hooksDir, 'useZenDashboard.ts');
fs.writeFileSync(hookPath, hookSource, 'utf8');
console.log('useZenDashboard.ts', hookSource.split(/\n/).length, 'lines');

// JSX view: keep original return body with same binding names via destructure
let jsx = lines.slice(retIdx).join('\n');
jsx = jsx.replace(/\n\}\s*$/, '\n'); // drop function closer

const viewSource = `"use client";

import React from "react";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { TelemetrySyncBadge } from "@/app/components/TelemetrySyncBadge";
import { TimerDisplay } from "@/app/components/TimerDisplay";
import {
  Flame, Zap, Play, Pause, RotateCcw, CheckCircle2, Server, Calendar, Activity,
  ShieldCheck, Volume2, Lock, Maximize2, Minimize2, Layers, Sparkles,
  TrendingUp, X, Save, Dumbbell, History, Calculator, Minus, Plus,
  ChevronDown, ChevronUp, Settings2, ChevronLeft, ChevronRight,
  AlertTriangle, Trophy,
} from "lucide-react";
import type { useZenDashboard } from "@/app/hooks/useZenDashboard";

type Dash = ReturnType<typeof useZenDashboard>;

export function ZenDashboardView({ d }: { d: Dash }) {
  const {
    selectedDayKey, setSelectedDayKey,
    activeExerciseIndex, setActiveExerciseIndex,
    currentSet, setCurrentSet,
    activePhaseStep, setActivePhaseStep,
    completedSetsMap, completedWarmupMap,
    backendOnline, pendingWalCount,
    zenFocusMode, setZenFocusMode,
    showPrepProtocol, setShowPrepProtocol,
    showProgressModal, setShowProgressModal,
    showResetModal, setShowResetModal,
    showVictoryModal, setShowVictoryModal,
    timerDuration, remainingSeconds, isRunning, timerTitle,
    maxesMap, selectedProgressEx, setSelectedProgressEx,
    inputRpe, setInputRpe,
    showQuickCalibration, setShowQuickCalibration,
    formFormula, setFormFormula, formWeight, setFormWeight,
    formReps, setFormReps, formNotes, setFormNotes,
    isSavingMax, exerciseHistory,
    activeDay, activeExercise, activeExMax,
    quickWeight, quickReps, inputWeight, inputReps,
    liveCalc, currentExMax,
    progressPercent, strokeDashoffset, atpSaturationPercent,
    totalDaySets, completedDaySets, dayProgressPercent, isDayFinished,
    handleUpdateQuickMax, handleStartTimer, togglePlayPause, handleResetTimer,
    handlePreviousExercise, handleNextExercise,
    handleResetExercise, handleResetDay,
    handleCompleteWarmupPhase, handleCompleteSet, handleSaveMax,
    setQuickWeight, setQuickReps, setInputWeight, setInputReps,
    formatTime, calculateSessionStats, playChime,
    SCHEDULE_DAYS, ALL_TRACKABLE_EXERCISES,
  } = d;

${jsx}

}
`;

// Replace WAL/FastAPI badge block with TelemetrySyncBadge (first occurrence pattern)
let viewOut = viewSource.replace(
  /\{\/\* WAL Offline Sync Badge \(SPEC-0002\) \*\/\}[\s\S]*?\{\/\* Backend Connectivity Status \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/header>/,
  `<TelemetrySyncBadge pendingWalCount={pendingWalCount} backendOnline={backendOnline} />
        </div>
      </header>`
);

// Replace zen fullscreen module with TimerDisplay
viewOut = viewOut.replace(
  /\{\/\* --- MÓDULO ZEN DE AISLAMIENTO VISUAL TRUE BLACK \(#000000\) --- \*\/\}[\s\S]*?\{zenFocusMode && \([\s\S]*?\)\}\s*\{\/\* Footer \*\//,
  `{zenFocusMode && activeExercise && (
        <TimerDisplay
          variant="zen-fullscreen"
          title={timerTitle}
          remainingSeconds={remainingSeconds}
          durationSeconds={timerDuration}
          isRunning={isRunning}
          atpSaturationPercent={atpSaturationPercent}
          exerciseName={activeExercise.name}
          currentSet={currentSet}
          activePhaseStep={activePhaseStep}
          prescriptions={activeExMax?.prescriptions}
          exerciseReps={activeExercise.reps}
          onTogglePlayPause={togglePlayPause}
          onReset={handleResetTimer}
          onSkip={() => { setIsRunning?.(false); }}
          onPlayChime={() => playChime(false)}
          onCloseZen={() => setZenFocusMode(false)}
        />
      )}

      {/* Footer */`
);

// Fix: setIsRunning may not be exported — use handleResetTimer/skip via remaining
viewOut = viewOut.replace(
  'onSkip={() => { setIsRunning?.(false); }}',
  'onSkip={() => { handleResetTimer(); }}'
);

const viewPath = path.join(root, 'src', 'app', 'components', 'ZenDashboardView.tsx');
fs.writeFileSync(viewPath, viewOut, 'utf8');
console.log('ZenDashboardView.tsx', viewOut.split(/\n/).length, 'lines');

const slim = `"use client";

import { useZenDashboard } from "@/app/hooks/useZenDashboard";
import { ZenDashboardView } from "@/app/components/ZenDashboardView";

/** Presentation container — state/hooks live in useZenDashboard; UI in ZenDashboardView. */
export default function ZenDashboard() {
  const d = useZenDashboard();
  return <ZenDashboardView d={d} />;
}
`;
fs.writeFileSync(pagePath, slim, 'utf8');
console.log('page.tsx', slim.split(/\n/).length, 'lines');
console.log('DECOMPOSE_OK');
