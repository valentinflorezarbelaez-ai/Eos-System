## 2024-05-15 - TOCTOU (Time-of-Check to Time-of-Use) in File Operations
**Learning:** Avoid `fs.existsSync` followed by `fs.readFileSync` because it creates a TOCTOU race condition and involves two syscalls, making it slower than just trying to read the file and handling `ENOENT`.
**Action:** Replace instances of `if (fs.existsSync(path)) { fs.readFileSync(path) }` with a `try { fs.readFileSync(path) } catch (err) { if (err.code === "ENOENT") { ... } }` pattern.
