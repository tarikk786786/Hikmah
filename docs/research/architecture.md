# Research Pipeline Architecture & Security

This document outlines the detailed stages and security guards powering Hikmah's Universal Web Research & Deep Research Engine.

---

## 1. The 11-Stage Pipeline

1. **Planning (`QueryPlanner`)**:
   - Decomposes the primary research question into varied search queries with distinct search intents (`GENERAL`, `TECHNICAL`, `ACADEMIC`, `NEWS`, `HISTORICAL`).
   - Adapts query limits and breadth to the configured `ResearchMode`.

2. **Search (`SearchRouter`)**:
   - Queries `SearXNG` instances or fallback search providers.
   - Routes academic topics to arXiv/OpenAlex and code issues to GitHub.
   - Preserves canonical URLs and deduplicates raw search results.

3. **Discovery (`DiscoveryEngine`)**:
   - For `DEEP` and `INVESTIGATION` tasks, parses top landing pages to uncover relevant sub-links, sitemaps, and robots endpoints.

4. **Fetch (`FetchRouter`)**:
   - Dispatches requests through `HttpFetcher`, `ScraplingProvider`, or `PlaywrightWorkerFetchProvider`.
   - Protects against Server-Side Request Forgery (SSRF) via `HttpSecurityGuard`.

5. **Render**:
   - Executes dynamic JavaScript rendering where static HTML is insufficient (SPAs, dynamic client hydration).

6. **Extract (`ExtractionRouter`)**:
   - Applies Trafilatura algorithms to strip advertising, navigational menus, header/footer boilerplate, and tracking scripts.
   - Extracts page titles, authors, published dates, and main text paragraphs.

7. **Normalize (`UrlCanonicalizer`)**:
   - Strips UTM marketing tags, trailing slashes, fragments, and standardizes casing.
   - Computes SHA-256 `urlHash` and `contentHash`.

8. **Verify (`VerificationEngine`)**:
   - Evaluates domain authority scores (1 to 10).
   - Groups syndicated press releases and wire stories with `DuplicateStoryDetector`.
   - Identifies whether claims are `SUPPORTED`, `CORROBORATED`, `CONTRADICTED`, or `UNVERIFIED`.

9. **Compare**:
   - Cross-analyzes conflicting assertions across primary and secondary sources, highlighting ambiguities in the report.

10. **Cite (`CitationEngine`)**:
    - Generates markdown citations linked to verified source IDs.
    - Flags unverified assertions with `[Unverified]` or `[Disputed]`.

11. **Synthesize & Store**:
    - Assembles the final markdown report with executive summaries, findings, timeline, entities, and citations.
    - Optionally archives report artifacts into `StorageOrchestrator` (`research/<id>/report.md`).

---

## 2. Security: SSRF Protection (`HttpSecurityGuard`)

Web scrapers and research engines must never access internal cloud infrastructure or local services.
The `HttpSecurityGuard` enforces:
- **Private Subnets Blocked**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- **Loopback Blocked**: `127.0.0.0/8`, `::1`, `localhost`.
- **Cloud Metadata Blocked**: `169.254.169.254`, `metadata.google.internal`.
- **Link-Local & Multicast Blocked**: `169.254.0.0/16`, `fe80::/10`.
- **Scheme Enforcement**: Only `http:` and `https:` allowed.
