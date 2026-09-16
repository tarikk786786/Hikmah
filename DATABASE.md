# Hikmah Database Schema Specification

Hikmah uses PostgreSQL 16 hosted on Supabase, with `pgvector` for cosine similarity searches, partitioned into specialized functional schemas.

---

## 1. Migration History

1. `20260915000000_initial_schema.sql`: Core foundation, agent runs, tools, audit events.
2. `20260915000001_capabilities_and_task_graph.sql`: Capabilities and task graph persistence.
3. `20260916000000_model_router_and_usage.sql`: Model registry, routing policies, and token usage ledger.
4. `20260917000000_durable_tasks_and_workflows.sql`: Durable workflow engine, task checkpoints, worker leases.
5. `20260918000000_cellular_and_geointel.sql`: Cells, cell observations, device consents, provider quotas.
6. `20260919000000_memory_router_and_fabric.sql`: Canonical memory registry, provider references, provider health telemetry, memory conflicts, and relationships.
7. `20260920000000_universal_storage_engine.sql`: Storage folders, canonical objects, chunks, shares, and automated backup manifests.
8. `20260921000000_universal_web_research_engine.sql`: Researches, sources, claims, evidence, timelines, entities, reports, and monitors.


---

## 2. Memory Router & Knowledge Fabric Tables (PRD 08A)

### `memory_registry`
- `id` (`TEXT PRIMARY KEY`): Unique canonical memory identifier.
- `user_id` (`TEXT NOT NULL`): Account owner ID.
- `project_id` (`TEXT`): Project workspace identifier.
- `classification` (`VARCHAR(32)`): Memory type (`USER`, `PROJECT`, `PREFERENCE`, `TEMPORAL`, etc.).
- `canonical_content` (`TEXT`): Primary text content with credentials redacted.
- `canonical_hash` (`VARCHAR(64)`): SHA-256 hash used for deduplication.
- `primary_provider` (`VARCHAR(32)`): Selected backend (`mem0`, `graphiti`, `native-supabase`, etc.).
- `authority` (`VARCHAR(32)`): Precedence rank (`USER_EXPLICIT`, `VERIFIED_SYSTEM_DATA`, etc.).
- `status` (`VARCHAR(16)`): 'ACTIVE', 'ARCHIVED', 'DELETED'.

### `memory_provider_refs`
- `id` (`UUID PRIMARY KEY`): Reference UUID.
- `memory_id` (`TEXT REFERENCES memory_registry(id)`): Linked canonical record.
- `provider` (`VARCHAR(32)`): External provider key.
- `provider_memory_id` (`TEXT`): Target provider record ID.
- `status` (`VARCHAR(16)`): 'SYNCED', 'PENDING', 'FAILED'.

### `memory_provider_health`
- `provider` (`VARCHAR(32) PRIMARY KEY`): Provider key.
- `status` (`VARCHAR(16)`): 'BUILT_IN', 'HEALTHY', 'DEGRADED', 'OFFLINE', 'DISABLED'.
- `latency_ms` (`INTEGER`): Ping / round-trip latency.
- `record_count` (`INTEGER`): Number of indexed records.
- `error` (`TEXT`): Last observed failure message.

### `memory_conflicts`
- `id` (`UUID PRIMARY KEY`): Conflict event UUID.
- `existing_memory_id` (`TEXT`): Existing canonical record.
- `incoming_content` (`TEXT`): Contradictory new content.
- `resolution` (`VARCHAR(32)`): 'OVERWRITE', 'PRESERVE_EXISTING', 'COEXIST_TEMPORAL'.
- `reason` (`TEXT`): Rationale based on authority ranking.

### `memory_relationships`
- `id` (`UUID PRIMARY KEY`): Relationship edge UUID.
- `source_id` (`TEXT`): Source entity ID.
- `target_id` (`TEXT`): Target entity ID.
- `relation_type` (`VARCHAR(64)`): Edge type ('USES', 'DEPLOYED_ON', 'MIGRATED_FROM').
- `valid_from` / `valid_to` (`TIMESTAMPTZ`): Temporal validity bounds.

---

## 3. Universal Storage Engine Tables (PRD 10)

