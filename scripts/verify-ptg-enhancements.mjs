/**
 * EOS Verification Script for PTG Resilience & Scalability Architecture
 * Run: node scripts/verify-ptg-enhancements.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_ROOT = "C:\\Users\\valen\\Documents\\agencia de representacion de jugadores - ptg";

const checks = [
  ['manifest.webmanifest exists and is valid JSON', () => {
    const raw = fs.readFileSync(path.join(TARGET_ROOT, 'manifest.webmanifest'), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.name && parsed.icons.length > 0;
  }],
  ['sw.js exists and is > 500 bytes', () => {
    return fs.statSync(path.join(TARGET_ROOT, 'sw.js')).size > 500;
  }],
  ['data/announcements.json exists and has 3+ announcements', () => {
    const raw = fs.readFileSync(path.join(TARGET_ROOT, 'data', 'announcements.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.announcements) && parsed.announcements.length >= 3;
  }],
  ['index.html links manifest.webmanifest', () => {
    const html = fs.readFileSync(path.join(TARGET_ROOT, 'index.html'), 'utf8');
    return html.includes('rel="manifest"') && html.includes('manifest.webmanifest');
  }],
  ['index.html has scout search input', () => {
    const html = fs.readFileSync(path.join(TARGET_ROOT, 'index.html'), 'utf8');
    return html.includes('id="ptg-scout-search"');
  }],
  ['index.html has novedades section', () => {
    const html = fs.readFileSync(path.join(TARGET_ROOT, 'index.html'), 'utf8');
    return html.includes('id="novedades"') && html.includes('board-announcements-grid');
  }],
  ['index.html has enhanced Schema.org @graph with athletes', () => {
    const html = fs.readFileSync(path.join(TARGET_ROOT, 'index.html'), 'utf8');
    return html.includes('@graph') && html.includes('ItemList') && html.includes('Samuel Martínez Correa');
  }],
  ['js/main.js has search, deep link handlers, and SW', () => {
    const code = fs.readFileSync(path.join(TARGET_ROOT, 'js', 'main.js'), 'utf8');
    return code.includes('scoutSearchInput') && code.includes('handlePlayerModalOpen') && code.includes('checkDeepLinkPlayer') && code.includes('serviceWorker');
  }],
  ['js/i18n.js has scout search and board announcements bilingual keys', () => {
    const code = fs.readFileSync(path.join(TARGET_ROOT, 'js', 'i18n.js'), 'utf8');
    return code.includes('scoutSearchPlaceholder') && code.includes('announcementsTitle') && code.includes('clearSearch');
  }],
  ['css/layout.css has search and announcement card styles', () => {
    const css = fs.readFileSync(path.join(TARGET_ROOT, 'css', 'layout.css'), 'utf8');
    return css.includes('.ptg-scout-search') && css.includes('.ptg-announcement-card');
  }]
];

let allPassed = true;
console.log('[EOS] Running PTG Architecture & Resilience Sensor Suite...\n');

checks.forEach(([name, fn]) => {
  try {
    const res = fn();
    if (res) {
      console.log(`  [PASS] ${name}`);
    } else {
      console.error(`  [FAIL] ${name} (returned falsy)`);
      allPassed = false;
    }
  } catch (err) {
    console.error(`  [FAIL] ${name} (${err.message})`);
    allPassed = false;
  }
});

console.log(`\n[EOS] Verification Summary: ${allPassed ? 'ALL SENSORS GREEN (10/10)' : 'FINDINGS IDENTIFIED'}`);
process.exit(allPassed ? 0 : 1);
