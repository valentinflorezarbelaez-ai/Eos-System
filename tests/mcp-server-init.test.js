import test from 'node:test';
import assert from 'node:assert/strict';
import { EosMcpServer } from '../src/mcp-server.js';
import { EOSKnowledgeOntology } from '../src/core/knowledge-ontology.js';
import { resolveControlPlaneRoot } from '../src/core/runtime/control-plane-root.js';

test('EosMcpServer Initialization: proceeds without crashing if knowledgeOntology throws an error', () => {
  const root = resolveControlPlaneRoot();

  const mockOntology = {
    registrarNodo: () => {
      throw new Error('Simulated Ontology Error during Node Registration');
    },
    crearEnlace: () => {
      throw new Error('Simulated Ontology Error during Link Creation');
    },
    nodos: new Map() // Required by EOSScaffolderClean
  };

  // Provide mockOntology in options. It shouldn't crash.
  assert.doesNotThrow(() => {
    new EosMcpServer(null, {
      baseDir: root,
      knowledgeOntology: mockOntology
    });
  }, 'Constructor should catch errors from ontology registration and proceed.');
});

test('EosMcpServer Initialization: correctly calls knowledgeOntology registrar methods when no error is thrown', () => {
  const root = resolveControlPlaneRoot();

  const calls = {
    registrarNodo: [],
    crearEnlace: []
  };

  const mockOntology = {
    registrarNodo: (nombre, tipo, props) => {
      calls.registrarNodo.push({ nombre, tipo, props });
    },
    crearEnlace: (origen, destino, tipo) => {
      calls.crearEnlace.push({ origen, destino, tipo });
    },
    nodos: new Map() // Required by EOSScaffolderClean
  };

  const server = new EosMcpServer(null, {
    baseDir: root,
    knowledgeOntology: mockOntology
  });

  // EOSScaffolderClean also calls registrarNodo
  assert.ok(calls.registrarNodo.length >= 3, 'Should register at least 3 nodes');
  assert.deepEqual(calls.registrarNodo[0], { nombre: 'AGENTS-CONSTITUTION', tipo: 'GOVERNANCE', props: { version: '1.0' } });
  assert.deepEqual(calls.registrarNodo[1], { nombre: 'CORE-KERNEL', tipo: 'ARCHITECTURE', props: { layer: 'CORE' } });
  assert.deepEqual(calls.registrarNodo[2], { nombre: 'EOS-SENTINEL', tipo: 'ARCHITECTURE', props: { layer: 'DAEMON' } });

  assert.equal(calls.crearEnlace.length, 1, 'Should create 1 link');
  assert.deepEqual(calls.crearEnlace[0], { origen: 'CORE-KERNEL', destino: 'AGENTS-CONSTITUTION', tipo: 'GOVERNED_BY' });

  // Also assert that server.knowledgeOntology is correctly assigned
  assert.equal(server.knowledgeOntology, mockOntology);
});
