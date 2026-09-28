## 2024-09-28 - TOCTOU Anti-pattern in fs operations
**Learning:** Checking `fs.existsSync` before `fs.readFileSync` (Time-of-Check to Time-of-Use) introduces unnecessary blocking overhead and is measurably slower (~10%).
**Action:** Rely on `try/catch` with `ENOENT` handling for file reads instead of pre-checking existence.
