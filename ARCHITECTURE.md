# J.A.R.V.I.S. — System Architecture Specification
## Phase 1: AI Assistant Foundation

### 1. High-Level System Architecture

JARVIS is engineered as a modular AI Operating System rather than a monolithic chatbot. Every capability (models, memories, tools, skills, agents, workflows, browser, voice) plugs into standardized contracts.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  Next.js 15 App Router • Responsive JARVIS Cockpit HUD • Dark Cyber   │
│  14 Dedicated Views: /dashboard, /chat, /voice, /memory, /tools...    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE Streaming
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       CONTROL PLANE (Vercel Serverless)                │
│  API Gateway (/api/chat, /api/memory, /api/tools, /api/jobs)           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ JarvisCore Orchestrator                                          │  │
│  │ ├── SafetyClassifier (Sanitization, Risk Evaluation, Kill Switch)│  │
│  │ ├── MemoryStore (Multi-Factor Retrieval Ranker)                  │  │
│  │ ├── TaskPlanner (Goal Decomposition & Plan Steps)                │  │
│  │ ├── ToolRegistry (Dynamic Discovery, Timeouts, Audit Logging)    │  │
│  │ └── ModelRouter (Fast / Reasoning / Coding / Local Ollama)       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       SUPABASE (Source of Truth)     │  │   REDIS / UPSTASH QUEUE      │
│  • PostgreSQL 16 Tables              │  │   • BullMQ-Compatible Tasks  │
│  • pgvector Cosine Similarity Index  │  │   • Priority Enqueueing      │
│  • Auth, RLS Policies, Audit Logs    │  │   • In-Memory Dev Fallback   │
└──────────────────────────────────────┘  └──────────────┬───────────────┘
                                                         │ Pop Tasks
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │   RENDER WORKER (Docker)     │
                                          │   • Long-Running Agent Tasks │
                                          │   • Deep Research Synthesis  │
                                          │   • Playwright Browser Driver│
                                          │   • Sandbox Code Execution   │
                                          └──────────────────────────────┘
```

---

### 2. Core Cognition & Execution Lifecycle

For every operator request, JARVIS executes an immutable 11-step cognitive loop:
1. **Authentication Context**: Identify user ID and project workspace scope.
2. **Correlation Tracing**: Generate unique `request_id`, `conversation_id`, and log to structured audit stream.
3. **Safety & Kill Switch Evaluation**: Verify global kill-switch is disengaged; sanitize input string.
4. **Memory Retrieval**: Query `MemoryStore`. Multi-factor ranker balances cosine similarity, recency decay, importance score, and project match.
5. **Goal Decomposition**: `TaskPlanner` breaks the request into structured executable steps.
6. **Tool Selection**: Identify required tools from `ToolRegistry` and determine declared risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
7. **Approval Gating**: If tool risk exceeds maximum auto-approval threshold, create an `ApprovalRequest` ticket and halt execution pending operator sign-off.
8. **Context Assembly**: `ContextBuilder` formats retrieved memories, recent conversation buffer, and tool schemas into bounded tokens.
9. **Model Router Dispatch**: `ModelRouter` delegates to the optimal provider (`Fast`, `Reasoning`, `Coding`, or `Local Ollama`) with automatic fallback cascading.
10. **Memory Extraction**: Extract new facts, preferences, or tasks and persist them into Supabase `memories`.
11. **Streaming Delivery**: Stream synthesized response back to the operator HUD.

---

### 3. Asynchronous Worker Separation

To comply with free-first and serverless architecture rules:
- **Never run persistent Chromium or long loops inside Vercel serverless functions** (subject to 10s-60s timeouts).
- Heavy tasks (`research_task`, `browser_task`, `coding_task`) are enqueued as durable `JobTask` records in Redis.
- Background workers running in Docker containers on Render pop jobs, maintain checkpointed state in Supabase, and survive restarts idempotently.

---

### 4. Cellular & Geolocation Intelligence Subsystem (PRD 07)

The Geointelligence subsystem is designed as a privacy-preserving public RF aggregator and authorized device telemetry processor:

```
[Public RF Infrastructure]           [Authorized Devices (Opt-In)]
 - OpenCelliD Towers & BBoxes          - NeoStumbler / Hikmah Mobile
 - OpenStreetMap / Nominatim           - Salted SHA-256 Hashes
          │                                     │
          ▼                                     ▼
