# Spec — Defensive intelligence finding

## Record

Given a value that is not a plain object, or a plain object with a property outside `source`, `observedOn`, `confidence`, `humanGate`, `repo`, and `impact`  
When `recordIntelligenceFinding` is called  
Then `ok` is false  
And `code` is `UNTRUSTED_INPUT`  
And the result has no `finding` property.

Given a plain object whose `humanGate` is missing or is not `REQUIRED`  
When `recordIntelligenceFinding` is called  
Then `ok` is false  
And `code` is `HUMAN_GATE_REQUIRED`  
And the result has no `finding` property.

Given a plain object whose `source`, `observedOn`, `confidence`, `repo`, or `impact` fails the design constraints, including a multiline `impact`  
When `recordIntelligenceFinding` is called  
Then `ok` is false  
And `code` is `SCHEMA_VIOLATION`.

Given any allowed string that contains a private-key block or an assignment of `api_key`, `password`, `secret`, or `token`  
When `recordIntelligenceFinding` is called  
Then `ok` is false  
And `code` is `SECRET_HANDLING`  
And the secret text is not present on the result.

Given `source` is an `https` URL, `observedOn` is `YYYY-MM-DD`, `confidence` is `LOW`, `MEDIUM`, or `HIGH`, and `humanGate` is `REQUIRED`  
When `recordIntelligenceFinding` is called  
Then `ok` is true  
And `finding` echoes only those fields plus an optional single-line `repo` and `impact`.

## Doctor CLI boundary

Given the kernel doctor module  
When its source is read  
Then it does not contain `SECRET_HANDLING` or `UNTRUSTED_INPUT`  
And this change does not modify that file.

Given `node bin/eos-doctor.js --help`  
When the process exits  
Then the exit code is 0  
And stdout contains `SECRET_HANDLING`, `UNTRUSTED_INPUT`, `HUMAN_GATE`, and a non-claim that EOS did not surpass a lab.

Given `node bin/eos-doctor.js --json --help`  
When the process exits  
Then stdout is the kernel help text only  
And stdout does not contain `SECRET_HANDLING`.

The module does not clone a repository and does not contain exploit steps.
