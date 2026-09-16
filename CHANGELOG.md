# Changelog

All notable changes to the Hikmah AI Operating System are documented in this file.

## [PRD 12] - 2026-09-16
### Added
- **Browser Intelligence Engine**:
  - `browser/core/types.ts`: Domain models for `BrowserSession`, `BrowserProfile`, `BrowserAction`, `DOMSnapshot`, `AccessibilityNode`, `NetworkRequest`, and `BrowserAgentGoal`.
  - `browser/core/security/browser-guard.ts`: `BrowserSecurityGuard` for navigation SSRF defense, protocol restrictions (`http:`, `https:`), dangerous download quarantine, and credential redaction.
  - `browser/core/session-manager.ts`: `BrowserSessionManager` providing isolated browser contexts, named profiles, cookie jar sync, proxy routing, and idle session TTL reaping.
  - `browser/core/driver/playwright-driver.ts`: `PlaywrightBrowserDriver` providing deterministic navigation, clicks, typing, form fills, selection, scrolling, wait conditions, and PNG screenshots with resilient virtual DOM fallback.
  - `browser/core/semantic/stagehand-provider.ts`: `StagehandProvider` implementing natural language `act` intent translation, typed schema `extract`, and interactive affordance `observe`.
  - `browser/core/self-healing/self-healing-engine.ts`: `SelfHealingEngine` resolving broken selectors across 4 fallback strategies (attribute fuzzy matching, accessibility role/names, semantic text, tag nearest context) with learned selector cache.
  - `browser/core/agent/browser-use-agent.ts`: `BrowserUseAgent` executing autonomous multi-step goals with cognitive step thoughts and auto-correction.
  - `browser/core/orchestrator.ts`: Master `BrowserOrchestrator` coordinating drivers, sessions, semantic actions, Universal Storage persistence, and Memory Router ingestion.
  - `browser/index.ts`: Module exports.
