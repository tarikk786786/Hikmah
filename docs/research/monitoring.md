# Research Change Monitoring & Diff Engine

The **ResearchMonitorEngine** provides automated, scheduled tracking of web resources to alert agents and users when critical documentation, articles, or search topics evolve.

---

## 1. How It Works

1. **Job Registration (`ResearchMonitorJob`)**:
   - Accepts a list of target URLs or search queries.
   - Configures polling intervals (e.g. every 60 minutes).

2. **Snapshot Extraction**:
   - Periodically retrieves the latest version of tracked URLs.
   - Extracts clean main content via `TrafilaturaExtractor`.
   - Computes a SHA-256 hash of the extracted text.

3. **Diff Calculation (`ResearchMonitorDiff`)**:
   - Compares the new hash against the stored baseline snapshot.
   - If the hash differs, identifies added and removed text lines.
   - Categorizes the change:
     - `NEW`: First time the URL was captured.
     - `CHANGED`: Content updated with added/removed sections.
     - `REMOVED`: URL dropped from target tracking.
     - `UNCHANGED`: Content identical to baseline.

4. **Diff History & Retrieval**:
   - Diffs are stored chronologically and accessible via the API (`/api/research/monitor`) and MCP tools (`research_monitor_check`, `research_monitor_list`).
