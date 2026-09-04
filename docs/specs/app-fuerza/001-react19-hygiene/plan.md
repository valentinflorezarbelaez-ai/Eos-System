# [PLAN-FUERZA-001]: Architecture & Implementation Plan — React 19 Hook Hygiene

* **Target Spec:** `[SPEC-FUERZA-001]`
* **Target Project:** `PRJ-APP-FUERZA` (`C:\Users\valen\Documents\APP fuerza\atp-strength-frontend`)
* **Lead Architect:** Senior Architect / EOS Control Plane

---

## 1. Technical Strategy & ADR

### ADR-001: Lazy State Initialization over Synchronous Effects
* **Context:** React 19 compiler flags synchronous `setState` inside `useEffect` because it guarantees an immediate second render pass.
* **Decision:** Replace the hydration `useEffect` with lazy initializers in `useState`:
  ```typescript
  const [maxesMap, setMaxesMap] = useState<{ [key: string]: ExerciseMaxData }>(() => {
    if (typeof window === "undefined") return getBaselineMaxes();
    try {
      const saved = localStorage.getItem("neuro_strength_maxes");
      return saved ? { ...getBaselineMaxes(), ...JSON.parse(saved) } : getBaselineMaxes();
    } catch {
      return getBaselineMaxes();
    }
  });
  ```
* **Consequence:** Eliminates the cascading render entirely; initial render already contains the persisted user maxes.

### ADR-002: Async Effect Encapsulation with Abort / Mounted Flag
* **Context:** `fetchMaxes` and `fetchHistory` were invoked directly in effects, causing ESLint to see bare state setters.
* **Decision:** Wrap fetch calls in an active cancellation lifecycle pattern:
  ```typescript
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/strength/maxes");
        if (res.ok && active) {
          const data = await res.json();
          // transform and set
        }
      } catch (e) {
        if (active) console.warn("Backend offline, running local-first.");
      }
    };
    load();
    return () => { active = false; };
  }, []);
  ```

---

## 2. Component Target List
* `atp-strength-frontend/src/app/page.tsx`: Single target file for surgical refactor.

---

## 3. Verification Commands
```bash
npm --prefix "C:\Users\valen\Documents\APP fuerza\atp-strength-frontend" run lint
npm --prefix "C:\Users\valen\Documents\APP fuerza\atp-strength-frontend" run build
```
