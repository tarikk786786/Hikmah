# Provider Configuration & Environment Variables

Hikmah allows operators to plug in various search and scraping providers via simple environment variables.

---

## 1. Environment Configuration

| Variable | Provider | Purpose |
| :--- | :--- | :--- |
| `SEARXNG_URL` | SearXNG | URL of self-hosted or public SearXNG instance. |
| `OPENALEX_API_KEY` | OpenAlex | Optional key for polite pool higher rate limits. |
| `GITHUB_TOKEN` | GitHub | Personal access token for repository and code searches. |
| `FIRECRAWL_API_KEY` | Firecrawl | Optional cloud web scraping API key. |
| `CRAWL4AI_URL` | Crawl4AI | Optional self-hosted Crawl4AI microservice endpoint. |

---

## 2. Zero-Configuration Fallback

If no external API keys or search endpoints are set:
- Built-in public HTTP search and scraping adapters execute automatically.
- Simulated high-fidelity providers respond in test/development environments.
