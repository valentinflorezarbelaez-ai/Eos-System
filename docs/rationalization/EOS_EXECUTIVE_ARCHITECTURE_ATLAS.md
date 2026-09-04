# EOS Executive Architecture Atlas
## The 12 Canonical System Diagrams
**Document ID:** `EOS-ATLAS-001`

---

### Diagram 1: Canonical System Architecture
```mermaid
flowchart TD
    subgraph Presentation
        MCP[14-Tool Canonical MCP]
        CLI[bin/eos.js CLI]
    end
    subgraph Application
        BRG[McpMissionBridge]
        ORCH[EOSOrchestrator FSM]
    end
    subgraph Domain
        KERN[EOSKernel]
        INT[EOSIntentCompiler]
        SCAF[EOSScaffolderClean]
        FDIR[EOSFDIR]
    end
    subgraph Infrastructure
        TDD[EOSTDDExecutor]
        DISK[(File System & Ledger)]
    end
    MCP --> BRG
    CLI --> BRG
    BRG --> ORCH
    ORCH --> KERN
    ORCH --> INT
    ORCH --> SCAF
    ORCH --> FDIR
    SCAF --> TDD
    TDD --> DISK
    KERN --> DISK
```

---

### Diagram 2: Runtime Golden Path
```mermaid
flowchart LR
    D1[Boot] --> D2[Auth Check] --> D3[Context] --> D4[Barrier] --> D5[Intent] --> D6[Init FSM] --> D7[Scaffold] --> D8[TDD Loop] --> D9[Triad Balance] --> D10[Schema Check] --> D11[Drift Check] --> D12[Evidence] --> D13[Advance Gate] --> D14[Status]
```

---

### Diagram 3: State Ownership Topology
```mermaid
flowchart TD
    ORCH_STATE[EOSOrchestrator: FSM State]
    AUTH_STATE[AuthorityAdapter: Rank State]
    EVD_STATE[Disk: EVD-*.json Files]
    LED_STATE[EOSKernel: Ledger State]
    ORCH_STATE --> EVD_STATE
    ORCH_STATE --> LED_STATE
```

---

### Diagram 4: Authority Flow & Gateways
```mermaid
flowchart TD
    REQ[Tool Request] --> G1{EOS_MODE == read-only?}
    G1 -- Yes & Mutating --> BLK1[READ_ONLY_BLOCK]
    G1 -- No --> G2{Authority Rank >= Required?}
    G2 -- No --> BLK2[INSUFFICIENT_AUTONOMY]
    G2 -- Yes --> PASS[Execute Guarded Handler]
```

---

### Diagram 5: Four-Tier Tool Surface
```mermaid
pie title EOS Tool Surface Distribution
    "Canonical (14 Tools)" : 14
    "Specialist (28 Tools)" : 28
    "Lab & Simulation (27 Tools)" : 27
    "Legacy (1 Tool)" : 1
```

---

### Diagram 6: Core Dependency Topology
```mermaid
flowchart TD
    mcp_server --> mcp_mission_bridge
    mcp_server --> kernel
    mcp_server --> orchestrator
    orchestrator --> intent_compiler
    orchestrator --> scaffolder_clean
    scaffolder_clean --> tdd_executor
    kernel --> authority_adapter
```

---

### Diagram 7: Component Quality Classification
```mermaid
pie title Component Quality Distribution
    "Active Real" : 148
    "Active Experimental" : 24
    "Orphan / Test Only" : 34
```

---

### Diagram 8: Technical Debt Landscape
```mermaid
flowchart TD
    TD1[Monolithic mcp-server.js] --> FIX1[Modularize Handlers]
    TD2[Simulation Stubs in MCP] --> FIX2[Segregate to eos-lab]
    TD3[Dual Mission Creators] --> FIX3[Unify into EOSOrchestrator]
```

---

### Diagram 9: Security & Risk Heatmap
```mermaid
quadrantChart
    title Risk vs Impact Heatmap
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 High Priority
    quadrant-2 Monitor
    quadrant-3 Low Priority
    quadrant-4 Mitigate
    "Simulation False Assurance": [0.7, 0.9]
    "FDIR Killswitch Trip": [0.2, 0.85]
    "Prompt Token Bloat": [0.9, 0.75]
    "Evidence Spoofing": [0.4, 0.7]
    "Write Barrier Bypass": [0.3, 0.6]
```

---

### Diagram 10: Evidence Lifecycle
```mermaid
flowchart LR
    TEST[Node Test Runner] --> EXIT{Exit Code 0?}
    EXIT -- Yes --> RAW[Capture Stdout]
    RAW --> HASH[Calculate SHA-256]
    HASH --> FILE[Write EVD-XXXX.json]
    FILE --> GATE[Unlock FSM Advance Gate]
```

---

### Diagram 11: FDIR & Recovery Lifecycle
```mermaid
flowchart TD
    START[Operating System] --> DETECT{Drift Detected?}
    DETECT -- Yes --> TRIP[Trip Safe Mode]
    TRIP --> REC[Restore Baselines]
    REC --> VERIF{Checks 480 Pass?}
    VERIF -- Yes --> RESUME[Resume Nominal State]
```

---

### Diagram 12: Agent Operating Model
```mermaid
flowchart TD
    PROMPT[User Goal] --> AGENT[LLM Agent]
    AGENT --> TOOLS[14 Canonical MCP Tools]
    TOOLS --> GOV[evaluateToolGuard]
    GOV --> EXEC[Execution Engine]
    EXEC --> EVD[Evidence Store]
    EVD --> DONE[Verified Solution]
```
