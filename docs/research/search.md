# Search Engine Routing & Providers

Hikmah routes queries across multiple specialized search providers without hardcoding a single upstream engine.

---

## 1. Supported Search Providers

1. **SearXNG (`SearXNGSearchProvider`)**:
   - Primary provider aggregating Google, Bing, DuckDuckGo, Brave, and Startpage.
   - Privacy-preserving, zero tracking cookies or fingerprinting.
   - Configured via `SEARXNG_URL`.

2. **Academic Search (`AcademicSearchProvider`)**:
   - Queries OpenAlex, arXiv, Semantic Scholar, and PubMed.
   - Returns structured papers with authors, publication dates, abstracts, and DOIs.

3. **GitHub Search (`GitHubSearchProvider`)**:
   - Queries code repositories, commits, issues, and discussions.
   - Returns repository descriptions, star counts, and licensing metadata.

4. **Historical Archive (`HistoricalSearchProvider`)**:
   - Queries the Wayback Machine (Internet Archive) for point-in-time snapshots of altered or deleted web content.

---

## 2. Intent-Based Query Planning

The `QueryPlanner` inspects the user question and maps it to target search intents:
- `GENERAL`: Broader web search.
- `NEWS`: Chronological articles published in the last 7 days.
- `ACADEMIC`: Peer-reviewed papers, scientific studies, and research publications.
- `TECHNICAL`: Documentation, RFCs, specifications, and code repositories.
- `HISTORICAL`: Historical revisions and archived versions.
