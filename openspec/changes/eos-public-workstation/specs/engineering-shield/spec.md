# Spec — Engineering shield (non-kernel)

## Atomic state

Given a path that does not exist  
When `readJsonState` is called  
Then the result is `{ ok: true, state: null, reason: 'ENOENT' }`  
And the implementation does not call `fs.existsSync` before the read.

Given a JSON value and a path whose parent directory exists or can be created  
When `writeJsonState` is called and `readJsonState` is called again  
Then the stored value equals the written value  
And the write uses a temporary file plus `renameSync`  
And the implementation does not call `fileHandle.lock`.

Given invalid JSON on disk  
When `readJsonState` is called  
Then `ok` is false  
And `state` is null.

## Payload gate

Given a payload that is not a plain object, misses a required property, has the wrong primitive type, or includes a property outside the schema  
When `acceptContractPayload` is called  
Then `ok` is false  
And `code` is `SCHEMA_VIOLATION`  
And the result has no `contract` property.

Given a payload that matches the schema  
When `acceptContractPayload` is called  
Then `ok` is true  
And `contract` is the payload.

Given an MCP-shaped message with an empty method, a missing method, or invalid `params`  
When `acceptMcpToolPayload` is called  
Then the result is `SCHEMA_VIOLATION`  
And no tool is dispatched.

When `additionalProperties` is omitted on the schema  
Then unknown properties are rejected.

## Kernel scaffold

EosMemory (`src/core/memory.js`) and `EOSMCPSchemaValidator` (`src/core/runtime/mcp-schema-validator.js`) are the kernel homes for persistence and the MCP catalog. This slice does not change them and does not import `src/shield` from them.

A later human authorization that names those files would be required before the shield replaces their IO or their catalog checks. Until then the scaffold test only proves the files do not import the shield.
