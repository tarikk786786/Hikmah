# Crawling & Discovery Engine

Hikmah balances lightweight single-page fetching with deep multi-hop traversal through the `DiscoveryEngine` and `FetchRouter`.

---

## 1. Discovery Pipeline

When operating in `DEEP` or `INVESTIGATION` mode:
1. **Target Landing Extraction**: Top search result URLs are parsed.
2. **Link Enumeration**: Internal links pointing to sub-articles, references, or documentation chapters are harvested.
3. **Robots.txt Respect**: Queries robots.txt and sitemap.xml endpoints to respect site owner crawl directives.
4. **Depth Throttling**: Limits crawl depth to 2 hops (DEEP) or 3 hops (INVESTIGATION) to avoid infinite loops and token bloat.

---

## 2. Fetch Protocols

- **Lightweight HTTP (`HttpFetcher`)**: Directly fetches raw HTML for static pages and blogs.
- **Scrapling (`ScraplingProvider`)**: Robust anti-bot bypass with stealth headers.
- **Playwright Worker (`PlaywrightWorkerFetchProvider`)**: Full headless Chromium rendering for client-side SPAs requiring JavaScript hydration.
