/**
 * Script to apply Coach-Guided UX to APP Fuerza (atp-strength-frontend)
 * Execution: node scripts/apply-coach-guided-ux.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = String.raw`C:\Users\valen\Documents\APP fuerza\atp-strength-frontend`;
const hooksPath = path.join(frontendRoot, 'src', 'app', 'hooks', 'useZenDashboard.ts');
const pagePath = path.join(frontendRoot, 'src', 'app', 'page.tsx');
const zenViewPath = path.join(frontendRoot, 'src', 'app', 'components', 'ZenDashboardView.tsx');
const coachViewPath = path.join(frontendRoot, 'src', 'app', 'components', 'CoachGuidedView.tsx');

console.log('--- Applying Coach-Guided UX Transformation ---');

// 1. Update useZenDashboard.ts
let hookCode = fs.readFileSync(hooksPath, 'utf8');
if (!hookCode.includes('coachMode')) {
  const targetState = 'const [zenFocusMode, setZenFocusMode] = useState(false);';
  const newState = `const [zenFocusMode, setZenFocusMode] = useState(false);
  const [coachMode, setCoachMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("neuro_strength_coach_mode");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleCoachMode = useCallback(() => {
    setCoachMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("neuro_strength_coach_mode", JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);`;
  hookCode = hookCode.replace(targetState, newState);

  const targetReturn = 'zenFocusMode,\n    setZenFocusMode,';
  const newReturn = `zenFocusMode,\n    setZenFocusMode,\n    coachMode,\n    setCoachMode,\n    toggleCoachMode,`;
  hookCode = hookCode.replace(targetReturn, newReturn);

  fs.writeFileSync(hooksPath, hookCode, 'utf8');
  console.log('✔ useZenDashboard.ts updated with coachMode');
} else {
  console.log('ℹ useZenDashboard.ts already contains coachMode');
}

// 2. Create CoachGuidedView.tsx (Strict zero-unused, clean entities)
const coachViewSource = `"use client";

import React, { useState } from "react";
import {
  Flame, Sparkles, CheckCircle2, ChevronLeft, ChevronRight,
  Play, Pause, RotateCcw, Volume2, Trophy,
  Minus, Plus, Activity, Heart, ArrowRight, Coffee, Eye
} from "lucide-react";
import {
  formatTime,
  type WarmupPhaseKey,
} from "@/lib/workoutStrategies";
import type { useZenDashboard } from "@/app/hooks/useZenDashboard";

type Dash = ReturnType<typeof useZenDashboard>;

export function CoachGuidedView({ d }: { d: Dash }) {
  const {
    activeDay,
    activeExercise,
    activeExerciseIndex,
    currentSet,
    activePhaseStep,
    completedSetsMap,
    remainingSeconds,
    isRunning,
    timerTitle,
    atpSaturationPercent,
    inputWeight,
    inputReps,
    setInputWeight,
    setInputReps,
    activeExMax,
    totalDaySets,
    completedDaySets,
    dayProgressPercent,
    isDayFinished,
    handleStartTimer,
    togglePlayPause,
    skipRest,
    handlePreviousExercise,
    handleNextExercise,
    handleCompleteWarmupPhase,
    handleCompleteSet,
    handleResetDay,
    handleResetExercise,
    toggleCoachMode,
    playChime,
    SCHEDULE_DAYS,
    setSelectedDayKey,
    selectedDayKey,
    setActivePhaseStep,
  } = d;

  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Helper: adjust weight by delta
  const adjustWeight = (delta: number) => {
    const current = parseFloat(inputWeight) || 80;
    const next = Math.max(0, current + delta);
    setInputWeight(String(next));
  };

  // Helper: adjust reps by delta
  const adjustReps = (delta: number) => {
    const current = parseInt(inputReps, 10) || 3;
    const next = Math.max(1, current + delta);
    setInputReps(String(next));
  };

  const isWarmupPhase = ["F0", "F1", "F2", "F3", "F4"].includes(activePhaseStep);
  const currentSetsList = (activeExercise && completedSetsMap[activeExercise.name]) || [];

  // Descriptive text for warmup phases
  const getWarmupPhaseInfo = (phase: string) => {
    switch (phase) {
      case "F0":
        return {
          title: "F0: Movilidad Articular",
          load: "Sin peso",
          reps: "8-10 reps",
          cue: "Rotaciones articulares controladas. Prepará ligamentos y cápsula articular sin fatiga.",
        };
      case "F1":
        return {
          title: "F1: Activación Dinámica",
          load: activeExercise.weight_type === "bodyweight" ? "Peso corporal" : "Barra sola (20 kg)",
          reps: "5-6 reps",
          cue: "Sentí la trayectoria exacta de la barra. Enfocate en la fluidez y simetría del movimiento.",
        };
      case "F2":
        return {
          title: "F2: Aproximación Liviana",
          load: activeExMax?.prescriptions.phase_2_light ? \`\${activeExMax.prescriptions.phase_2_light} kg\` : "40-50 kg",
          reps: "4 reps",
          cue: "Carga liviana pero intención máxima: acelerá la barra en la fase concéntrica.",
        };
      case "F3":
        return {
          title: "F3: Aproximación Media",
          load: activeExMax?.prescriptions.phase_3_medium ? \`\${activeExMax.prescriptions.phase_3_medium} kg\` : "65-75 kg",
          reps: "3 reps",
          cue: "La barra ya empieza a sentirse sólida. Mantené la tensión abdominal y respiración diafragmática.",
        };
      case "F4":
        return {
          title: "F4: Activación Pesada (PAP)",
          load: activeExMax?.prescriptions.phase_4_pap ? \`\${activeExMax.prescriptions.phase_4_pap} kg\` : "80-85 kg",
          reps: "1-2 reps",
          cue: "Potenciación post-activación: despierta todas las unidades motoras antes de las series de trabajo.",
        };
      default:
        return {
          title: "Aproximación",
          load: "Carga progresiva",
          reps: "3-5 reps",
          cue: "Calentamiento específico.",
        };
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-between p-4 md:p-6 pb-20 font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. Top Coach Header */}
      <header className="w-full max-w-2xl flex items-center justify-between gap-3 border-b border-zinc-900/80 pb-4 mb-4">
        {/* Brand & Coach Status */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-wide text-white uppercase">
                ATP <span className="text-amber-400">COACH</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                GUIADO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Tu asistente de fuerza y descanso paso a paso
            </p>
          </div>
        </div>

        {/* Header Actions: Mode Toggle & Reset */}
        <div className="flex items-center gap-2">
          {/* Switch to Pro Analytics Mode */}
          <button
            type="button"
            onClick={toggleCoachMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs font-mono font-medium text-zinc-300 hover:text-amber-400 transition-all active:scale-95 cursor-pointer"
            title="Cambiar a Modo Pro (Dashboard Analítico)"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">MODO</span> PRO
          </button>

          {/* Reset Action */}
          <button
            type="button"
            onClick={() => setShowResetConfirm(!showResetConfirm)}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-amber-400 transition-all cursor-pointer"
            title="Reiniciar sesión o ejercicio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reset Popover Menu */}
      {showResetConfirm && (
        <div className="w-full max-w-2xl mb-4 p-4 rounded-2xl bg-zinc-950 border border-red-500/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-red-400 uppercase tracking-wide">¿Reiniciar progreso?</span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="text-zinc-500 hover:text-zinc-300 font-mono text-sm cursor-pointer"
            >
              Cerrar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleResetExercise();
                setShowResetConfirm(false);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 font-mono cursor-pointer"
            >
              Reiniciar Ejercicio Actual
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetDay();
                setShowResetConfirm(false);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 font-mono cursor-pointer"
            >
              Reiniciar Día Completo
            </button>
          </div>
        </div>
      )}

      {/* 2. Day Selector & Overall Session Progress */}
      <section className="w-full max-w-2xl space-y-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          {/* Day Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDayMenu(!showDayMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeDay.name}</span>
              <span className="text-zinc-500 text-[10px]">▼</span>
            </button>

            {showDayMenu && (
              <div className="absolute top-full left-0 mt-1 z-30 w-56 p-1.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-1">
                {SCHEDULE_DAYS.map((dItem) => (
                  <button
                    key={dItem.key}
                    type="button"
                    onClick={() => {
                      setSelectedDayKey(dItem.key);
                      setShowDayMenu(false);
                    }}
                    className={\`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer \${
                      dItem.key === selectedDayKey
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }\`}
                  >
                    <span>{dItem.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {dItem.exercises.length} ejer.
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Day Completion Stats */}
          <div className="text-right">
            <span className="text-xs font-mono text-amber-400 font-bold">
              {completedDaySets} / {totalDaySets} series
            </span>
            <span className="text-[10px] font-mono text-zinc-500 block">
              {dayProgressPercent}% del día
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: \`\${dayProgressPercent}%\` }}
          />
        </div>
      </section>

      {/* 3. Main Guided Card Area */}
      <section className="w-full max-w-2xl flex-1 flex flex-col justify-center my-2">
        {/* CASE A: DAY FINISHED (VICTORY SCREEN) */}
        {isDayFinished ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-amber-500/40 text-center space-y-5 glow-zen-gold animate-in zoom-in-95">
            <div className="inline-flex p-4 rounded-full bg-amber-500/20 text-amber-400 mb-1">
              <Trophy className="w-12 h-12 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                ¡Entrenamiento Completado!
              </h2>
              <p className="text-sm text-zinc-300 max-w-md mx-auto">
                Excelente trabajo de fuerza hoy. Respetaste los tiempos de resíntesis y la sobrecarga progresiva.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Series Hechas</span>
                <span className="text-2xl font-black font-mono text-amber-400">{completedDaySets}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Completado</span>
                <span className="text-2xl font-black font-mono text-emerald-400">100%</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={toggleCoachMode}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Ver Resumen Detallado en Modo Pro
              </button>
              <button
                type="button"
                onClick={handleResetDay}
                className="py-3.5 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-medium transition-all cursor-pointer"
              >
                Reiniciar Día
              </button>
            </div>
          </div>
        ) : isRunning ? (
          /* CASE B: ACTIVE ZEN REST TIMER */
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-amber-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Top Rest Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Descanso &amp; Resíntesis ATP
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {activeExercise.name}
              </span>
            </div>

            {/* Huge Rest Clock */}
            <div className="py-2">
              <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter text-white">
                {formatTime(remainingSeconds)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xs font-mono font-semibold text-amber-400">
                  Saturación ATP: {atpSaturationPercent}%
                </span>
              </div>
            </div>

            {/* Mindful Breathing Guide */}
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-1.5 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-300">
                <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Respiración de recuperación</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inhalá profundo por la nariz en 4s, sostené 4s y exhalá lento. Relajá hombros y mandíbula para optimizar el flujo de oxígeno.
              </p>
            </div>

            {/* What's next preview */}
            <div className="text-xs text-zinc-400 font-mono">
              Próximo paso:{" "}
              <span className="text-white font-bold">
                {isWarmupPhase
                  ? \`Siguiente rampa (\${activePhaseStep})\`
                  : \`Serie \${currentSet} de \${activeExercise.sets} con \${inputWeight} kg\`}
              </span>
            </div>

            {/* Primary Rest Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={skipRest}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>¡Listo, a la barra!</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "Pausar" : "Reanudar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartTimer(remainingSeconds + 30, timerTitle)}
                  className="py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-300 cursor-pointer"
                >
                  +30s
                </button>
                <button
                  type="button"
                  onClick={() => playChime(false)}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 cursor-pointer"
                  title="Probar sonido 528 Hz"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE C: ACTIVE STEP (WARMUP OR WORKING SET) */
          <div className="p-5 sm:p-7 rounded-3xl bg-zinc-950 border border-zinc-900 shadow-2xl space-y-6">
            {/* Exercise Header & Progress Indicator */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  EJERCICIO {activeExerciseIndex + 1} DE {activeDay.exercises.length}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: activeExercise.sets }).map((_, idx) => {
                    const setNum = idx + 1;
                    const isDone = currentSetsList.includes(setNum);
                    const isCurrent = !isDone && currentSet === setNum;
                    return (
                      <div
                        key={setNum}
                        className={\`w-2.5 h-2.5 rounded-full transition-all \${
                          isDone
                            ? "bg-emerald-400"
                            : isCurrent
                            ? "bg-amber-400 ring-4 ring-amber-400/20"
                            : "bg-zinc-800"
                        }\`}
                        title={\`Serie \${setNum}\`}
                      />
                    );
                  })}
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {activeExercise.name}
              </h2>
            </div>

            {/* Conditional: Warmup Phase vs Working Set */}
            {isWarmupPhase ? (
              /* WARMUP PHASE CARD */
              <div className="space-y-4">
                {(() => {
                  const info = getWarmupPhaseInfo(activePhaseStep);
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {info.title}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          Rampa preparatoria
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-1">
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                          <span className="text-[10px] font-mono text-zinc-500 block uppercase">Carga sugerida</span>
                          <span className="text-xl sm:text-2xl font-black font-mono text-white">{info.load}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                          <span className="text-[10px] font-mono text-zinc-500 block uppercase">Repeticiones</span>
                          <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">{info.reps}</span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        &ldquo;{info.cue}&rdquo;
                      </p>
                    </div>
                  );
                })()}

                {/* Primary Big Action Button: Complete Warmup Phase */}
                <button
                  type="button"
                  onClick={() => handleCompleteWarmupPhase(activePhaseStep as WarmupPhaseKey)}
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-base uppercase tracking-wider shadow-xl shadow-amber-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>¡Hecho, a descansar!</span>
                </button>

                {/* Skip Warmup Shortcut */}
                <button
                  type="button"
                  onClick={() => setActivePhaseStep("1")}
                  className="w-full text-center text-xs font-mono text-zinc-500 hover:text-zinc-300 py-1 transition-colors cursor-pointer"
                >
                  Ir directo a las series de trabajo →
                </button>
              </div>
            ) : (
              /* WORKING SET CARD */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    SERIE EFECTIVA {currentSet} DE {activeExercise.sets}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Descanso programado: {activeExercise.restSeconds || 180}s
                  </span>
                </div>

                {/* Weight & Reps Controllers (Big Ergonomic Touch Targets) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Weight Box */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Peso para esta serie
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => adjustWeight(-2.5)}
                        className="h-11 w-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center flex-1">
                        <span className="text-3xl font-black font-mono text-white">
                          {inputWeight}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 ml-1">kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustWeight(2.5)}
                        className="h-11 w-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reps Box */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Repeticiones objetivo
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => adjustReps(-1)}
                        className="h-11 w-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="text-center flex-1">
                        <span className="text-3xl font-black font-mono text-amber-400">
                          {inputReps}
                        </span>
                        <span className="text-xs font-mono text-zinc-400 ml-1">reps</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustReps(1)}
                        className="h-11 w-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Motivational Gym Cue */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-300 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    Foco total en la técnica. Respirá profundo antes de sacar la barra y empujá con intención explosiva.
                  </span>
                </div>

                {/* Primary Big Action Button: Complete Set */}
                <button
                  type="button"
                  onClick={() => handleCompleteSet()}
                  className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black font-black text-lg uppercase tracking-wider shadow-2xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>¡Serie Completada!</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Bottom Exercise Navigation Bar */}
      <footer className="w-full max-w-2xl flex items-center justify-between gap-3 pt-4 border-t border-zinc-900/80">
        <button
          type="button"
          onClick={handlePreviousExercise}
          disabled={activeExerciseIndex === 0}
          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer \${
            activeExerciseIndex === 0
              ? "border-zinc-900 bg-zinc-950 text-zinc-700 cursor-not-allowed"
              : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white"
          }\`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <span className="text-xs font-mono text-zinc-400 font-semibold truncate max-w-[180px] sm:max-w-none">
          {activeExercise.name}
        </span>

        <button
          type="button"
          onClick={handleNextExercise}
          disabled={activeExerciseIndex === activeDay.exercises.length - 1}
          className={\`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer \${
            activeExerciseIndex === activeDay.exercises.length - 1
              ? "border-zinc-900 bg-zinc-950 text-zinc-700 cursor-not-allowed"
              : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white"
          }\`}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </main>
  );
}
`;

fs.writeFileSync(coachViewPath, coachViewSource, 'utf8');
console.log('✔ CoachGuidedView.tsx created cleanly');
