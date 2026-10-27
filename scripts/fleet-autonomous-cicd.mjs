import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveFleetProjectPath } from "./lib/fleet-project-path.mjs";

const root = process.cwd();
const registryFile = path.join(root, "docs/projects/registry.json");
const isShipMode = process.argv.includes("--ship");
const getOption = (name) => process.argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const selectedProjectId = getOption("--project");
const confirmation = getOption("--confirm-project");
const commitMessage = getOption("--msg") || "chore: fleet sync and verification";

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function runGate(project, checkoutRoot) {
  if (typeof project.cicdGateScript !== "string" || project.cicdGateScript.trim() === "") {
    throw new Error("No CI gate script is configured for this project.");
  }

  const configuredPath = project.cicdGateScript.trim();
  const gatePath = path.resolve(checkoutRoot, configuredPath);
  const relative = path.relative(checkoutRoot, gatePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Configured CI gate must stay inside the selected repository.");
  }
  if (!fs.existsSync(gatePath)) throw new Error(`Configured CI gate was not found: ${configuredPath}`);

  const realCheckout = fs.realpathSync(checkoutRoot);
  const realGate = fs.realpathSync(gatePath);
  const realRelative = path.relative(realCheckout, realGate);
  if (realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error("Configured CI gate resolves outside the selected repository.");
  }
  if (!fs.statSync(realGate).isFile()) throw new Error("Configured CI gate must be a regular file.");

  const extension = path.extname(realGate).toLowerCase();
  console.log(`  CI gate        : RUNNING (${path.relative(realCheckout, realGate).replace(/\\/g, "/")})`);
  if (extension === ".js" || extension === ".mjs") {
    execFileSync(process.execPath, [realGate], { cwd: realCheckout, stdio: "inherit" });
  } else if (extension === ".ps1") {
    const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";
    execFileSync(powershell, ["-NoProfile", "-File", realGate], { cwd: realCheckout, stdio: "inherit" });
  } else {
    throw new Error(`Unsupported CI gate type: ${extension || "no extension"}. Use .js, .mjs, or .ps1.`);
  }
}

function normalizeProductionUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
  return url.href;
}

function normalizeGitRemote(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  let hostname;
  let repositoryPath;
  try {
    const url = new URL(value.trim());
    if (!["https:", "ssh:", "git:"].includes(url.protocol)) return null;
    hostname = url.hostname;
    repositoryPath = url.pathname;
  } catch {
    const scpRemote = value.trim().match(/^(?:[^@]+@)?([^:]+):(.+)$/);
    if (!scpRemote) return null;
    hostname = scpRemote[1];
    repositoryPath = scpRemote[2];
  }
  const normalizedPath = repositoryPath.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  if (!hostname || !normalizedPath) return null;
  return `${hostname.toLowerCase()}/${normalizedPath.toLowerCase()}`;
}

