# Hikmah Universal Storage Subsystem (PRD 10)

The **Universal Storage Engine** provides Hikmah with a provider-independent storage layer that supports multi-tier lifecycle management, automated deduplication, envelope encryption, large object chunking, and cold archiving over Telegram TG-S3/MTProto.

---

## Core Capabilities

1. **Standardized Engine Contract (`StorageEngine`)**:
   - `put`: Uploads or stores objects with automatic SHA-256 deduplication, AES-256-GCM encryption, chunking, and tier routing.
   - `get`: Retrieves and reassembles chunks and decrypts payloads transparently.
   - `delete`: Supports soft deletion and physical multi-tier purging.
   - `list`: Filters by folder, tier, MIME type, owner, and prefix.
   - `search`: Keyword and metadata search across stored objects.
   - `copy` / `move` / `rename`: Zero-copy operations utilizing cryptographic deduplication.
   - `share` / `revokeShare`: Expiring signed share tokens with configurable read/download access levels.
   - `verify`: End-to-end cryptographic checksum verification against original SHA-256 and chunk Merkle trees.

2. **Multi-Tier Routing**:
   - `HOT`: Fast in-memory cache with configurable TTL.
   - `NORMAL`: Everyday files, code repositories, and documents via Supabase Object Storage or Local Filesystem.
   - `COLD`: Bulk datasets, media files, and long-term archives via Telegram TG-S3 / MTProto abstraction or S3/R2/MinIO.
   - `ARCHIVE`: Immutable periodic system backups.

3. **Telegram TG-S3 / MTProto Cold Storage**:
   - Strictly encapsulated behind `TelegramStorageProvider`.
   - The assistant core, LLMs, and UI never see Telegram Bot tokens or chat IDs.
   - Automatic fallback to simulated cold archive when credentials are not supplied.

4. **AES-256-GCM Envelope Encryption**:
   - Per-object Data Encryption Keys (DEKs) wrapped by a Master Key via `KeyManager`.
   - Authenticated ciphertext with random 12-byte IVs and 16-byte authentication tags.

5. **Automated Backup & Disaster Recovery**:
   - Database schema snapshots, memory fabric exports, and workspace backups.
   - Signed JSON manifests (`BackupManifest`) with component SHA-256 hashes and dry-run restoration validation.

6. **Dedicated MCP Server (`hikmah-storage`)**:
   - 12 registered tools wired into `ToolRegistry` and `CapabilityRegistry`.