┌───────────────────┐                 ┌───────────────────┐
│OpenCellIdProvider │                 │Ingestion Pipeline │
│ (1,000 req/day)   │                 │ (1m Dedup Windows)│
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          └─────────────────┬───────────────────┘
                            ▼
                 ┌────────────────────┐
                 │ Geolocation Engine │
                 │  (Multi-Source RF  │
                 │   Triangulation)   │
                 └──────────┬─────────┘
                            │
                            ▼
                 ┌────────────────────┐
                 │   hikmah-geointel  │
                 │     MCP Server     │
                 │ (13 Tools + Audit) │
                 └────────────────────┘
```

- **Strict Privacy**: Zero raw IMEIs/IMSIs/MACs stored. Ingestion rejected without explicit `GRANTED` consent.
- **Quota Enforced**: Upstream OpenCelliD calls tracked against 1,000 req/day limit with normalized L2 caching.
- **Multi-Source Ensemble**: Combines GPS ground truth, OpenCelliD reference towers, and signal-weighted RF triangulation.

---

### 5. Multi-Engine Memory Router & Knowledge Fabric (PRD 08A)

Hikmah avoids running redundant memory databases by implementing a unified **Memory Router**:

```
                         HIKMAH ASSISTANT / AGENTS
                                    │
                            Unified Memory API
                                    │
                              MEMORY ROUTER
        (Secret Scanner • Memory Classifier • Prompt Guard • Merger)
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
USER PREFERENCES              TEMPORAL GRAPH                 STATEFUL AGENT
 • Mem0Adapter                 • GraphitiAdapter              • LettaAdapter
    │                               │                               │
    ├───────────────────────────────┼───────────────────────────────┤
    │                               │                               │
KNOWLEDGE GRAPH               PROCEDURAL RULES               LARGE RESEARCH
 • CogneeAdapter               • LangMemAdapter               • SupermemoryAdapter
    │                               │                               │
    └───────────────────────────────┴───────────────────────────────┘
                                    │
                         NATIVE SUPABASE FALLBACK
                        (PostgreSQL 16 + pgvector)
```

- **Unified Memory Contract**: `remember`, `recall`, `search`, `timeline`, `related`, `learn`, `consolidate`, `explain`.
- **Zero-Trust Secret Scanner**: Blocks and redacts API keys, private keys, database URLs, and passwords before storage.
- **Prompt Injection Defense**: Frames all retrieved memories in untrusted XML wrappers (`<context_memories>`).
- **Authority-Aware Merger**: Resolves conflicts with strict authority ordering (`USER_EXPLICIT` > `SYSTEM_DATA` > `TOOL_RESULT` > `PROJECT_SOURCE` > `DOCUMENT` > `WEB` > `MODEL_INFERENCE`).
- **Guaranteed Fallback**: If an external engine is unavailable, the router automatically falls back to `native-supabase`.

---

### 6. Universal Storage Subsystem (PRD 10)

Hikmah abstracts heterogeneous storage providers into a unified `StorageEngine`:

```
                    HIKMAH ASSISTANT / AGENTS / MCP / REST API
                                       │
                              StorageEngine Contract
                                       │
                             STORAGE ORCHESTRATOR
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
        SHA-256 Deduplication     KeyManager &         Chunker & Stream
        & Reference Counter       AES-256-GCM           Reassembler
                │                      │                      │
                └──────────────────────┼──────────────────────┘
                                       │
                                STORAGE ROUTER
                      (Tier Resolution & Provider Health)
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
    HOT TIER                      NORMAL TIER                     COLD TIER
  (RAM Cache)              (Supabase Storage & Local)      (Telegram TG-S3 / S3)
        │                              │                              │
        └──────────────────────────────┴──────────────────────────────┘
                                       │
                         POSTGRESQL CANONICAL REGISTRY
               (storage_objects, storage_chunks, storage_shares)
