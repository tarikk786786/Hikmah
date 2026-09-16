# Memory Engine Provider Specifications

Hikmah integrates seven specialized memory providers behind the standardized `MemoryProvider` contract.

---

## 1. Provider Adapter Summary

### 1.1 Native Supabase (`NativeSupabaseMemoryProvider`)
- **Status**: `BUILT_IN`
- **Role**: Foundational storage and zero-dependency fallback.
- **Backend**: PostgreSQL 16 + pgvector cosine similarity index.
- **Guarantees**: Always operational, offline-first.

### 1.2 Mem0 (`Mem0Provider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: User personality, profile preferences, communication preferences.
- **Supported Classifications**: `PREFERENCE`, `USER`.
- **Configuration**: `MEM0_API_KEY` or self-hosted endpoint.

### 1.3 Graphiti (`GraphitiProvider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: Temporal memory, state transitions, validity windows (`validFrom`, `validTo`).
- **Supported Classifications**: `TEMPORAL`, `EVENT`, `RELATIONSHIP`.
- **Configuration**: `GRAPHITI_ENDPOINT`.

### 1.4 Letta (`LettaProvider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: Stateful agent execution, task checkpoints, MemFS memory blocks.
- **Supported Classifications**: `AGENT`, `WORKING`, `TASK`.
- **Strict Boundary**: Never stores raw hidden reasoning or scratchpad tokens.
- **Configuration**: `LETTA_ENDPOINT`.

### 1.5 Cognee (`CogneeProvider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: Knowledge graph, multi-source entity relationship fabric.
- **Supported Classifications**: `KNOWLEDGE`, `ENTITY`, `RELATIONSHIP`.
- **Configuration**: `COGNEE_ENDPOINT`.

### 1.6 LangMem (`LangMemProvider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: Procedural memory, user corrections, coding conventions, workflow patterns.
- **Supported Classifications**: `PROCEDURAL`.
- **Configuration**: `LANGMEM_ENDPOINT`.

### 1.7 Supermemory (`SupermemoryProvider`)
- **Status**: `OPTIONAL` / `CONFIGURED`
- **Role**: Large-scale document chunking, PDF knowledge, web page research corpus.
- **Supported Classifications**: `DOCUMENT`.
- **Configuration**: `SUPERMEMORY_API_KEY` or self-hosted endpoint.
