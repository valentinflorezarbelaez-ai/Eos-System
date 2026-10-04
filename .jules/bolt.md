## 2024-05-24 - Avoiding TOCTOU anti-patterns in file operations
**Learning:** Checking `fs.existsSync` before file reads/writes introduces Time-of-Check to Time-of-Use (TOCTOU) anti-patterns and requires two system calls.
**Action:** Replace `fs.existsSync()` checks preceding `fs.readFileSync()` with a try/catch block handling `ENOENT` to save an unnecessary stat call and prevent race conditions. Ensure the try/catch logic strictly preserves original error-handling semantics.