```

- **Telegram TG-S3 Cold Archive**: Telegram Bot API and MTProto chunked storage completely encapsulated behind `TelegramStorageProvider` with zero credential or chat ID leakage to the LLM or frontend.
- **AES-256-GCM Envelope Encryption**: Sensitive objects encrypted with random per-object DEKs and managed locally by `KeyManager`.
- **Large Object Chunker & Streaming Reassembler**: Splits files >10MB into verified parts with per-chunk SHA-256 validation.
- **Automated Backup & Disaster Recovery**: Generates signed snapshot manifests across database schemas and memory fabrics.

---

### 11. Universal Web Research & Deep Research Engine (PRD 11)

Hikmah orchestrates an autonomous 11-stage research and claim verification pipeline with strict anti-hallucination guarantees:

```
                            HIKMAH ASSISTANT / OPERATOR
                                         │
                               ResearchOrchestrator
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
    QueryPlanner                  SearchRouter                    DiscoveryEngine
  (Intent Decomposition)    (SearXNG, Academic, GitHub)        (Domain Traversal)
          │                              │                              │
          └──────────────────────────────┼──────────────────────────────┘
                                         │
                                    FetchRouter
                         (SSRF Guard, Trafilatura Extract)
                                         │
                                 VerificationEngine
                       (Authority 1-10, Wire-Service Clusters)
                                         │
                                   CitationEngine
                      (Anti-Hallucination & Provenance Graph)
                                         │
          ┌──────────────────────────────┼──────────────────────────────┐
          ▼                              ▼                              ▼
  Synthesized Report             Timeline & Entities             MonitorEngine
(Markdown & Citations)        (Lineage & Named Nodes)         (Diffs: NEW/CHANGED)
```

- **Strict Anti-Hallucination Grounding**: No supporting source $\implies$ cannot be presented as verified fact.
- **Syndicated Wire-Service Defense**: Opening text fingerprinting clusters identical syndicated news to prevent false consensus.
- **SSRF Defense**: Strict kernel-level IP blocklists preventing access to private subnets, cloud metadata (`169.254.169.254`), and loopback interfaces.

---

### 12. Browser Intelligence Engine (PRD 12)

Hikmah establishes a layered, self-healing browser automation system decoupling deterministic driver execution from AI semantic intent:

```
                            Hikmah Agent / Web UI / MCP Tools
                                            │
                                  BrowserOrchestrator
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          ▼                                 ▼                                 ▼
   SessionManager                  BrowserSecurityGuard               StagehandProvider
(Profiles, Cookies,             (SSRF Filter, Protocols,             (Semantic act, extract,
  Storage, Proxy)                  Download Quarantine)                      observe)
          │                                 │                                 │
          └─────────────────────────────────┼─────────────────────────────────┘
                                            ▼
                                  PlaywrightBrowserDriver
                                (Chromium / Firefox / WebKit /
                                  Virtual DOM Fallback)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
      DOM & A11y Tree                                             Visual Viewport
   (InteractiveElements)                                        (Screenshot Buffers)
               │                                                         │
               └────────────────────────────┬────────────────────────────┘
                                            ▼
                                    SelfHealingEngine
                               (Fuzzy Attribute / A11y /
                                Semantic Text Fallback)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
       Universal Storage                                           Memory Router
    (Screenshots & Traces)                                      (Extracted Facts)
```

- **Playwright Execution Driver**: Deterministic automation with navigation, clicks, keystrokes, form fills, dropdown selection, viewport scrolling, and screenshots. High-fidelity virtual DOM fallback ensures execution reliability in lean environments.
- **Stagehand Semantic Actions**: Natural language `act` intent translation, typed schema `extract`, and dynamic affordance `observe`.
- **Self-Healing Selector Engine**: Multi-strategy fallback resolving broken selectors via accessibility roles/names, text content semantics, and attribute heuristics.
- **Autonomous BrowserUseAgent**: Multi-step goal decomposition and execution loops with self-correction.
- **Session & Profile Isolation**: Cookie jars, persistent storage states, proxy routing, and anti-fingerprinting configurations.


