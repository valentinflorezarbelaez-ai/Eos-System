# Design — Mission AN: Multi-Workstation Session Federation Port

## Architecture

Injectable federation port over AI+W-style session custody:

```
Workstation A                          Workstation B
┌─────────────────────┐                ┌─────────────────────┐
│ sessionStore (AI)   │                │ sessionStore (AI)   │
│ federation port     │──envelope────▶ │ federation port     │
│ peerTransport fake  │◀──SYNC_ACK──── │ peerTransport fake  │
└─────────────────────┘                └─────────────────────┘
```

### Envelope

```
{
  envelopeId, fromWorkstation, sessionId, tipPin?,
  custodyDigest, payload, digest, sealedAt,
  kind: eos-federation-custody-envelope,
  PRODUCTION_READY: 'NO'
}
```

### Fail-closed sync

1. Verify ALL envelopes (digest + Fundacion + custody heads).
2. If ANY denial → `PARTIAL_APPLY_FORBIDDEN`, apply **zero**.
3. Else apply ALL atomically (from caller POV).
4. No silent merge of divergent custody heads.

### Injectables

| Dep | Role |
| --- | --- |
| `workstationId` | Local workstation identity |
| `sessionStore` | `{ load, save, list? }` AI-like stubs |
| `hash` / `now` | Deterministic digests / timestamps |
| `ledgerAppend?` | Optional EVD receipt sink |
| `peerTransport?` | In-memory fake for CI (no real LAN) |

## NON-CLAIM

- Operator federation ≠ cloud agent fleet
- Multi-workstation sync ≠ multi-tenant SaaS
- Federation port ≠ CloudAgent
- Federation ≠ PRODUCTION_READY
- Not AO/AP/AQ/AR
- Fundacion Δ=0; Antigravity-first; Law VI held
