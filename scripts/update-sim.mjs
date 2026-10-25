import * as fs from 'node:fs';

const simPath = 'C:\\Users\\valen\\portafolio\\src\\components\\EosSimulator.tsx';
let content = fs.readFileSync(simPath, 'utf-8');

content = content.replace(
  /Fase 1 \[DECIDE\]: Requisitos formalizados con sintaxis EARS\./,
  'Fase 1 [DECIDE]: Motor Dual-Track & Requisitos EARS/BDD.'
);

content = content.replace(
  /CUANDO el usuario inicie transferencia, EL SISTEMA ejecutará transacción ACID atómica\./,
  'Clasificación sintáctica HEAVY_TRACK. CUANDO se inicie transferencia, EL SISTEMA ejecutará ACID.'
);

content = content.replace(
  /Fase 2 \[EXECUTE\]: Dominio puro desacoplado \(Arquitectura Limpia L0\)\./,
  'Fase 2 [EXECUTE]: Dominio puro L0 & EOSSentinelDaemon 24/7.'
);

content = content.replace(
  /Tipado estricto con TypeScript \+ Zod\. Cero dependencias de framework en reglas core\./,
  'Arquitectura hexagonal sin dependencias + auditoría de firmas SHA-256 en tiempo real.'
);

content = content.replace(
  /Fase 3 \[VERIFY\]: Auditoría criptográfica y tests E2E superados\./,
  'Fase 3 [VERIFY]: FDIR Auto-Sanador, HUD de Flota & Sello Criptográfico.'
);

content = content.replace(
  /Playwright E2E: 100% Pass · Exit Code 0 · Ledger intent\.md sellado con SHA-256\./,
  'FDIR: 0 enlaces huérfanos · verify-fleet: 100% Pass (Exit Code 0) · Sello SHA-256.'
);

fs.writeFileSync(simPath, content, 'utf-8');
console.log('[OK] EosSimulator.tsx updated with EOS 2.1 features');
