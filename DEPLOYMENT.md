# J.A.R.V.I.S. — Free-First Deployment Guide

## 1. Free-First Target Architecture
JARVIS is designed to maximize capability on free / low-cost tiers:

| Provider | Role | Free Tier Fit |
| :--- | :--- | :--- |
| **Vercel** | Next.js UI & API Gateway | Serverless functions for lightweight, streaming endpoints |
| **Supabase** | PostgreSQL, Auth, Storage, pgvector | Free 500MB DB with native vector extension |
| **Upstash / Redis** | Distributed Task Queue | Free serverless Redis with low-latency job persistence |
| **Render** | Asynchronous Docker Workers | Background jobs, Playwright browser runs, deep research |
| **GitHub** | CI/CD & Source Control | Free GitHub Actions runners |

---

## 2. Step-by-Step Deployment Instructions

### A. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and execute:
   ```sql
   -- Run contents of supabase/migrations/20260915000000_initial_schema.sql
   -- Run contents of supabase/seed/seed.sql
   ```
3. Copy your project URL, anon key, and service role key into `.env`.

### B. Vercel Deployment (UI & API Gateway)
1. Push repository to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Set root directory to `apps/web`.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
   - `OPENAI_API_KEY` (or Anthropic / Gemini keys)
5. Deploy.

### C. Render Background Worker Deployment
1. Log in to [Render](https://render.com).
2. Create a **New Background Worker**.
3. Connect your GitHub repository.
4. Set Environment to **Docker** (using `workers/Dockerfile`).
5. Configure Environment Variables (`REDIS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`).
6. Deploy.

---

### D. Multi-Engine Memory Router Configuration (PRD 08A)
The Memory Router operates out-of-the-box using the built-in **Native Supabase + pgvector** engine. Optional specialized backends can be activated at zero code changes by providing their endpoints:
- `MEM0_API_KEY` / `MEM0_ENDPOINT`: User preferences and identity memory.
- `GRAPHITI_ENDPOINT`: Temporal memory and validity window tracking.
- `LETTA_ENDPOINT`: Stateful agent working memory and MemFS blocks.
- `COGNEE_ENDPOINT`: Knowledge graph entity and relationship extraction.
- `LANGMEM_ENDPOINT`: Procedural learning and user correction patterns.
- `SUPERMEMORY_API_KEY` / `SUPERMEMORY_ENDPOINT`: Large-scale document chunking and PDF research.

---

### E. Universal Storage Engine Configuration (PRD 10)
Universal Storage supports multi-tier persistence out of the box:
- `STORAGE_MASTER_KEY`: 32-byte hexadecimal key for AES-256-GCM envelope encryption.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_STORAGE_CHAT_ID`: TG-S3/MTProto zero-cost cold storage.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: Cloudflare R2 / AWS S3 / MinIO.

---

### F. Universal Web Research Engine Configuration (PRD 11)
The research pipeline operates with zero external dependencies in local/simulated mode. For full production capabilities:
- `SEARXNG_URL`: URL to self-hosted or public SearXNG instance for multi-engine searches.
- `OPENALEX_API_KEY`: Polite pool key for high-throughput academic literature querying.
- `GITHUB_TOKEN`: Personal access token for repository and source research.
- `FIRECRAWL_API_KEY`: Optional cloud web scraping API.
- `CRAWL4AI_URL`: Optional self-hosted Crawl4AI rendering instance.

---

### G. Browser Intelligence Engine Configuration (PRD 12)
The Browser Intelligence subsystem operates out-of-the-box with a high-fidelity virtual DOM engine. For full headless Chromium/Firefox/WebKit rendering:
```bash
# Install Playwright browser binaries
npx playwright install --with-deps chromium
```
Environment variables:
- `HIKMAH_BROWSER_HEADLESS`: Defaults to `true`.
- `HIKMAH_BROWSER_DEFAULT_TIMEOUT_MS`: Max timeout for navigation and selectors (default: `30000`).
- `HIKMAH_BROWSER_MAX_CONCURRENT_SESSIONS`: Pool limit for concurrent browser tabs (default: `10`).
- `HIKMAH_BROWSER_ENABLE_SELF_HEALING`: Toggles automatic selector recovery (default: `true`).


