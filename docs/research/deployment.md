# Research Subsystem Deployment

This document covers deploying Hikmah's research pipeline across serverless environments and Docker background workers.

---

## 1. Split-Architecture Deployment

1. **Vercel Control Plane (Serverless)**:
   - Hosts Next.js App Router UI (`/research`).
   - Hosts REST API routes (`/api/research/*`).
   - Executes `QUICK` and `STANDARD` research jobs within 15-45s function limits.
   - Enforces SSRF defense and citation verification.

2. **Background Worker (Docker / Render)**:
   - Hosts `Playwright` headless browser instances for heavy JavaScript rendering.
   - Executes `DEEP` and `INVESTIGATION` crawl jobs exceeding 60 seconds.
   - Dispatches jobs via Redis `TaskQueue` from PRD 06.
