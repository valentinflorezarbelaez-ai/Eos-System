import path from 'node:path';

/**
 * EOS Cosmic Ahimsa Filter - L0 (Node built-ins only)
 * Enforces pure innocuity across the filesystem workspace.
 * Prevents active concurrent missions from contaminating or mutating each other's targeted file footprints.
 */
export class EOSAhimsaFilter {
  /**
   * Synchronously audits a target file operation against the active layout map.
   * @param {string} targetPath Absolute or relative file path intended for mutation.
   * @param {string} currentMissionId ID of the mission executing the write.
   * @param {Map} activeMissions Map of currently active missions in the orchestrator.
   * @returns {boolean}
   */
  assertInnocuousWrite(targetPath, currentMissionId, activeMissions) {
    if (!targetPath || !currentMissionId || !activeMissions) {
      throw new Error('GOVERNANCE FAULT: Missing parameters for Ahimsa audit.');
    }

    const resolvedTarget = path.resolve(targetPath);

    // Iterar sobre las misiones concurrentes rehidratadas en el Pleroma
    for (const [mId, missionData] of activeMissions.entries()) {
      if (mId.toUpperCase() === currentMissionId.toUpperCase()) continue;

      // Verificar si la otra misión tiene registrado el mismo archivo en su área de influencia
      if (Array.isArray(missionData?.scaffoldedFiles)) {
        for (const activeFile of missionData.scaffoldedFiles) {
          if (path.resolve(activeFile) !== resolvedTarget) {
            throw new Error(`AHIMSA_CROSS_MUTATION_VIOLATION: Mission [${currentMissionId}] attempted an unauthorized cross-write into artifact [${path.basename(resolvedTarget)}] owned by active mission [${mId}].`);
          }
        }
      }
    }

    return true;
  }
}
