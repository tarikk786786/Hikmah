# Memory Deployment Topology

Hikmah's memory engine adheres to the free-first deployment rule:

```
[Vercel Serverless Control Plane]
 • Next.js App Router (/api/memory/*)
 • Memory Router orchestrator
 • Secret scanner & Prompt guard
 • In-memory fast routing
          │
          ▼
[Supabase (Database & pgvector)]
 • PostgreSQL 16
 • memory_registry, memory_provider_refs, memory_provider_health
 • NativeSupabaseMemoryProvider
          │
          ▼
[Docker / Render Background Worker]
 • Deep entity extraction (Cognee)
 • Graphiti temporal graph builds
 • Large document chunking (Supermemory)
 • Periodic memory consolidation & cleanup
```
