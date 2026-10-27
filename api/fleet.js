import crypto from "node:crypto";

/**
 * EOS SYSTEM — FLEET AUTONOMOUS CI/CD DISPATCHER SERVERLESS ENDPOINT (/api/fleet)
 * Exposes the public fleet registry. This endpoint does not probe deployments,
 * inspect local Git hooks, or dispatch builds.
 * Zero external dependencies.
 */

const FLEET_PROJECTS = [
  {
    id: "eos-system",
    name: "EOS System v10.0 (Control Plane Core)",
    remote: "https://github.com/valentinflorezarbelaez-ai/Eos-System.git",
    url: "https://eos-system-ten.vercel.app",
    registryStatus: "REGISTERED",
    productionProbe: "NOT_PROBED",
    cicdGateStatus: "NOT_PROBED",
    localHooksStatus: "NOT_PROBED"
  },
  {
    id: "aberamentho",
    name: "Aberamentho Pleroma Music v8.0",
    remote: "https://github.com/valentinflorezarbelaez-ai/Aberamentho-s-Pleroma-music.git",
    url: "https://aberamentosprelomamusic.vercel.app",
    registryStatus: "REGISTERED",
    productionProbe: "NOT_PROBED",
    cicdGateStatus: "NOT_PROBED",
    localHooksStatus: "NOT_PROBED"
  },
  {
    id: "portafolio",
    name: "Portafolio Oficial — Valentín Flórez",
    remote: "https://github.com/valentinflorezarbelaez-ai/portafolio.git",
    url: "https://portafolio-valentin.vercel.app",
    registryStatus: "REGISTERED",
    productionProbe: "NOT_PROBED",
    cicdGateStatus: "NOT_PROBED",
    localHooksStatus: "NOT_PROBED"
  },
  {
    id: "performance-talent-group",
    name: "PTG — Performance Talent Group",
    remote: "https://github.com/valentinflorezarbelaez-ai/Performance-Talent-Group.git",
    url: "https://ptg-performance-talent-group.vercel.app",
    registryStatus: "REGISTERED",
    productionProbe: "NOT_PROBED",
    cicdGateStatus: "NOT_PROBED",
    localHooksStatus: "NOT_PROBED"
  }
];

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
    version: "10.0.0-sovereign-fleet-dispatcher",
    masterOrchestrator: "eos-system-control-plane",
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
    registrySha256: `sha256:${digest}`
  });
}