- **Dedicated MCP Server (`hikmah-browser`)**:
  - 16 registered browser tools in `ToolRegistry` and `CapabilityRegistry` (`browser_navigate`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select`, `browser_scroll`, `browser_wait`, `browser_screenshot`, `browser_snapshot_dom`, `browser_extract_accessibility`, `browser_act_semantic`, `browser_extract_semantic`, `browser_observe`, `browser_session_create`, `browser_session_close`, `browser_run_agent`).
- **Database Migration**:
  - `supabase/migrations/20260922000000_browser_intelligence_engine.sql` creating `browser_profiles`, `browser_sessions`, `browser_tasks`, `browser_actions`, `browser_network_logs`, and `browser_artifacts`.
- **Web UI & Next.js API Routes**:
  - `/browser`: Browser Intelligence Cockpit featuring Live Viewport, Interactive Action Terminal, DOM & Elements Inspector, Accessibility Hierarchy Viewer, and Autonomous Agent Tracker.
  - Next.js API endpoints: `/api/browser/session`, `/api/browser/navigate`, `/api/browser/action`, `/api/browser/screenshot`, `/api/browser/snapshot`, `/api/browser/agent`.
  - Sidebar navigation updated with `/browser`.
- **Documentation Suite**:
  - `docs/browser/` (README.md, architecture.md, playwright-driver.md, semantic-actions.md, sessions-and-profiles.md, self-healing.md, security.md, deployment.md).

## [PRD 11] - 2026-09-16
### Added
- **Universal Web Research & Deep Research Engine**:
  - `research/core/types.ts`: Domain models for `ResearchMode` (`QUICK`, `STANDARD`, `DEEP`, `INVESTIGATION`, `MONITOR`), sources, claims, evidence, timelines, entities, reports, and monitors.
  - `research/core/security/ssrf-guard.ts`: `HttpSecurityGuard` blocking loopback, private IPv4/IPv6 ranges, link-local, and cloud metadata (`169.254.169.254`).
  - `research/core/canonicalizer.ts`: `UrlCanonicalizer` stripping tracking query params, fragments, default ports, and computing SHA-256 digests.
  - `research/core/query-planner.ts`: `QueryPlanner` translating research objectives into multi-angle intent-aware queries.
  - `research/core/search-router.ts`: `SearchRouter` aggregating SearXNG, Academic (arXiv/OpenAlex), GitHub repos, and Wayback Machine archives.
  - `research/core/fetch-router.ts`: `FetchRouter` coordinating `HttpFetcher`, `ScraplingProvider`, and `PlaywrightWorkerFetchProvider` with SSRF protection.
  - `research/core/extraction-router.ts`: `TrafilaturaExtractor` stripping boilerplate, navigation, ads, and tracking scripts, plus `DocumentExtractor`.
  - `research/core/discovery-engine.ts`: `DiscoveryEngine` uncovering domain sub-links, sitemaps, and robots endpoints for deep crawl modes.
  - `research/core/verification-engine.ts`: `VerificationEngine`, `SourceEvaluator` (authority tiers 1-10), and `DuplicateStoryDetector` (opening fingerprint clustering to defend against wire-service circular confirmation).
  - `research/core/citation-engine.ts`: `CitationEngine` enforcing the anti-hallucination grounding rule ("No supporting source $\implies$ do not present as verified fact").
  - `research/core/timeline-engine.ts`: `TimelineEngine` & `EntityExtractor` for chronological event ordering and named entity graph reconstruction.
  - `research/core/monitor-engine.ts`: `ResearchMonitorEngine` tracking web changes with diff generation (`NEW`, `CHANGED`, `REMOVED`, `UNCHANGED`).
  - `research/core/orchestrator.ts`: Master `ResearchOrchestrator` coordinating all 11 stages and interfacing with `StorageOrchestrator`.
- **Dedicated MCP Server (`hikmah-research`)**:
  - 14 registered tools in `ToolRegistry` and `CapabilityRegistry` (`research_search`, `research_fetch`, `research_extract`, `research_discover`, `research_start`, `research_get_status`, `research_get_report`, `research_verify_claim`, `research_build_timeline`, `research_extract_entities`, `research_monitor_create`, `research_monitor_check`, `research_monitor_list`, `research_validate_citations`).
- **Database Migration**:
  - `supabase/migrations/20260921000000_universal_web_research_engine.sql` creating `researches`, `research_sources`, `research_claims`, `research_evidence`, `research_timelines`, `research_entities`, `research_reports`, `research_monitors`, `research_monitor_diffs`.
- **Web UI & API**:
  - `/research`: Deep Research Cockpit with Investigation Launcher, Claim Verification Terminal, Change Monitoring Watchers, and Multi-Engine Search.
  - Next.js API routes: `/api/research`, `/api/research/[id]`, `/api/research/search`, `/api/research/verify`, `/api/research/monitor`.
- **Documentation**:
  - Comprehensive research suite in `docs/research/` (README, architecture, verification-and-citations, monitoring).

## [PRD 10] - 2026-09-16
### Added
- **Universal Storage Engine & Multi-Tier Orchestrator**:
  - `storage/core/types.ts`: StorageObject, StorageChunk, StorageShare, BackupManifest, and StorageEngine contract.
  - `storage/core/encryption/crypto.ts`: AES-256-GCM authenticated cipher with 12-byte IVs and 16-byte tags.
  - `storage/core/encryption/key-manager.ts`: Envelope encryption manager with per-object Data Encryption Keys (DEKs).
  - `storage/core/chunking/chunker.ts`: Large object chunker with per-chunk SHA-256 checksums and stream reassembly.
  - `storage/core/router.ts`: Multi-tier storage router dispatching between HOT (RAM), NORMAL (Supabase/Local), and COLD (Telegram/S3).
  - `storage/core/backup/backup-engine.ts`: Automated snapshot engine generating cryptographically signed backup manifests.
  - `storage/core/orchestrator.ts`: Unified StorageOrchestrator coordinating deduplication, encryption, chunking, caching, and CRUD.
- **Provider Adapters**:
  - `TelegramStorageProvider`: TG-S3/MTProto cold storage abstraction with rate-limiting, chunking, and zero credential leakage.
  - `SupabaseStorageProvider`: Supabase Object Storage bucket adapter with local fallback.
  - `LocalStorageProvider`: Sandboxed filesystem provider with path traversal protection.
  - `S3CompatibleStorageProvider`: S3, Cloudflare R2, and MinIO enterprise storage provider.
- **Dedicated MCP Server (`hikmah-storage`)**:
  - 12 registered tools wired into `ToolRegistry` and `CapabilityRegistry` (`storage_put`, `storage_get`, `storage_delete`, `storage_list`, `storage_search`, `storage_copy`, `storage_move`, `storage_share`, `storage_revoke_share`, `storage_verify`, `storage_backup`, `storage_restore`).
- **Supabase Migration**:
  - `20260920000000_universal_storage_engine.sql` for folders, objects, chunks, shares, backups, and provider health.
- **Web UI & API Routes**:
  - `/storage`: Drive-style management console with Files, Backups, and Health tabs.
  - `/storage/providers`: Storage provider metrics, ping latency, and online/offline states.
  - 7 Next.js API endpoints under `/api/storage/*`.
- **Documentation**:
  - Detailed specifications in `docs/storage/` (README, architecture, telegram-tgs3, encryption-and-chunking, backup-restore).

## [PRD 08A] - 2026-09-16
### Added
- **Multi-Engine Memory Router & Knowledge Fabric**:
  - `memory/core/types.ts`: Domain models for classification, scopes, authority hierarchy, unified memory records, and provider contracts.
  - `memory/core/classifier/classifier.ts`: `MemoryClassifier` and `MemoryQueryClassifier` for intelligent intent and target provider dispatch.
  - `memory/core/privacy/secret-scanner.ts`: `SecretScanner` scanning and redacting API keys, private keys, database URLs, and passwords.
  - `memory/core/policy/prompt-guard.ts`: `PromptGuard` framing memories in untrusted XML context and defending against prompt injection.
  - `memory/core/merger/merger.ts`: `MemoryMerger` handling multi-provider deduplication, authority conflict resolution, and ranking.
  - `memory/core/router/router.ts`: Master `MemoryRouter` orchestrating unified operations (`remember`, `recall`, `search`, `timeline`, `related`, `learn`, `consolidate`, `explain`) with graceful fallback to native Supabase.
- **Specialized Memory Provider Adapters**:
  - `NativeSupabaseMemoryProvider`: Built-in zero-dependency pgvector fallback engine.
  - `Mem0Provider`: User identity, preferences, and personal instructions.
  - `GraphitiProvider`: Temporal memory, entity state evolution, and validity windows.
  - `LettaProvider`: Stateful agent working memory and MemFS checkpoint blocks.
  - `CogneeProvider`: Multi-source knowledge graph and associative entity extraction.
  - `LangMemProvider`: Procedural rules, coding conventions, and learned user corrections.
  - `SupermemoryProvider`: Large-scale document chunking and PDF research corpus.
- **Dedicated Memory MCP Server (`hikmah-memory-router`)**:
  - 9 structured tools registered in `ToolRegistry` and `CapabilityRegistry` (`memory_remember`, `memory_recall`, `memory_search`, `memory_timeline`, `memory_related`, `memory_learn`, `memory_forget`, `memory_consolidate`, `memory_explain`).
- **Supabase Migration**:
  - `20260919000000_memory_router_and_fabric.sql` creating `memory_registry`, `memory_provider_refs`, `memory_provider_health`, `memory_conflicts`, and `memory_relationships`.
- **Web UI & API**:
  - `/memory`: 7-tab memory fabric console (Personal, Projects, Knowledge, History, Procedures, Agent Memory, Documents).
  - `/memory/providers`: Engine health telemetry and configuration dashboard.
  - 8 REST API routes under `/api/memory/*`.
- **Documentation**:
  - Comprehensive documentation suite in `docs/memory/` (router, providers, architecture, privacy, lifecycle, evaluation, deployment).

## [PRD 07] - 2026-09-16

### Added
- **Cellular & Geolocation Intelligence Subsystem**:
  - `core/geointel/types.ts`: Comprehensive domain types for cells, observations, triangulation, and device consent.
  - `core/geointel/cache.ts`: `CellLookupCache` with normalized keying and configurable TTL.
  - `core/geointel/quota-tracker.ts`: `QuotaTracker` managing daily OpenCelliD request limits (1,000 req/day).
  - `core/geointel/providers/opencellid.ts`: `OpenCellIdProvider` for cell lookup and bounding box queries with mandatory attribution (`Data from OpenCelliD community (CC-BY-SA 4.0)`).
  - `core/geointel/providers/ichnaea.ts`: `IchnaeaProvider` with signal-weighted centroid RF triangulation.
  - `core/geointel/providers/osm.ts`: `OSMProvider` for OpenStreetMap Nominatim reverse geocoding and tile generation.
  - `core/geointel/consent.ts`: `ConsentManager` enforcing salted SHA-256 device hashing and consent lifecycle.
  - `core/geointel/engine.ts`: `GeolocationEngine` multi-source ensemble (GPS, reference towers, RF triangulation).
  - `core/geointel/ingestion.ts`: `ObservationIngestionPipeline` with coordinate validation and 1-minute deduplication windows.
  - `core/geointel/movement.ts`: `MovementAnalyzer` for tower handovers, velocity, and distance calculation.
- **Dedicated MCP Server (`hikmah-geointel`)**:
  - 13 tools registered in `ToolRegistry` and `CapabilityRegistry` with risk tiers and audit logging.
- **Supabase Migration**:
  - `20260918000000_cellular_and_geointel.sql` creating `cells`, `cell_observations`, `operators`, `device_consents`, `provider_quotas`, and `cell_cache`.
- **Web UI Views**:
  - `/geointel`: Control Center overview dashboard with quota gauge and telemetry stream.
  - `/geointel/cells`: Public cell tower explorer with multi-field search and OpenCelliD attribution.
  - `/geointel/maps`: Interactive OpenStreetMap viewer with layer toggles and uncertainty circles.
  - `/geointel/devices`: Authorized device consent manager with privacy boundaries and purge actions.
- **Documentation**:
  - Complete documentation suite in `docs/geointelligence/` (README, providers, privacy, mcp, android, data-model).

## [PRD 06] - 2026-09-15
### Added
- Durable Task, Workflow & Worker Engine with checkpointing, crash recovery, BullMQ-compatible worker, and state transitions.

## [PRD 05] - 2026-09-14
### Added
- Universal AI Model Router & Provider Gateway with multi-provider cascading, streaming, and token cost tracking.

## [PRD 04] - 2026-09-13
### Added
- Universal Capability, Tool, Skill & Agent Engine with dynamic registration, execution, and validation.

## [PRD 01 - 03] - 2026-09-12
### Added
- Initial JARVIS / Hikmah foundation, Supabase vector memory, cognitive pipeline, safety classifier, Next.js dashboard.
