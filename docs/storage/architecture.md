# Storage Architecture & Tiering (PRD 10)

## System Architecture

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

## Storage Tiers

| Tier | Primary Medium | Latency Target | Use Cases | Retention Policy |
| :--- | :--- | :--- | :--- | :--- |
| `HOT` | RAM / Redis Cache | < 5ms | Active working buffers, short-lived temp files | 10m TTL LRU |
| `NORMAL` | Supabase Storage / Local Disk | < 50ms | Documents, code artifacts, agent outputs | Permanent active |
| `COLD` | Telegram TG-S3 / MTProto / S3 | 50ms - 500ms | Large media, archives, bulk datasets | Infinite archive |
| `ARCHIVE` | Encrypted Backup Blobs | Batch / Async | System disaster recovery, DB dumps | Versioned snapshots |

## Deduplication Strategy
1. Before any physical upload, the orchestrator computes the SHA-256 hash of the plain payload.
2. If an active record with the identical SHA-256 hash and encryption policy exists:
   - The orchestrator creates a new metadata entry pointing to the existing provider reference.
   - Zero additional network bandwidth or physical storage is consumed.
3. Upon deletion, objects are soft-deleted; physical blocks are only removed if all aliases are purged.