### `storage_objects`
- `id` (`TEXT PRIMARY KEY`): Canonical object identifier (`obj_...`).
- `key` (`TEXT NOT NULL`): Virtual file path.
- `name` (`TEXT NOT NULL`): Display filename.
- `size_bytes` (`BIGINT NOT NULL`): Plaintext size in bytes.
- `sha256` (`TEXT NOT NULL`): Cryptographic digest for deduplication.
- `tier` (`TEXT NOT NULL`): 'HOT', 'NORMAL', 'COLD', 'ARCHIVE'.
- `is_encrypted` (`BOOLEAN NOT NULL`): True if protected via AES-256-GCM.
- `is_chunked` (`BOOLEAN NOT NULL`): True if split across multiple storage chunks.
- `chunk_count` (`INTEGER NOT NULL`): Number of physical parts.
- `primary_provider` (`TEXT NOT NULL`): Primary storage backend ('supabase', 'telegram', 'local', 's3').
- `status` (`TEXT NOT NULL`): 'ACTIVE', 'ARCHIVED', 'DELETED'.

### `storage_chunks`
- `id` (`TEXT PRIMARY KEY`): Chunk identifier (`chk_...`).
- `object_id` (`TEXT REFERENCES storage_objects(id)`): Parent object.
- `chunk_index` (`INTEGER NOT NULL`): Zero-based sequential order.
- `size_bytes` (`BIGINT NOT NULL`): Chunk byte length.
- `sha256` (`TEXT NOT NULL`): Per-chunk integrity checksum.
- `provider_ref` (`TEXT NOT NULL`): Backend locator (e.g. Telegram `file_id`).
- `provider_id` (`TEXT NOT NULL`): Target provider.

### `storage_shares`
- `id` (`TEXT PRIMARY KEY`): Share UUID.
- `object_id` (`TEXT REFERENCES storage_objects(id)`): Linked object.
- `share_token` (`TEXT UNIQUE`): Random high-entropy token for access.
- `access_level` (`TEXT`): 'READ' or 'DOWNLOAD'.
- `expires_at` (`TIMESTAMPTZ`): Expiring lease timestamp.

### `storage_backups`
- `id` (`TEXT PRIMARY KEY`): Backup identifier (`backup_...`).
- `name` (`TEXT NOT NULL`): Human-readable snapshot name.
- `backup_type` (`TEXT`): 'DATABASE', 'GIT_REPO', 'MEMORY', 'STORAGE', 'FULL'.
- `size_bytes` (`BIGINT`): Archive payload size.
- `sha256` (`TEXT`): Cryptographic digest of complete archive.
- `components` (`JSONB`): Manifest item array with individual component checksums.

---

## 4. Universal Web Research Engine Tables (PRD 11)

### `researches`
- `id` (`TEXT PRIMARY KEY`): Master investigation task ID (`res_...`).
- `question` (`TEXT NOT NULL`): Root query or goal.
- `mode` (`TEXT NOT NULL`): 'QUICK', 'STANDARD', 'DEEP', 'INVESTIGATION', 'MONITOR'.
- `status` (`TEXT NOT NULL`): 'PENDING', 'SEARCHING', 'FETCHING', 'EXTRACTING', 'VERIFYING', 'SYNTHESIZING', 'COMPLETED', 'FAILED'.
- `budget` (`JSONB NOT NULL`): Limits on queries, pages, bytes, runtime, AI calls.
- `progress_percent` (`INTEGER`): Realtime completion percentage (0-100).
- `user_id` (`TEXT NOT NULL`): Operator owner.

### `research_sources`
- `id` (`TEXT PRIMARY KEY`): Source record ID (`src_...`).
- `research_id` (`TEXT REFERENCES researches(id)`): Parent investigation.
- `url` / `canonical_url` (`TEXT NOT NULL`): Cleaned destination URL.
- `url_hash` (`TEXT NOT NULL`): SHA-256 digest of canonical URL.
- `title` / `publisher` / `author`: Metadata.
- `authority` (`INTEGER`): Authority rank (1=official/primary, 10=unverified).
- `classification` (`TEXT`): 'PRIMARY', 'SECONDARY', 'TERTIARY', 'USER_PROVIDED', 'ARCHIVED', 'UNVERIFIED'.

