# Memory Architecture & Knowledge Fabric

The **Knowledge Fabric** unifies multiple memory representations into a coherent cognitive model.

---

## 1. Multi-Tier Memory Layout

```
 Tier 1: Working Memory (RAM & Buffers)
  • Recent conversation turns
  • In-flight agent task scratchpad
 
 Tier 2: Stateful Agent Context (Letta / MemFS)
  • Agent identity and task checkpoints
  • Validated tool outputs

 Tier 3: User & Procedural Memory (Mem0 & LangMem)
  • User preferences and style guidelines
  • Learned workflows and past corrections

 Tier 4: Temporal & Graph Knowledge (Graphiti & Cognee)
  • Historical evolution and validity timelines
  • Cross-entity dependency graphs

 Tier 5: Document & Research Corpus (Supermemory)
  • Large PDFs, papers, web caches

 Tier 6: Canonical Registry & Fallback (Supabase pgvector)
  • Permanent authoritative audit records
  • Normalized vector embeddings
```

---

## 2. Canonical Registry & Synchronization

To avoid data divergence, Hikmah maintains a **Canonical Memory Registry** (`memory_registry` table):
- Every memory stored by any provider is assigned a canonical ID and content SHA-256 hash.
- Mappings in `memory_provider_refs` record where each logical memory is mirrored.
- Deletions propagate to all linked provider references atomically.
