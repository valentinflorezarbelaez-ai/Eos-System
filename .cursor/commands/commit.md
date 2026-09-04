# /commit

LIDR Specboot — prepare a conventional commit on the **assigned feature branch**.

**Discipline:** ADR-0010. RDD / `/adversarial-review` does **not** authorize this step by itself.  
**Mission CLI is unchanged:** `node bin/eos.js` / `npm run eos:mission`.

## Do

1. One logical change. No secrets. No force-push. No commit to `main`.
2. Merge, tag, and deploy remain human / HITL / write-barrier (`R-BOUNDARY-01`).
3. Do not treat subagent consensus as authority.
