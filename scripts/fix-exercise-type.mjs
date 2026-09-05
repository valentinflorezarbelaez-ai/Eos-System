/**
 * Script to apply Coach-Guided UX to APP Fuerza (atp-strength-frontend)
 * Execution: node scripts/apply-coach-guided-ux.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = String.raw`C:\Users\valen\Documents\APP fuerza\atp-strength-frontend`;
const coachViewPath = path.join(frontendRoot, 'src', 'app', 'components', 'CoachGuidedView.tsx');

let content = fs.readFileSync(coachViewPath, 'utf8');

// Replace activeExercise.weight_type === "bodyweight" with name check
content = content.replace(
  'activeExercise.weight_type === "bodyweight" ? "Peso corporal" : "Barra sola (20 kg)"',
  'activeExercise.name.toLowerCase().includes("dominada") ? "Peso corporal" : "Barra sola (20 kg)"'
);

fs.writeFileSync(coachViewPath, content, 'utf8');
console.log('✔ Fixed Exercise type check in CoachGuidedView.tsx');
