# J.A.R.V.I.S. — Tool System & Integration Specification

## 1. Overview
The JARVIS Tool Registry decouples capability implementations from the core assistant. Every tool declares its schema, risk tier, timeout, and execution logic.

## 2. Tool Definition Interface
```typescript
export interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  timeoutMs: number;
  enabled: boolean;
  execute(input: Record<string, unknown>, ctx: ExecutionContext): Promise<ToolResult>;
}
```

## 3. Risk Level Matrix
| Risk Level | Description | Auto-Approval Policy | Example Tools |
| :--- | :--- | :--- | :--- |
| **LOW** | Read-only public or computed actions | Always auto-approved | `calculator`, `web_search`, `system_status` |
| **MEDIUM** | Local read actions within sandbox | Auto-approved under standard config | `file_read`, `memory_store` |
| **HIGH** | State-modifying or external write actions | Requires human approval token | `file_write`, `send_email`, `exec_code` |
| **CRITICAL** | Destructive, irreversible system commands | Requires two-factor operator authorization | `delete_data`, `wipe_database`, `bash_root` |

## 4. Foundational Tools (Phase 1)
1. `web_search`: Queries public web via SearXNG or verified search index with source citations.
2. `calculator`: Safe mathematical expression evaluator strictly restricted to numerical characters.
3. `file_read`: Sandboxed workspace file reader enforcing directory boundaries and size quotas.
4. `system_status`: Real-time inspection of node memory, uptime, queue status, and active safety flags.
5. `memory_store`: Direct interface for indexing new preferences, facts, or tasks into vector memory.

## 5. Authoring a New Tool
To add a new tool:
1. Create adapter in `tools/adapters/<your-tool>.ts`.
2. Implement the `ToolDefinition` contract.
3. Register the tool in `tools/registry/registry.ts`.
4. The tool is automatically discovered by `JarvisCore`, mapped into model tool calling schemas, and displayed on `/tools`.

---

## 6. Cellular & Geolocation Intelligence Tools (PRD 07)
Exposed through the `hikmah-geointel` MCP server and registered in `ToolRegistry`:

| Tool | Risk | Description |
| :--- | :--- | :--- |
| `geointel_lookup_cell` | `LOW` | Look up public cell tower by MCC, MNC, LAC, CID with OpenCelliD attribution. |
| `geointel_search_cells_in_area` | `LOW` | Query cell towers within bounding box coordinates (capped at 50). |
| `geointel_estimate_location` | `LOW` | Multi-cell signal-weighted centroid location estimation. |
| `geointel_reverse_geocode` | `LOW` | OpenStreetMap Nominatim reverse geocoding to address. |
| `geointel_register_device_consent` | `MEDIUM` | Register authorized device with salted SHA-256 hash. |
| `geointel_revoke_device_consent` | `MEDIUM` | Revoke device consent, immediately halting ingestion. |
| `geointel_verify_device_consent` | `LOW` | Verify active consent state for device hash. |
| `geointel_list_consented_devices` | `MEDIUM` | List registered devices and consent policies. |
| `geointel_purge_device_data` | `HIGH` | Purge all historical telemetry observations for a device hash. |
| `geointel_ingest_observations` | `MEDIUM` | Ingest validated RF telemetry with 1-minute deduplication. |
| `geointel_get_historical_path` | `MEDIUM` | Retrieve chronological location trajectory for authorized device. |
| `geointel_analyze_movement` | `LOW` | Analyze tower handovers, distance traversed, and speed metrics. |
| `geointel_check_provider_quota` | `LOW` | Check OpenCelliD daily credit quota and usage. |

---

## 7. Memory Router & Knowledge Fabric Tools (PRD 08A)
Exposed through the `hikmah-memory-router` MCP server and registered in `ToolRegistry`:

| Tool | Risk | Description |
| :--- | :--- | :--- |
| `memory_remember` | `LOW` | Store memory via Memory Router with auto-classification and secret protection. |
| `memory_recall` | `LOW` | Retrieve relevant memories for natural language query. |
| `memory_search` | `LOW` | Search memories across providers with classification filters. |
| `memory_timeline` | `LOW` | Retrieve temporal evolution and state transitions for entity/project. |
| `memory_related` | `LOW` | Traverse knowledge graph connections and linked concepts. |
| `memory_learn` | `LOW` | Record procedural workflow rules or user corrections. |
| `memory_forget` | `HIGH` | Permanently delete memory across canonical registry and all provider backends. |
| `memory_consolidate` | `LOW` | Consolidate episodic memories into durable knowledge summaries. |
| `memory_explain` | `LOW` | Audit provenance, storage rationale, and provider details for memory record. |

---

## 8. Universal Storage Engine Tools (PRD 10)
Exposed through the `hikmah-storage` MCP server and registered in `ToolRegistry`:

