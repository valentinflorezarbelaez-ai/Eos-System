import crypto from "node:crypto";
import registry from "../docs/projects/registry.json" with { type: "json" };

/**
 * EOS SYSTEM — STATIC FLEET REGISTRY SERVERLESS ENDPOINT (/api/fleet)
 * Exposes the public fleet registry. This endpoint does not probe deployments,
 * inspect local Git hooks, or dispatch builds.
 * Zero external dependencies.
 */

const FLEET_PROJECTS = registry.projects.map((project) => ({
  id: project.id,
  name: project.name,
  remote: project.remoteUrl,
  url: project.productionUrl,
  registryStatus: project.status || "UNKNOWN",
  productionProbe: "NOT_PROBED",
  cicdGateStatus: "NOT_PROBED",
  localHooksStatus: "NOT_PROBED"
}));

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ status: "METHOD_NOT_ALLOWED" });
  }

  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(FLEET_PROJECTS))
    .digest("hex");

  return res.status(200).json({
    status: "FLEET_REGISTRY_AVAILABLE",
    version: registry.version,
    updatedAt: registry.updatedAt,
    masterOrchestrator: registry.masterOrchestrator,
    registrySource: "docs/projects/registry.json",
    fleetSize: FLEET_PROJECTS.length,
    healthProbesRun: false,
    dispatchExecuted: false,
    commands: {
      fleetShip: "npm run fleet:ship",
      fleetVerify: "npm run fleet:verify",
      fleetInjectHooks: "npm run fleet:hooks"
    },
    projects: FLEET_PROJECTS,
    registryFingerprintSha256: `sha256:${digest}`
  });
}
