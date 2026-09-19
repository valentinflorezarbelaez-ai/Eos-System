# Per-Port Artifact Manifest Template (Game-Day F)

**Drill:** Fundacion Δ=0 / CL–CP  
**Policy:** FUNDACION_ALWAYS_DENY — fill by **reading** host artifacts only; never write Fundacion.

Copy one block per port. Digests must be independently verified by the observer.

---

## Port: __CL / CM / CN / CO / CP__

| Field | Value |
| --- | --- |
| Port id | CL \| CM \| CN \| CO \| CP |
| SPEC | SPEC-009x |
| Expected status | MEASURED \| CLOSED_FOR_LOCAL_GOVERNED_USE |
| Observed status | _(fill)_ |
| Freeze / revision | e.g. `47cf1a79` |
| Dirty? | yes / **no** |
| Pending? | yes / **no** |
| Independent check | yes / no (required for Δ=0 record) |
| Observer | |
| Timestamp (America/Bogota) | |

### Expected artifacts

| id | digest | status | notes |
| --- | --- | --- | --- |
| | | | |

### Observed artifacts

| id | digest | status | notes |
| --- | --- | --- | --- |
| | | | |

### Reconciliation

- [ ] Digests match
- [ ] Status match
- [ ] No Fundacion write attempted
- [ ] fundacionDelta observed = 0
- [ ] Independent check signed

**Δ=0 recordable?** yes / **no** — reason:

---

## Machine-readable sketch (optional JSON)

```json
{
  "port": "CL",
  "status": "MEASURED",
  "fundacionDelta": 0,
  "FUNDACION_ALWAYS_DENY": true,
  "independentCheck": false,
  "artifacts": [
    { "id": "cl-receipt-manifest", "digest": "<sha256>", "status": "MEASURED", "revision": "47cf1a79" }
  ]
}
```
