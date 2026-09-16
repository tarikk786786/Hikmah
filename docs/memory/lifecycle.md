# Memory Lifecycle Specification

Every memory record in Hikmah progresses through a deterministic 13-stage lifecycle:

```
 1. CAPTURE       User message or agent output received
 2. CLASSIFY      MemoryClassifier determines semantic class (PREFERENCE, TEMPORAL, etc.)
 3. SCAN          SecretScanner scans and redacts credentials
 4. POLICY        Scope verification and project boundary checks
 5. ROUTE         MemoryRouter selects optimal specialized provider
 6. STORE         Persisted in provider storage
 7. REGISTER      Logged in memory_registry and memory_provider_refs
 8. INDEX         Semantic embeddings & keyword index created
 9. RETRIEVE      Query intent classified, dispatched, merged, and reranked
10. FRAME         PromptGuard packages records into untrusted context
11. CONSOLIDATE   Episodic memories summarized into durable facts
12. ARCHIVE       Stale memories tagged with validity expiration
13. FORGET        Permanent atomic deletion across registry and all provider backends
```