### `research_claims`
- `id` (`TEXT PRIMARY KEY`): Extracted assertion identifier (`clm_...`).
- `research_id` (`TEXT REFERENCES researches(id)`): Parent investigation.
- `claim` / `normalized_claim` (`TEXT NOT NULL`): Factual assertion.
- `status` (`TEXT NOT NULL`): 'UNCHECKED', 'SUPPORTED', 'CORROBORATED', 'CONTRADICTED', 'UNVERIFIED', 'OUTDATED'.
- `confidence` (`REAL`): Probability score (0.0 to 1.0).
- `supporting_evidence_ids` / `contradicting_evidence_ids` (`JSONB`): Attached evidence pointers.

### `research_monitors` & `research_monitor_diffs`
- `research_monitors`: Scheduled URL/query watchers with polling frequency and snapshot hashes.
- `research_monitor_diffs`: Audit history of detected changes (`NEW`, `CHANGED`, `REMOVED`, `UNCHANGED`) with added/removed text snippets.

---

## 5. Browser Intelligence Engine Tables (PRD 12)

### `browser_profiles`
- `id` (`TEXT PRIMARY KEY`): Named profile identifier.
- `name` (`TEXT NOT NULL`): Human-readable profile name.
- `user_id` (`TEXT NOT NULL`): Operator owner.
- `user_agent` (`TEXT`): Browser user agent string.
- `viewport` (`JSONB NOT NULL`): Viewport width and height.
- `proxy` (`JSONB`): Optional proxy routing rules (`server`, `username`, `password`, `bypass`).
- `cookies` (`JSONB NOT NULL`): Persistent cookie array across sessions.
- `storage_state` (`JSONB NOT NULL`): LocalStorage and SessionStorage key-value pairs.

### `browser_sessions`
- `id` (`TEXT PRIMARY KEY`): Active session context identifier.
- `profile_id` (`TEXT REFERENCES browser_profiles(id)`): Parent profile.
- `browser_type` (`TEXT`): 'chromium', 'firefox', 'webkit'.
- `status` (`TEXT NOT NULL`): 'idle', 'busy', 'navigating', 'closed', 'error'.
- `current_url` (`TEXT NOT NULL`): Active web address.
- `title` (`TEXT NOT NULL`): Active page title.
- `last_active_at` (`TIMESTAMPTZ`): Activity timestamp for TTL reaper.

### `browser_tasks`
- `id` (`TEXT PRIMARY KEY`): Autonomous BrowserUseAgent goal job.
- `session_id` (`TEXT REFERENCES browser_sessions(id)`): Associated browser session.
- `goal` (`TEXT NOT NULL`): User objective.
- `status` (`TEXT NOT NULL`): 'pending', 'running', 'completed', 'failed', 'paused'.
- `max_steps` (`INTEGER`): Allowed cognitive steps.
- `final_answer` (`JSONB`): Extracted solution and summaries.

### `browser_actions`
- `id` (`TEXT PRIMARY KEY`): Action execution trace record.
- `session_id` (`TEXT REFERENCES browser_sessions(id)`): Parent session.
- `task_id` (`TEXT REFERENCES browser_tasks(id)`): Parent autonomous task if any.
- `action_type` (`TEXT NOT NULL`): 'navigate', 'click', 'type', 'fill_form', 'select', 'scroll', 'wait', 'act_semantic'.
- `selector` / `healed_selector` (`TEXT`): Target selector and any self-healed replacement.
- `duration_ms` (`INTEGER`): Milliseconds spent executing action.

### `browser_network_logs`
- `id` (`TEXT PRIMARY KEY`): Intercepted HTTP trace ID.
- `session_id` (`TEXT REFERENCES browser_sessions(id)`): Parent session.
- `url` / `method` / `status`: HTTP transaction properties.
- `resource_type` (`TEXT`): 'document', 'script', 'stylesheet', 'image', 'xhr', 'fetch'.

### `browser_artifacts`
- `id` (`TEXT PRIMARY KEY`): Artifact record ID.
- `session_id` (`TEXT REFERENCES browser_sessions(id)`): Parent session.
- `artifact_type` (`TEXT`): 'SCREENSHOT', 'VIDEO', 'HAR', 'DOM_SNAPSHOT', 'A11Y_TREE'.
- `storage_object_id` (`TEXT REFERENCES storage_objects(id)`): Universal Storage Engine foreign key.


