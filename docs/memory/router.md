# Multi-Engine Memory Router Specification

The **Hikmah Memory Router** serves as the central control plane for all memory operations across the assistant. Rather than maintaining eight separate, uncoordinated memory systems, the router provides a single unified memory contract while dispatching writes and reads to specialized backends based on content semantics and operational requirements.

---

## 1. Core Responsibilities

```
                         HIKMAH ASSISTANT / AGENT
                                    │
                            Unified Memory API
                      (remember, recall, search...)
                                    │
                             MEMORY ROUTER
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
  1. SECRET SCANNER         2. CLASSIFIER              3. PROMPT GUARD
  (Blocks credentials)     (Determines target)        (Frames untrusted data)
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                           PROVIDER DISPATCH
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
      Mem0                      Graphiti                      Letta
(User Preferences)        (Temporal / Evolution)        (Stateful Agent)
        │                           │                           │
        ▼                           ▼                           ▼
     Cognee                      LangMem                     Supermemory
 (Knowledge Graph)             (Procedural)               (Large Documents)
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                 FALLBACK
                                    ▼
                         Native Supabase + pgvector
```

---

## 2. Dispatch Matrix

The Memory Router maps content classifications and query intents to specialized backends:

| Classification | Query Intent | Primary Provider | Specialized Role |
|---|---|---|---|
| `PREFERENCE`, `USER` | `PREFERENCE` | `mem0` | User instructions, stable preferences, personality traits. |
| `TEMPORAL`, `EVENT` | `TIMELINE`, `HISTORY` | `graphiti` | Architecture evolution, historical facts with validity windows. |
| `AGENT`, `WORKING`, `TASK` | `AGENT` | `letta` | Stateful agent checkpoints, working memory, MemFS blocks. |
| `KNOWLEDGE`, `ENTITY`, `RELATIONSHIP` | `RELATIONSHIP` | `cognee` | Multi-source knowledge graphs and entity connections. |
| `PROCEDURAL` | `PROCEDURE` | `langmem` | User corrections, coding guidelines, task execution rules. |
| `DOCUMENT` | `DOCUMENT` | `supermemory` | Large-scale research documents, PDFs, web page caches. |
| `PROJECT`, `EPISODIC`, Fallback | `PROJECT`, `SEMANTIC` | `native-supabase` | Project facts, core embeddings, guaranteed fallback. |

---

## 3. Graceful Degradation & Fallback

If an external engine fails, throws an error, or is disabled:
1. The error is logged to `memory_provider_health` telemetry.
2. The router automatically cascades the write or read operation to **Native Supabase**.
3. Conversation execution continues without interruption.
