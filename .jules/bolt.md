## 2026-09-19 - Cached Global Knowledge
**Learning:** Running test suites modifies evidence and reports. Using `fs.readFileSync` for static file config causes extreme overhead in long-running CI tasks.
**Action:** Use a basic memory-map to cache static global knowledge files across loop executions.
