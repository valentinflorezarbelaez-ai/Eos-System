import * as fs from 'node:fs';

const pagePath = 'C:\\Users\\valen\\portafolio\\src\\app\\page.tsx';
const simPath = 'C:\\Users\\valen\\portafolio\\src\\components\\EosSimulator.tsx';

// 1. Update page.tsx lede
let pageContent = fs.readFileSync(pagePath, 'utf-8');
pageContent = pageContent.replace(
  'EOS System y cada uno de mis 5 proyectos principales (Aberamentho Pleroma DSP, EOS Core, S.A.W. / ATP-Strength, PTG Performance Talent Group y Biblioteca Gnóstica) adoptan las mejores prácticas de ingeniería de plataformas del mundo: sesiones agénticas aisladas como en Xirp, contratos formales SDD y rendimiento de élite.',
  'EOS System 2.1 y cada uno de los 8 proyectos de mi flota soberana (Aberamentho DJ GOD 10/10 PRO con grabación Hi-Fi y control vehicular, EOS Core 2.1, S.A.W. / ATP-Strength con 59/59 tests, PTG con Licencia FIFA, Biblioteca Gnóstica con 21 rutas interactivas y Donaciones DRAB) adoptan las mejores prácticas de ingeniería del mundo: sesiones agénticas con aislamiento físico, motor Dual-Track, Sentinel Daemon 24/7 y verificación determinista continua.'
);
fs.writeFileSync(pagePath, pageContent, 'utf-8');
console.log('[OK] Updated page.tsx lede');

// 2. Update EosSimulator.tsx
let simContent = fs.readFileSync(simPath, 'utf-8');
simContent = simContent.replace(
  'message: "Fase 1 [DECIDE]: Requisitos formalizados con sintaxis EARS.",\n            detail: "CUANDO el usuario inicie transferencia, EL SISTEMA ejecutará transacción ACID atómica."',
  'message: "Fase 1 [DECIDE]: Motor Dual-Track & Requisitos EARS/BDD.",\n            detail: "Clasificación sintáctica en HEAVY_TRACK. CUANDO se inicie transferencia, EL SISTEMA ejecutará transacción ACID."'
);

simContent = simContent.replace(
  'message: "Fase 2 [EXECUTE]: Dominio puro desacoplado (Arquitectura Limpia L0).",\n            detail: "Tipado estricto con TypeScript + Zod. Cero dependencias de framework en reglas core."',
  'message: "Fase 2 [EXECUTE]: Dominio puro L0 & EOSSentinelDaemon 24/7.",\n            detail: "Arquitectura hexagonal sin dependencias + auditoría de firmas SHA-256 en tiempo real."'
);

simContent = simContent.replace(
  'message: "Fase 3 [VERIFY]: Auditoría criptográfica y tests E2E superados.",\n            detail: "Playwright E2E: 100% Pass · Exit Code 0 · Ledger intent.md sellado con SHA-256."',
  'message: "Fase 3 [VERIFY]: FDIR Auto-Sanador, HUD de Flota & Sello Criptográfico.",\n            detail: "FDIR: 0 enlaces huérfanos · verify-fleet: 100% Pass (Exit Code 0) · Sello SHA-256."'
);

fs.writeFileSync(simPath, simContent, 'utf-8');
console.log('[OK] Updated EosSimulator.tsx');
