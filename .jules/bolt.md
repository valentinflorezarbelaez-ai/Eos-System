## 2025-02-23 - Async File Read TOCTOU Pattern
**Learning:** Avoid using `fs.existsSync` to test if a file is present before reading it as it creates a TOCTOU (Time-Of-Check to Time-Of-Use) pattern and incurs a measurable performance overhead due to blocking the event loop.
**Action:** Use a `try/catch` block catching `ENOENT` natively during the async read instead.
