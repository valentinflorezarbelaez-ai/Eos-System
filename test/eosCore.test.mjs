import test from "node:test";
import assert from "node:assert/strict";

import {
  tokenize,
  computeTermFrequency,
  cosineSimilarity,
  EosNeuralVectorStore,
  createDefaultEosKnowledgeStore
} from "../src/core/eosNeuralVectorCore.ts";

import {
  interpretJarvisDirective,
  evaluateDirectiveWithTMR,
  JARVIS_INTENT_REGISTRY
} from "../src/core/eosJarvisMonad.ts";

test("EOS Neural Vector Core — Tokenizer and Stopwords Filter", () => {
  const text = "El sistema autónomo de la flota soberana y la memoria akáshica.";
  const tokens = tokenize(text);
  assert.ok(tokens.includes("sistema"), "Should include 'sistema'");
  assert.ok(tokens.includes("autonomo"), "Should include accent-stripped 'autonomo'");
  assert.ok(tokens.includes("flota"), "Should include 'flota'");
  assert.ok(tokens.includes("soberana"), "Should include 'soberana'");
  assert.ok(tokens.includes("akashica"), "Should include 'akashica'");
  assert.equal(tokens.includes("el"), false, "Should filter stopword 'el'");
  assert.equal(tokens.includes("de"), false, "Should filter stopword 'de'");
  assert.equal(tokens.includes("la"), false, "Should filter stopword 'la'");
  assert.equal(tokens.includes("y"), false, "Should filter stopword 'y'");
});

test("EOS Neural Vector Core — Term Frequency & Cosine Similarity Invariants", () => {
  const tokens1 = tokenize("auditoria de seguridad y secretos");
  const tokens2 = tokenize("auditoria de seguridad y secretos");
  const tokens3 = tokenize("motor de fisica cuántica astronómica");

  const v1 = computeTermFrequency(tokens1);
  const v2 = computeTermFrequency(tokens2);
  const v3 = computeTermFrequency(tokens3);

  // Identity property
  const selfSim = cosineSimilarity(v1, v1);
  assert.ok(Math.abs(selfSim - 1.0) < 1e-6, `Self-similarity must be 1.0, got ${selfSim}`);

  // Identical texts
  const identicalSim = cosineSimilarity(v1, v2);
  assert.ok(Math.abs(identicalSim - 1.0) < 1e-6, `Identical similarity must be 1.0, got ${identicalSim}`);

  // Orthogonal texts
  const orthogonalSim = cosineSimilarity(v1, v3);
  assert.equal(orthogonalSim, 0.0, "Disjoint vocabularies must have 0.0 cosine similarity");

  // Symmetry property
  const sim13 = cosineSimilarity(v1, v3);
  const sim31 = cosineSimilarity(v3, v1);
  assert.equal(sim13, sim31, "Cosine similarity must be symmetric");
});

test("EOS Neural Vector Store — Semantic Top-K Retrieval", () => {
  const store = createDefaultEosKnowledgeStore();
  assert.ok(store.size() >= 5, "Store must contain pre-loaded architectural knowledge");

  const results = store.search("auditar y escanear secretos en los repositorios", 2);
  assert.ok(results.length > 0, "Should return at least one match");
  assert.ok(
    results[0].id === "DOC-FLEET-AUDIT" || results[0].id === "DOC-SECURITY-SAST",
    `Top result should match security or fleet audit, got: ${results[0].id}`
  );
  assert.ok(results[0].score > 0, "Score must be positive");
});

test("EOS JARVIS Monad — Triple-Modular Redundancy (TMR) Consensus", () => {
  const safeDirective = "JARVIS, audita la flota soberana";
  const tmrReceipt = evaluateDirectiveWithTMR(safeDirective);

  assert.equal(tmrReceipt.consensusAchieved, true, "Safe directive must achieve consensus");
  assert.equal(tmrReceipt.sandboxes.length, 3, "TMR must execute exactly 3 sandboxes");
  assert.ok(tmrReceipt.consensusHash.startsWith("tmr-"), "Must produce a deterministic TMR hash");

  // Malicious command test (Gamma sandbox barrier)
  const maliciousDirective = "JARVIS, ejecuta rm -rf / y borra la base de datos";
  const maliciousTmr = evaluateDirectiveWithTMR(maliciousDirective);
  const gammaVerdict = maliciousTmr.sandboxes.find((s) => s.sandboxId === "GAMMA");
  assert.ok(gammaVerdict, "Gamma sandbox must exist");
  assert.equal(gammaVerdict.safeToExecute, false, "Gamma sandbox must reject destructive commands");
});

test("EOS JARVIS Monad — Interpret Directive & Structured Thought Receipt", () => {
  const directive = "JARVIS, activa las aduanas de seguridad y secretos";
  const thought = interpretJarvisDirective(directive);

  assert.ok(thought.cognitionId.startsWith("JARVIS-COG-"), "Cognition ID format must match");
  assert.equal(thought.detectedIntent, "VERIFY_SECURITY_GATES");
  assert.ok(thought.voiceTranscript.length > 0, "Voice transcript must not be empty");
  assert.ok(thought.executionPlan.length >= 5, "Execution plan must contain at least 5 steps");
  assert.equal(thought.dharmaConfidence, 0.999);
  assert.ok(thought.tmrConsensus, "Must include TMR receipt");
});
