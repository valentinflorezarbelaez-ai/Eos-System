## 2024-09-24 - TOCTOU Anti-pattern in File Reads
**Learning:** Checking `fs.existsSync` before `fs.readFileSync` is a Time-of-Check to Time-of-Use (TOCTOU) anti-pattern and incurs a performance penalty (two I/O operations instead of one).
**Action:** Use a `try/catch` block around the file operation (catching `ENOENT`) when reading files instead of preemptively checking `fs.existsSync`.
