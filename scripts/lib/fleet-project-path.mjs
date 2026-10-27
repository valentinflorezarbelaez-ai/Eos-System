import path from "node:path";

/** Resolve an explicitly configured checkout without storing host paths in the public registry. */
export function resolveFleetProjectPath(project, projectRoot = process.cwd()) {
  if (!project || typeof project !== "object") return null;
  if (project.id === "eos-system") return path.resolve(projectRoot);

  const envName = project.localPathEnv;
  if (typeof envName !== "string" || !/^EOS_FLEET_[A-Z0-9_]+_PATH$/.test(envName)) return null;

  const configuredPath = process.env[envName];
  if (typeof configuredPath !== "string" || configuredPath.trim().length === 0) return null;
  return path.resolve(projectRoot, configuredPath.trim());
}
