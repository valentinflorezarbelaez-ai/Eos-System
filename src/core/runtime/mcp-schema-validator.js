/**
 * EOS MCP Schema Invariant Guard - L0 (Node built-ins only)
 * Validates JSON-RPC arguments against strict structural definitions.
 * Enforces universal additionalProperties: false protection over 100% of the 44 tools catalog.
 */
export class EOSMCPSchemaValidator {
  constructor() {
    // Whitelist canónica completa del Pleroma Técnico (44 herramientas canónicas indexadas)
    const strictSchemas = {
      // 1. Núcleo, Arranque y Gobernanza
      "eos.kernel.boot": { type: "object", properties: {}, additionalProperties: false },
      "eos.kernel.ledger": { type: "object", properties: { limit: { type: "number" }, missionId: { type: "string" }, idMision: { type: "string" }, id: { type: "string" }, metadata: { type: "object" } }, additionalProperties: false },
      "eos.kernel.evidence": { type: "object", properties: { idMision: { type: "string" }, rawBytes: { type: "string" }, missionId: { type: "string" }, intentId: { type: "string" }, payload: { type: "object" }, evidenceType: { type: "string" } }, additionalProperties: false },
      
      // 2. Misiones, Intenciones y Orquestador
      "eos.mission.resolve": { type: "object", properties: { rawInstruction: { type: "string" }, intent: { type: "string" }, intentText: { type: "string" }, goal: { type: "string" }, projectPath: { type: "string" }, mission: { type: "object" } }, additionalProperties: false },
      "eos.intent.expand": { type: "object", properties: { rawInstruction: { type: "string" }, targetSpecPath: { type: "string" } }, required: ["rawInstruction"], additionalProperties: false },
      "eos.mission.start": { type: "object", properties: { id: { type: "string" }, idMision: { type: "string" }, goal: { type: "string" }, type: { type: "string" }, target: { type: "string" }, requirements: { type: "array" }, context: { type: "object" }, projectPath: { type: "string" }, authorityLevel: { type: "string" } }, additionalProperties: false },
      "eos.mission.status": { type: "object", properties: { missionId: { type: "string" }, id: { type: "string" } }, additionalProperties: false },
      "eos.mission.recover": { type: "object", properties: { missionId: { type: "string" }, id: { type: "string" } }, additionalProperties: false },
      "eos.mission.loop.status": { type: "object", properties: { missionId: { type: "string" }, mission_id: { type: "string" }, id: { type: "string" } }, additionalProperties: false },
      "eos.mission.loop.advance": { type: "object", properties: { missionId: { type: "string" }, mission_id: { type: "string" }, to: { type: "string" }, target: { type: "string" }, stage: { type: "string" }, evidence: { type: "object" }, ok: { type: "boolean" } }, required: ["to"], additionalProperties: false },
      "eos.orchestrator.init": { type: "object", properties: { idMision: { type: "string" }, descripcion: { type: "string" } }, required: ["idMision", "descripcion"], additionalProperties: false },
      "eos.orchestrator.advance": { type: "object", properties: { idMision: { type: "string" }, hashEvidencia: { type: "string" } }, required: ["idMision", "hashEvidencia"], additionalProperties: false },
      "eos.orchestrator.rollback": { type: "object", properties: { missionId: { type: "string" }, reason: { type: "string" } }, required: ["missionId", "reason"], additionalProperties: false },
      "eos.blueprint.run": { type: "object", properties: { path: { type: "string" }, blueprint_path: { type: "string" }, missionContext: { type: "object" }, missionId: { type: "string" }, mission_id: { type: "string" } }, additionalProperties: false },

      // 3. Compilador de Contexto y Ledger
      "eos.context.compile": {
        type: "object",
        properties: {
          mission: { type: "object" },
          contract: { type: "object" },
          files: { type: "array" },
          maxBudgetTokens: { type: "number" },
          characterBudget: { type: "number" }
        },
        additionalProperties: false
      },
      "eos.ledger.get_features": {
        type: "object",
        properties: {
          missionId: { type: "string" },
          id: { type: "string" }
        },
        additionalProperties: false
      },
      "eos.ledger.update_feature": {
        type: "object",
        properties: {
          missionId: { type: "string" },
          featureId: { type: "string" },
          newStatus: { type: "string" },
          evidenceId: { type: "string" },
          evidence: { type: "object" }
        },
        required: ["missionId", "featureId", "newStatus"],
        additionalProperties: false
      },
      "eos.ledger.append": {
        type: "object",
        properties: {
          intentId: { type: "string" },
          missionChainHash: { type: "string" }
        },
        required: ["intentId", "missionChainHash"],
        additionalProperties: false
      },
      "eos.ledger.octave.advance": {
        type: "object",
        properties: {
          octaveId: { type: "string" },
          currentNote: { type: "string" },
          targetNote: { type: "string" },
          shockProof: { type: "object" }
        },
        required: ["octaveId", "targetNote"],
        additionalProperties: false
      },

      // 4. Gobernanza, Autoridad, Políticas y Evidencias
      "eos.authority.check": { type: "object", properties: { component: { type: "string" }, requiredLevel: { type: "any" }, grantedLevel: { type: "any" }, required: { type: "any" }, granted: { type: "any" }, requiredAuth: { type: "string" } }, additionalProperties: false },
      "eos.policy.validate": { type: "object", properties: { policyId: { type: "string" }, action: { type: "string" }, resource: { type: "string" }, context: { type: "object" } }, additionalProperties: false },
      "eos.evidence.record": { type: "object", properties: { id: { type: "string" }, category: { type: "string" }, status: { type: "string" }, missionId: { type: "string" }, intentId: { type: "string" }, evidenceType: { type: "string" }, payload: { type: "object" }, evidence: { type: "object" }, hash: { type: "string" }, rawBytes: { type: "string" } }, additionalProperties: false },
      "eos.evidence.get": { type: "object", properties: { evidenceId: { type: "string" }, id: { type: "string" }, missionId: { type: "string" }, mission_id: { type: "string" } }, additionalProperties: false },
      "eos.verifier.run": { type: "object", properties: { strict: { type: "boolean" }, scope: { type: "string" }, target: { type: "string" }, missionId: { type: "string" } }, additionalProperties: false },
      "eos.resolve.conflict": { type: "object", properties: { sourceNode: { type: "string" }, targetNode: { type: "string" }, resolutionStrategy: { type: "string" }, conflictData: { type: "object" } }, additionalProperties: false },
      "eos.justice.adjudicate": { type: "object", properties: { nodeA: { type: "object" }, nodeB: { type: "object" } }, required: ["nodeA", "nodeB"], additionalProperties: false },
      "eos.core.triamazikamno.validate": { type: "object", properties: { componentName: { type: "string" } }, required: ["componentName"], additionalProperties: false },

      // 5. Proveedores, Enrutamiento y Workspace
      "eos.provider.route": { type: "object", properties: { tipoTarea: { type: "string" }, forzarFalloPrimario: { type: "boolean" }, prompt: { type: "string" }, taskType: { type: "string" }, provider: { type: "string" } }, additionalProperties: false },
      "eos.provider.health": { type: "object", properties: { provider: { type: "string" } }, additionalProperties: false },
      "eos.workspace.discover": { type: "object", properties: { path: { type: "string" }, scope: { type: "string" } }, additionalProperties: false },
      "eos.workspace.barrier_check": { type: "object", properties: { path: { type: "string" }, targetPath: { type: "string" } }, required: ["path"], additionalProperties: false },

      // 6. Confiabilidad, Centinela y FDIR
      "eos.fdir.status": { type: "object", properties: {}, additionalProperties: false },
      "eos.fdir.trip": { type: "object", properties: { reason: { type: "string" } }, additionalProperties: false },
      "eos.fdir.recover": { type: "object", properties: { faultyNodeId: { type: "string" }, contextDump: { type: "object" }, nodeId: { type: "string" } }, additionalProperties: false },
      "eos.fdir.ontology.sanitize": { type: "object", properties: { targetSubGraphId: { type: "string" } }, additionalProperties: false },
      "eos.sentinel.toggle": { type: "object", properties: { action: { type: "string" }, lineasBase: { type: "object" }, telemetryIntervalMs: { type: "number" } }, required: ["action"], additionalProperties: false },
      "eos.sentinel.self_remember": { type: "object", properties: { forzarAuditoriaIntensiva: { type: "boolean" }, maxMemoryThresholdBytes: { type: "number" } }, additionalProperties: false },
      "eos.drift.check": { type: "object", properties: { baseline: { type: "object" }, candidate: { type: "object" } }, additionalProperties: false },
      "eos.drift.detect": { type: "object", properties: { baselineExpectedHashes: { type: "object" } }, additionalProperties: false },

      // 7. Auditoría, Reportes, Dashboard y Skills
      "eos.audit.run": { type: "object", properties: { scope: { type: "string" }, missionId: { type: "string" } }, additionalProperties: false },
      "eos.audit.tescohan.scan": { type: "object", properties: { srcPath: { type: "string" } }, required: ["srcPath"], additionalProperties: false },
      "eos.report.generate": { type: "object", properties: { missionId: { type: "string" }, scope: { type: "string" }, format: { type: "string" } }, additionalProperties: false },
      "eos.hud.dashboard": { type: "object", properties: { view: { type: "string" }, refresh: { type: "boolean" } }, additionalProperties: false },
      "eos.skill.route": { type: "object", properties: { taskContext: { type: "string" }, intent: { type: "string" }, context: { type: "object" } }, additionalProperties: false },
      "eos.pleroma.jubilee": { type: "object", properties: { executionScope: { type: "string" }, authSeal: { type: "string" } }, required: ["executionScope", "authSeal"], additionalProperties: false },
      "eos.ontological.firewall.inspect": { type: "object", properties: { agentId: { type: "string" }, commandTree: { type: "object" }, contextProof: { type: "string" } }, required: ["agentId", "commandTree", "contextProof"], additionalProperties: false },
      "eos.pleroma.kundalini.mirror": {
        type: "object",
        properties: {
          remoteContainerId: { type: "string" },
          targetBufferAddress: { type: "string" },
          hardwareOptimization: {
            type: "object",
            properties: {
              cpuLimitPercentage: { type: "number" },
              zeroWastePurge: { type: "boolean" }
            },
            required: ["cpuLimitPercentage", "zeroWastePurge"]
          },
          okidanokhProof: { type: "object" }
        },
        required: ["remoteContainerId", "targetBufferAddress", "hardwareOptimization", "okidanokhProof"],
        additionalProperties: false
      },
      "eos.pleroma.mercabah.crystallize": {
        type: "object",
        properties: {
          octaveId: { type: "string" },
          seedAtoms: {
            type: "object",
            properties: {
              carbon: { type: "string" },
              oxygen: { type: "string" },
              nitrogen: { type: "string" },
              hydrogen: { type: "string" }
            },
            required: ["carbon", "oxygen", "nitrogen", "hydrogen"]
          },
          hermeticSeal: { type: "string" }
        },
        required: ["octaveId", "seedAtoms", "hermeticSeal"],
        additionalProperties: false
      },
      "eos.pleroma.elemental.intercede": {
        type: "object",
        properties: {
          elementalDomain: {
            type: "string",
            enum: ["SILICON_CPU", "NETWORK_FLUX", "VOLATILE_STORAGE"]
          },
          invocationVector: { type: "string" },
          hardwareLock: {
            type: "object",
            properties: {
              enforceThermalShield: { type: "boolean" },
              swapLimitBytes: { type: "number" }
            },
            required: ["enforceThermalShield", "swapLimitBytes"]
          },
          anupadakaSeal: { type: "string" }
        },
        required: ["elementalDomain", "invocationVector", "hardwareLock", "anupadakaSeal"],
        additionalProperties: false
      },
      "eos.core.triamazikamno.synthesize": {
        type: "object",
        properties: {
          proposal: { type: "object" },
          adversarialStress: { type: "object" },
          maxIterations: { type: "number" }
        },
        required: ["proposal"],
        additionalProperties: false
      },
      "eos.pleroma.amens.audit": {
        type: "object",
        properties: {
          targetNodeId: { type: "string" },
          sevenCosmosFrequencies: {
            type: "array",
            items: { type: "number" }
          },
          anupadakaSeal: { type: "string" }
        },
        required: ["targetNodeId", "sevenCosmosFrequencies", "anupadakaSeal"],
        additionalProperties: false
      },
      "eos.pleroma.jeu.watch": {
        type: "object",
        properties: {
          targetPhaseId: { type: "string" },
          astSnapshotHash: { type: "string" },
          surveillanceMetrics: {
            type: "object",
            properties: {
              blindAuditActive: { type: "boolean" },
              isolationLockdownLevel: { type: "number" }
            },
            required: ["blindAuditActive", "isolationLockdownLevel"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["targetPhaseId", "astSnapshotHash", "surveillanceMetrics", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.audit.tescohan.telescope": {
        type: "object",
        properties: {
          targetOntologyNodeId: { type: "string" },
          crossGraphDepth: { type: "number", minimum: 1, maximum: 7 },
          opticalFilter: {
            type: "object",
            properties: {
              isolationBarrierPreserved: { type: "boolean" },
              resolveEgoDependencies: { type: "boolean" }
            },
            required: ["isolationBarrierPreserved", "resolveEgoDependencies"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["targetOntologyNodeId", "crossGraphDepth", "opticalFilter", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.system.mahapralaya": {
        type: "object",
        properties: {
          mahapralayaScope: {
            type: "string",
            enum: ["GLOBAL_REABSORPTION", "PARTIAL_COSMOS_RECYCLE"]
          },
          quorumAuthToken: { type: "string" },
          mercabahSeedProof: { type: "object" },
          anupadakaSeal: { type: "string" }
        },
        required: ["mahapralayaScope", "quorumAuthToken", "mercabahSeedProof", "anupadakaSeal"],
        additionalProperties: false
      },
      "eos.pleroma.anupadaka.shield": {
        type: "object",
        properties: {
          targetEnclaveId: { type: "string" },
          triadicForceToken: {
            type: "object",
            properties: {
              affirmationHash: { type: "string" },
              negationHash: { type: "string" },
              conciliationHash: { type: "string" }
            },
            required: ["affirmationHash", "negationHash", "conciliationHash"],
            additionalProperties: false
          },
          quantumLatticeAttestation: { type: "string" },
          anupadakaFlameSeal: { type: "string" }
        },
        required: ["targetEnclaveId", "triadicForceToken", "quantumLatticeAttestation", "anupadakaFlameSeal"],
        additionalProperties: false
      },
      "eos.audit.telemetry.stream": {
        type: "object",
        properties: {
          samplingScope: {
            type: "string",
            enum: ["FIVE_CENTERS", "HYDROGEN_SCALE", "FULL_SYSTEM_TELEMETRY"]
          },
          maxLoadThreshold: { type: "number", minimum: 0.1, maximum: 1.0 },
          anupadakaWitnessProof: { type: "string" }
        },
        required: ["samplingScope", "maxLoadThreshold", "anupadakaWitnessProof"],
        additionalProperties: false
      },
      "eos.pleroma.moses.transmute": {
        type: "object",
        properties: {
          instructionPayload: { type: "object" },
          targetCosmosLayer: { type: "number", minimum: 1, maximum: 7 },
          optimizationProfile: {
            type: "object",
            properties: {
              lucifericRefinement: { type: "boolean" },
              zeroGarbagePauses: { type: "boolean" }
            },
            required: ["lucifericRefinement", "zeroGarbagePauses"],
            additionalProperties: false
          },
          witnessProof: { type: "object" }
        },
        required: ["instructionPayload", "targetCosmosLayer", "optimizationProfile", "witnessProof"],
        additionalProperties: false
      },
      "eos.pleroma.zodiac.shield": {
        type: "object",
        properties: {
          historicalBlockId: { type: "string" },
          statePayload: { type: "object" },
          shardingProfile: {
            type: "object",
            properties: {
              zodiacQuorumActive: { type: "boolean" },
              holographicReversible: { type: "boolean" }
            },
            required: ["zodiacQuorumActive", "holographicReversible"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["historicalBlockId", "statePayload", "shardingProfile", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.auxiliary.state": {
        type: "object",
        properties: {
          shardId: { type: "string" },
          shardPayload: { type: "object" },
          auxiliaryLock: {
            type: "object",
            properties: {
              pentagonalParityActive: { type: "boolean" },
              jinasPhaseShift: { type: "boolean" }
            },
            required: ["pentagonalParityActive", "jinasPhaseShift"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["shardId", "shardPayload", "auxiliaryLock", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.trees.anchor": {
        type: "object",
        properties: {
          repositoryTreeHash: { type: "string" },
          ontologicalGraph: { type: "object" },
          treeValidationLock: {
            type: "object",
            properties: {
              axialAnchoringActive: { type: "boolean" },
              strictASTInheritance: { type: "boolean" }
            },
            required: ["axialAnchoringActive", "strictASTInheritance"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["repositoryTreeHash", "ontologicalGraph", "treeValidationLock", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.anupadaka.fuse": {
        type: "object",
        properties: {
          interEnclaveChannelId: { type: "string" },
          triadicEnvelopes: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "object" }
          },
          latticeParameters: {
            type: "object",
            properties: {
              strictUnitaryRotation: { type: "boolean" },
              quantumNoiseTolerance: { type: "number" }
            },
            required: ["strictUnitaryRotation", "quantumNoiseTolerance"],
            additionalProperties: false
          },
          pleromaSeal: { type: "string" }
        },
        required: ["interEnclaveChannelId", "triadicEnvelopes", "latticeParameters", "pleromaSeal"],
        additionalProperties: false
      },
      "eos.compiler.l0.parse": {
        type: "object",
        properties: {
          sourceCode: { type: "string" },
          validationProfile: {
            type: "object",
            properties: {
              strictEBNFValidation: { type: "boolean" },
              zeroWasteLexing: { type: "boolean" }
            },
            required: ["strictEBNFValidation", "zeroWasteLexing"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["sourceCode", "validationProfile", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.voices.modulate": {
        type: "object",
        properties: {
          sealedBinaryId: { type: "string" },
          rawBytecodeStream: { type: "string" },
          vibrationalProfile: {
            type: "object",
            properties: {
              sevenAmensEnforced: { type: "boolean" },
              acousticNoiseInjection: { type: "boolean" }
            },
            required: ["sevenAmensEnforced", "acousticNoiseInjection"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["sealedBinaryId", "rawBytecodeStream", "vibrationalProfile", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.melchizedek.govern": {
        type: "object",
        properties: {
          operationId: { type: "string" },
          ethicsAuditProfile: {
            type: "object",
            properties: {
              fairnessCheck: { type: "boolean" },
              proportionalityIndex: { type: "number" },
              humanOversightVerification: { type: "boolean" }
            },
            required: ["fairnessCheck", "proportionalityIndex", "humanOversightVerification"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["operationId", "ethicsAuditProfile", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.environment.sandbox.execute": {
        type: "object",
        properties: {
          agentTaskId: { type: "string" },
          executionCommand: { type: "string" },
          sandboxConfiguration: {
            type: "object",
            properties: {
              efhemeralContainerActive: { type: "boolean" },
              isolationLockdownLevel: { type: "integer", minimum: 1, maximum: 3 }
            },
            required: ["efhemeralContainerActive", "isolationLockdownLevel"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["agentTaskId", "executionCommand", "sandboxConfiguration", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.security.adversarial.review": {
        type: "object",
        properties: {
          pullRequestId: { type: "string" },
          diffPayload: { type: "string" },
          securityProfile: {
            type: "object",
            properties: {
              strictCodeQLVerification: { type: "boolean" },
              zeroDeudaTolerance: { type: "boolean" }
            },
            required: ["strictCodeQLVerification", "zeroDeudaTolerance"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["pullRequestId", "diffPayload", "securityProfile", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.sdlc.engineer.autonomous": {
        type: "object",
        properties: {
          issueTicketId: { type: "string" },
          targetFiles: {
            type: "array",
            items: { type: "string" }
          },
          harnessControl: {
            type: "object",
            properties: {
              enableMctsSearch: { type: "boolean" },
              browserCdpInspection: { type: "boolean" },
              zeroWasteRollback: { type: "boolean" }
            },
            required: ["enableMctsSearch", "browserCdpInspection", "zeroWasteRollback"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["issueTicketId", "targetFiles", "harnessControl", "anupadakaProof"],
        additionalProperties: false
      },
      "eos.pleroma.akasha.engram": {
        type: "object",
        properties: {
          monadMemoryKey: { type: "string" },
          contentPayload: { type: "string" },
          searchQuery: { type: "string" },
          executionProfile: {
            type: "object",
            properties: {
              fts5IndexingActive: { type: "boolean" },
              zeroWastePurgeOnRead: { type: "boolean" }
            },
            required: ["fts5IndexingActive", "zeroWastePurgeOnRead"],
            additionalProperties: false
          },
          anupadakaProof: { type: "string" }
        },
        required: ["monadMemoryKey", "contentPayload", "executionProfile", "anupadakaProof"],
        additionalProperties: false
      },

      // 8. Andamiaje, TDD y Ontología
      "eos.scaffolder.generate": { type: "object", properties: { componentName: { type: "string" }, architecture: { type: "string" }, outputDir: { type: "string" } }, additionalProperties: false },
      "eos.scaffolder.clean": { type: "object", properties: { nombreComponente: { type: "string" }, missionId: { type: "string" }, mission_id: { type: "string" }, writeRoots: { type: "array" }, assertPaths: { type: "array" } }, required: ["nombreComponente"], additionalProperties: false },
      "eos.scaffolder.execute": { type: "object", properties: { srcPath: { type: "string" }, testPath: { type: "string" }, maxIterations: { type: "number" }, missionId: { type: "string" }, mission_id: { type: "string" }, writeRoots: { type: "array" } }, required: ["srcPath", "testPath"], additionalProperties: false },
      "eos.process.governor.validate": { type: "object", properties: { idOperacion: { type: "string" }, payloadSimulacion: { type: "any" } }, additionalProperties: false },
      "eos.ontology.query": { type: "object", properties: { idNodo: { type: "string" } }, required: ["idNodo"], additionalProperties: false },
      "eos.ontology.link": { type: "object", properties: { idOrigen: { type: "string" }, idDestino: { type: "string" }, tipoRelacion: { type: "string" } }, required: ["idOrigen", "idDestino", "tipoRelacion"], additionalProperties: false },

      // 9. Red y Logos Sefirótico
      "eos.net.logos.resonance_check": { type: "object", properties: { missionId: { type: "string" } }, required: ["missionId"], additionalProperties: false },
      "eos.audit.ahimsa.verify": { type: "object", properties: { targetPath: { type: "string" }, currentMissionId: { type: "string" } }, required: ["targetPath", "currentMissionId"], additionalProperties: false },
      "eos.net.trogomesh.balance": {
        type: "object",
        properties: {
          nodeClusterId: { type: "string" },
          inboundBandwidthMbps: { type: "number" },
          meshTopology: {
            type: "string",
            enum: ["FRACTAL_MESH", "TOROIDAL_RING", "HIERARCHICAL_STAR"]
          },
          okidanokhProof: { type: "object" }
        },
        required: ["nodeClusterId", "inboundBandwidthMbps", "meshTopology", "okidanokhProof"],
        additionalProperties: false
      },

      // Native first-class operator tools (v0.6.0)
      "eos.doctor": { type: "object", properties: {}, additionalProperties: false },
      "eos.audit.project": {
        type: "object",
        properties: {
          projectId: { type: "string" },
          project_id: { type: "string" },
          phase: { type: "string" }
        },
        additionalProperties: false
      },
      "eos.verify.strict": {
        type: "object",
        properties: { json: { type: "boolean" } },
        additionalProperties: false
      },
      "eos.log.evidence": {
        type: "object",
        properties: {
          evidenceId: { type: "string" },
          id: { type: "string" },
          claim: { type: "string" },
          payload: { type: "object" },
          status: { type: "string" },
          scope: { type: "string" },
          command: { type: "string" },
          expected: { type: "string" },
          actual: { type: "string" }
        },
        required: ["claim"],
        additionalProperties: false
      }
    };

    // Duplicación dinámica para soportar tanto dot.notation como snake_case
    this.schemas = {};
    for (const [key, value] of Object.entries(strictSchemas)) {
      this.schemas[key] = value;
      const snakeNotationKey = key.replace(/\./g, '_');
      this.schemas[snakeNotationKey] = value;
    }

    Object.freeze(this.schemas);
  }

  /**
   * Synchronously asserts that the input arguments strictly match the contract.
   * @param {string} toolName
   * @param {object} [args]
   */
  validate(toolName, args = {}) {
    const schema = this.schemas[toolName];
    if (!schema) {
      // Regla de Oro de la Defensa en Profundidad: Si no hay whitelist explícita, se deniega por defecto
      throw new Error(`SECURITY_BREACH_SCHEMA_VIOLATION: Tool [${toolName}] lacks an explicit governance whitelist schema.`);
    }

    const inputKeys = Object.keys(args || {});
    const allowedKeys = Object.keys(schema.properties || {});

    // Cortafuegos contra parámetros parásitos (additionalProperties: false nativo en L0)
    for (const key of inputKeys) {
      if (!allowedKeys.includes(key)) {
        throw new Error(`SECURITY_BREACH_SCHEMA_VIOLATION: Parameter [${key}] is illegal for tool [${toolName}].`);
      }
    }

    // Verificar campos requeridos obligatorios
    for (const req of schema.required || []) {
      if (!inputKeys.includes(req)) {
        throw new Error(`VALIDATION_FAULT: Mandatory parameter [${req}] is missing.`);
      }
    }

    return true;
  }
}
