# Hikmah Universal Web Research & Deep Research Engine (PRD 11)

The **Universal Web Research & Deep Research Engine** provides autonomous, multi-engine research capabilities with strict anti-hallucination guarantees, automated claim verification, boilerplate-free Trafilatura extraction, and live change monitoring.

---

## 1. Core Principles

1. **Anti-Hallucination Grounding Rule**:
   $$\text{No Supporting Source} \implies \text{Do Not Present as Verified Fact}$$
   Every factual assertion in a generated report is traceable to captured evidence with a content hash, citation number, and source URL.

2. **Syndication Clustering (Wire-Service Defense)**:
   Multiple websites publishing identical verbatim wire stories (e.g. AP/Reuters syndication) do *not* count as independent corroboration. Identical lead paragraphs are clustered to prevent false consensus.

3. **Multi-Engine Search Routing**:
   Distributes queries intelligently across general engines (SearXNG/DuckDuckGo), academic archives (arXiv, OpenAlex, Semantic Scholar), code repositories (GitHub Search), and historical archives (Wayback Machine).

4. **11-Stage Pipeline**:
   1. `Search` $\to$ 2. `Discover` $\to$ 3. `Fetch` $\to$ 4. `Render` $\to$ 5. `Extract` $\to$ 6. `Normalize` $\to$ 7. `Verify` $\to$ 8. `Compare` $\to$ 9. `Cite` $\to$ 10. `Store` $\to$ 11. `Synthesize`.

---

## 2. Research Modes & Budgets

| Mode | Max Queries | Max Pages | Max Runtime | Discovery | Typical Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `QUICK` | 2 | 5 | 15s | None | Fast factual lookups & definitions |
| `STANDARD` | 5 | 15 | 45s | Shallow | Comprehensive topic overview |
| `DEEP` | 12 | 40 | 120s | 2 Hops | Multi-perspective technical investigation |
| `INVESTIGATION` | 25 | 100 | 300s | 3 Hops | Exhaustive audit, timeline reconstruction |
| `MONITOR` | 3 | 10 | 30s | None | Recurring watcher for page changes |

---

## 3. Architecture Overview

```
User / Agent Prompt
         │
         ▼
 ┌──────────────────────────────────────────┐
 │           ResearchOrchestrator           │
 └───────────────────┬──────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │ QueryPlanner  │       │ MonitorEngine │
 └───────┬───────┘       └───────┬───────┘
         │                       │
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │ SearchRouter  │       │  FetchRouter  │
 └───────┬───────┘       └───────┬───────┘
         │                       │
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │DiscoveryEngine│       │  SSRF Guard   │
 └───────┬───────┘       └───────┬───────┘
         │                       │
         ▼                       ▼
 ┌───────────────────────────────────────┐
 │      Trafilatura & DocExtractor       │
 └───────────────────┬───────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │Verification   │       │CitationEngine │
 │    Engine     │       │(Anti-Halluc)  │
 └───────┬───────┘       └───────┬───────┘
         │                       │
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │Timeline/Entity│       │Storage & Mem  │
 │    Engine     │       │ Integration   │
 └───────────────┘       └───────────────┘
```

---

## 4. MCP Tools Registered

- `research_search`: Multi-intent query execution across engines.
- `research_fetch`: SSRF-protected HTTP & headless retrieval.
- `research_extract`: Trafilatura-style HTML text & metadata extraction.
- `research_discover`: Link discovery and domain crawl.
- `research_start`: Launch autonomous deep research pipeline.
- `research_get_status`: Poll research progress.
- `research_get_report`: Retrieve synthesized Markdown report & citations.
- `research_verify_claim`: Check an assertion against web sources.
- `research_build_timeline`: Construct chronological events.
- `research_extract_entities`: Extract named entity graph.
- `research_monitor_create`: Register periodic URL/query watcher.
- `research_monitor_check`: Trigger immediate diff check.
- `research_monitor_list`: List active monitor jobs.
- `research_validate_citations`: Verify citations match retrieved sources.