| Tool | Risk | Description |
| :--- | :--- | :--- |
| `storage_put` | `LOW` | Upload/store object with deduplication, tiering, chunking, and envelope encryption. |
| `storage_get` | `LOW` | Retrieve object with automatic chunk reassembly and transparent decryption. |
| `storage_delete` | `MEDIUM` | Delete or permanently purge object from storage. |
| `storage_list` | `LOW` | List stored objects with optional tier, user, and prefix filters. |
| `storage_search` | `LOW` | Search files across stored objects by name, key, or metadata. |
| `storage_copy` | `LOW` | Copy an object using zero-copy deduplication. |
| `storage_move` | `MEDIUM` | Move an object to a new key/path without data duplication. |
| `storage_share` | `MEDIUM` | Generate an expiring secure share token for an object. |
| `storage_revoke_share` | `LOW` | Revoke an active share token. |
| `storage_verify` | `LOW` | Cryptographically verify object integrity against SHA-256 and chunk hashes. |
| `storage_backup` | `MEDIUM` | Create an automated backup snapshot with cryptographic manifest. |
| `storage_restore` | `HIGH` | Restore and verify a backup snapshot with optional dry run. |

---

## 9. Universal Web Research & Deep Research Engine Tools (PRD 11)
Exposed through the `hikmah-research` MCP server and registered in `ToolRegistry`:

| Tool | Risk | Description |
| :--- | :--- | :--- |
| `research_search` | `LOW` | Multi-intent web search across SearXNG, Academic, GitHub, and Historical archives. |
| `research_fetch` | `LOW` | Fetch web page content with kernel-level SSRF protection and bot mitigation. |
| `research_extract` | `LOW` | Extract boilerplate-free main content, metadata, and tables using Trafilatura algorithms. |
| `research_discover` | `LOW` | Discover relevant links, sub-pages, and sitemaps from target URLs. |
| `research_start` | `LOW` | Launch autonomous deep research pipeline (`QUICK`, `STANDARD`, `DEEP`, `INVESTIGATION`). |
| `research_get_status` | `LOW` | Check real-time progress and stage status of a research task. |
| `research_get_report` | `LOW` | Retrieve complete synthesized report with verified claims and citations. |
| `research_verify_claim` | `LOW` | Verify an assertion against live web sources, checking corroboration vs contradiction. |
| `research_build_timeline` | `LOW` | Extract chronological events and date lineage from research texts. |
| `research_extract_entities` | `LOW` | Extract named entities (people, companies, repos, locations) with cross-references. |
| `research_monitor_create` | `LOW` | Register a scheduled URL or topic change watcher. |
| `research_monitor_check` | `LOW` | Trigger an immediate change detection check and return diffs (`NEW`, `CHANGED`, `REMOVED`). |
| `research_monitor_list` | `LOW` | List all active monitoring jobs. |
| `research_validate_citations` | `LOW` | Enforce anti-hallucination rule: verify citations map directly to retrieved sources. |

---

## 10. Browser Intelligence Engine Tools (PRD 12)
Exposed through the `hikmah-browser` MCP server and registered in `ToolRegistry`:

| Tool | Risk | Description |
| :--- | :--- | :--- |
| `browser_navigate` | `LOW` | Navigate to destination URL with wait conditions (`domcontentloaded`, `load`, `networkidle`). |
| `browser_click` | `LOW` | Click element via CSS/XPath or text with automatic self-healing recovery. |
| `browser_type` | `LOW` | Enter keystrokes into input fields with optional delay or clear-first. |
| `browser_fill_form` | `LOW` | Populate multiple form fields simultaneously in a single command. |
| `browser_select` | `LOW` | Select dropdown options in `<select>` elements. |
| `browser_scroll` | `LOW` | Scroll view vertically or horizontally by pixel offsets or into element. |
| `browser_wait` | `LOW` | Wait for selector to appear, state change, or fixed timeout. |
| `browser_screenshot` | `LOW` | Capture full-page or element screenshot returning base64 or storage object ID. |
| `browser_snapshot_dom` | `LOW` | Extract cleaned DOM snapshot and catalog of all interactive elements. |
| `browser_extract_accessibility` | `LOW` | Extract screen-reader accessibility tree with roles, names, and focus states. |
| `browser_act_semantic` | `LOW` | Execute natural language instruction via Stagehand AI intent translation. |
| `browser_extract_semantic` | `LOW` | Extract typed structured schema directly from visible page state. |
| `browser_observe` | `LOW` | Discover available interactive actions and affordances on the current page. |
| `browser_session_create` | `LOW` | Initialize an isolated profile session with custom cookies and proxy. |
| `browser_session_close` | `LOW` | Terminate an active session and flush cookies back to profile. |
| `browser_run_agent` | `MEDIUM` | Execute an autonomous multi-step web agent goal (`BrowserUseAgent`). |



