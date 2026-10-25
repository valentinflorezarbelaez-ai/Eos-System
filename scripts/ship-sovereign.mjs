/**
 * EOS SYSTEM v9.0 — AUTONOMOUS SHIP COMMAND
 *
 * Usage: npm run ship:sovereign -- "feat(scope): description"
 *
 * Flow (fail-closed at every step):
 *   1. Run the 7-stage gate locally.
 *   2. git add + commit   (.githooks/pre-commit re-runs the gate)
 *   3. git push origin    (.githooks/pre-push re-runs the gate)
 *   4. GitHub Actions runs the gate again; Vercel Git integration builds
 *      production with buildCommand = the gate (a failing gate = failed build,
 *      production keeps serving the previous verified deployment).
 *   5. Poll https://eos-system-ten.vercel.app/api/cicd until it reports the
 *      exact pushed commit SHA, then probe the root page for HTTP 200.
 */
import { execSync } from "node:child_process";

const PROD = "https://eos-system-ten.vercel.app";
const message = process.argv.slice(2).join(" ").trim() || "chore(eos): verified continuous delivery";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}
function capture(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

console.log("======================================================================");
console.log(" EOS SYSTEM v9.0 — AUTONOMOUS CONTINUOUS INTEGRATION & DEPLOYMENT     ");
console.log("======================================================================");

console.log("\n[1/4] Running 7-stage Sovereign SecDevOps gate...");
run("node scripts/verify-cicd-pipeline.mjs");

console.log("\n[2/4] Committing (pre-commit hook re-verifies)...");
run("git add -A");
const staged = capture("git diff --cached --name-only");
if (staged) {
  run(`git commit -m ${JSON.stringify(message)}`);
} else {
  console.log("No staged changes; skipping commit.");
}

console.log("\n[3/4] Pushing to origin/main (pre-push hook re-verifies)...");
run("git push origin HEAD:main");
const sha = capture("git rev-parse HEAD");
console.log(`Pushed commit: ${sha}`);

console.log("\n[4/4] Waiting for Vercel Git deployment of this exact commit...");
const deadline = Date.now() + 5 * 60 * 1000;
let live = null;
while (Date.now() < deadline) {
  try {
    const res = await fetch(`${PROD}/api/cicd?probe=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      live = body.deployedCommit;
      if (live === sha) break;
    }
  } catch {
    // transient network error; keep polling
  }
  await new Promise((r) => setTimeout(r, 10000));
}

if (live !== sha) {
  console.error(`\n[FAIL] Production is serving commit ${live ?? "unknown"}, expected ${sha}.`);
  console.error("Check the Vercel build log: a failing gate blocks promotion by design.");
  process.exit(1);
}

const rootRes = await fetch(`${PROD}/`, { cache: "no-store" });
if (rootRes.status !== 200) {
  console.error(`\n[FAIL] Live root returned HTTP ${rootRes.status}.`);
  process.exit(1);
}

console.log(`\n[SUCCESS] ${sha.slice(0, 7)} is live at ${PROD} (root 200, /api/cicd 200).`);
