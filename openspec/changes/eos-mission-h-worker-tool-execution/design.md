# Design — Mission H

Tool dispatch runs after MCP enforce gate and before applyDiff. Failures never leave applied diffs (rollback if needed). Custody hashes canonical tool output records without mutating src/core.
