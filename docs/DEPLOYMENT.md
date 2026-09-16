# HIKMAH — Production Deployment Architecture & Operations

## Overview

Hikmah uses a modern, resilient multi-tier deployment architecture:
1. **Frontend & API Gateway (Vercel / Node.js Server)**:
   - Houses the Next.js UI, PAIOS Desktop Cockpit HUD (`/paios`), and REST APIs (`/api/*`).
   - Serves liveness probe (`/health`) and readiness probe (`/ready`).
2. **Database & Storage (Supabase PostgreSQL + pgvector)**:
   - 13 migration files providing tables for profiles, devices, projects, sessions, memory, tasks, skills, and plugins.
   - Strict Row Level Security (RLS) policies.
3. **Queue & Durable Workers (Render / Docker / Upstash Redis)**:
   - Long-running asynchronous execution for Browser automation, Research pipelines, and Multi-Agent tasks.
4. **Local / Self-Hosted AI Fallbacks**:
   - Hardware-aware local inference via Ollama / vLLM when privacy mode is set to `private`, `offline`, or `air-gapped`.

---

## Deployment Steps

### 1. Build Verification
```bash
npm install
node scratch/build-web.mjs
```

### 2. Database Migrations
Apply all migrations in `supabase/migrations/`:
```bash
npx supabase db push
```

### 3. Production Health Verification
Run the automated smoke test harness:
```bash
node scripts/smoke-prod.mjs
```
Expected output:
```text
✓ [PASS] Root Production Health (/health) — 200 OK
✓ [PASS] Root Production Readiness (/ready) — 200 OK
✓ [PASS] API Canonical Health (/api/health) — 200 OK
✓ [PASS] PAIOS Kernel Status (/api/paios/status) — 200 OK
...
All production smoke endpoints passed successfully!
```