if (!fs.existsSync(registryFile)) {
  fail("Fleet registry is missing.");
} else {
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryFile, "utf8"));
  } catch {
    fail("Fleet registry is not valid JSON.");
  }

  if (registry && typeof registry === "object" && Array.isArray(registry.projects) &&
      registry.projects.every((project) => project && typeof project === "object" && typeof project.id === "string" && project.id.length > 0) &&
      new Set(registry.projects.map((project) => project.id)).size === registry.projects.length) {
    const projects = registry.projects;
    let selected = projects;
    if (selectedProjectId) selected = projects.filter((project) => project.id === selectedProjectId);

    if (selected.length === 0) {
      fail(selectedProjectId ? `Unknown project id: ${selectedProjectId}` : "Fleet registry contains no projects.");
    } else if (isShipMode && (!selectedProjectId || selected.length !== 1 || confirmation !== selectedProjectId)) {
      fail("Ship mode requires one --project=<id> and a matching --confirm-project=<id>. No repository was changed.");
    } else {
      let productionProbes = 0;
      let healthyProbes = 0;
      let localCheckFailures = 0;

      for (const project of selected) {
        console.log(`\n▶ Project: ${project.name} [${project.id}]`);
        const productionUrl = normalizeProductionUrl(project.productionUrl);
        if (isShipMode && !productionUrl) {
          localCheckFailures++;
          fail(`A valid HTTPS productionUrl is required for ${project.id}. No repository was changed.`);
          break;
        }

        const projectPath = resolveFleetProjectPath(project, root);
        if (!projectPath) {
          console.log(`  Local checkout : NOT CONFIGURED (${project.localPathEnv || "no environment variable"})`);
          if (isShipMode) {
            localCheckFailures++;
            fail(`Local checkout for ${project.id} is not configured. No repository was changed.`);
            break;
          }
        } else if (!fs.existsSync(projectPath)) {
          console.log("  Local checkout : NOT FOUND");
          if (isShipMode) {
            localCheckFailures++;
            fail(`Local checkout for ${project.id} was not found. No repository was changed.`);
            break;
          }
        } else {
          let checkoutRoot;
          let changes = "";
          try {
            const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
              cwd: projectPath,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"]
            }).trim();
            checkoutRoot = fs.realpathSync(gitRoot);
            const normalizedPath = fs.realpathSync(projectPath);
            if (checkoutRoot !== normalizedPath) throw new Error("Configured path is not the Git repository root.");

            changes = execFileSync("git", ["status", "--short"], {
              cwd: checkoutRoot,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"]
            }).trim();
            console.log(`  Git checkout   : VERIFIED (${changes ? "working tree has changes" : "clean"})`);
            if (isShipMode) {
              const expectedRemote = normalizeGitRemote(project.remoteUrl);
              const actualRemote = execFileSync("git", ["remote", "get-url", "origin"], {
                cwd: checkoutRoot,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"]
              }).trim();
              if (!expectedRemote || normalizeGitRemote(actualRemote) !== expectedRemote) {
                throw new Error("The checkout's origin does not match the repository registered for this project.");
              }
              console.log("  Git remote     : MATCHES REGISTRY");
            }
          } catch (error) {
            localCheckFailures++;
            console.error(`  Git checkout   : CHECK FAILED (${error.message})`);
            if (isShipMode) {
              fail(`Git checkout validation failed for ${project.id}; no further actions will run.`);
              break;
            }
          }

          if (checkoutRoot && isShipMode) {
            try {
              runGate(project, checkoutRoot);
              console.log("  CI gate        : PASSED");
            } catch (error) {
              localCheckFailures++;
              fail(`CI gate failed for ${project.id}; no commit or push was attempted. ${error.message}`);
              break;
            }

            try {
              // Re-read status after the gate because a configured verifier may create receipts.
              changes = execFileSync("git", ["status", "--short"], {
                cwd: checkoutRoot,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"]
              }).trim();
              if (changes) {
                execFileSync("git", ["add", "-A"], { cwd: checkoutRoot, stdio: "inherit" });
                execFileSync("git", ["commit", "-m", commitMessage], { cwd: checkoutRoot, stdio: "inherit" });
                execFileSync("git", ["push", "origin", "HEAD"], { cwd: checkoutRoot, stdio: "inherit" });
                console.log("  Ship           : commit and push completed");
              } else {
                console.log("  Ship           : no changes to commit");
              }
            } catch (error) {
              localCheckFailures++;
              fail(`Ship operation failed for ${project.id}. ${error.message}`);
              break;
            }
          }
        }

        if (productionUrl) {
          try {
            productionProbes++;
            const response = await fetch(productionUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
            console.log(`  Production     : HTTP ${response.status}`);
            if (response.status === 200) healthyProbes++;
            else localCheckFailures++;
          } catch (error) {
            productionProbes++;
            localCheckFailures++;
            console.log(`  Production     : UNREACHABLE (${error.message})`);
          }
        } else {
          console.log("  Production     : NOT CONFIGURED OR INVALID HTTPS URL");
          localCheckFailures++;
        }
      }

      console.log(`\nFleet report: ${healthyProbes}/${productionProbes} production probes returned HTTP 200; ${localCheckFailures} check(s) failed or were unreachable.`);
      if (localCheckFailures > 0 || productionProbes === 0) process.exitCode = 1;
      else console.log("All requested checks completed successfully.");
    }
  } else if (registry !== undefined) {
    fail("Fleet registry must contain unique project entries with non-empty string IDs.");
  }
}
