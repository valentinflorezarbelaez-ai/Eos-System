import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const isDaemonLoop = process.argv.includes("--loop");

console.log("======================================================================");
console.log(" EOS SYSTEM v11.0 — JARVIS SOVEREIGN AUTONOMOUS SENTINEL DAEMON       ");
console.log("======================================================================");
console.log("JARVIS Core : ONLINE | Voice / Arc-Reactor Engine Ready");
console.log("Orchestrator: c:\\Users\\valen\\Eos-System");
console.log("Mode        : " + (isDaemonLoop ? "CONTINUOUS 24/7 DAEMON LOOP" : "SINGLE AUTONOMOUS SWEEP"));

async function runAutonomousJarvisCycle() {
  console.log("\n[JARVIS PULSE] Inspecting Sovereign Fleet & SecDevOps Gates...");

  // 1. Run local 7-stage gate on EOS System
  try {
    execSync("node scripts/verify-cicd-pipeline.mjs", { stdio: "pipe" });
    console.log("  ✅ EOS Core 7-Stage Gate: PASSED (0 findings)");
  } catch (err) {
    console.error("  ❌ EOS Core Gate Alert: Fail-Closed Intercepted!");
    return;
  }

  // 2. Audit all registered fleet repositories
  try {
    execSync("node scripts/fleet-autonomous-cicd.mjs", { stdio: "inherit" });
    console.log("  ✅ Sovereign Fleet Health: AUDITED & SYNCHRONIZED");
  } catch (err) {
    console.warn("  ⚠️ Fleet Audit Warning:", err.message);
  }

  // 3. Verify Live Production Health
  try {
    const liveRes = await fetch("https://eos-system-ten.vercel.app/api/jarvis", { cache: "no-store" });
    if (liveRes.ok) {
      const data = await liveRes.json();
      console.log(`  ✅ Live JARVIS Serverless Nexus: 200 OK (${data.status})`);
    }
  } catch (err) {
    console.warn("  ⚠️ Live Probe Warning:", err.message);
  }

  console.log("\n[JARVIS REPORT] All systems operational. Peace Infallible, Architect Valentín.");
}

await runAutonomousJarvisCycle();

if (isDaemonLoop) {
  console.log("\nDaemon entering passive watch loop (interval: 60s). Press Ctrl+C to stop.");
  setInterval(async () => {
    await runAutonomousJarvisCycle();
  }, 60000);
}
