Title: 🧪 Add tests for AuditVerifierHandler

Description:
🎯 **What:** The `AuditVerifierHandler` class (used for MCP quality/audit verification handling) lacked test coverage, creating a testing gap.
📊 **Coverage:** Wrote comprehensive unit tests using the `node:test` framework for:
  - constructor setup (default and custom options)
  - `runVerifier` object return structure
  - `compileContext` for mission context (validating metadata and timestamp)
  - `compileContext` for surgical context (validating invocation of `EOSContextCompiler`)
  - `runParallelAudits` (mocking temporary paths and validating DAG results structure)
  - Also updated `tests/test-runner.test.js` files.length upper limit to 146 to accommodate the new test file.
✨ **Result:** Enhanced test coverage, making refactoring and evolution of the verifier logic safer. Tests are robust and deterministically passing.
