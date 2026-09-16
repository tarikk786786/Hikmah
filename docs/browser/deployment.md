# Browser Intelligence Engine — Deployment & Operations

## 1. Environment Configuration
The Browser Intelligence Engine works out-of-the-box in both lightweight serverless environments (via Virtual Headless Engine) and full production worker nodes (with Playwright browser binaries):

```bash
# Optional: Install Playwright and browser binaries for full Chromium rendering
npx playwright install --with-deps chromium
```

---

## 2. Worker Configuration Variables
Configure runtime options in `.env.local`:
```ini
# Browser Intelligence Options
HIKMAH_BROWSER_HEADLESS=true
HIKMAH_BROWSER_DEFAULT_TIMEOUT_MS=30000
HIKMAH_BROWSER_MAX_CONCURRENT_SESSIONS=10
HIKMAH_BROWSER_ENABLE_SELF_HEALING=true
```

---

## 3. Production Hardening
- Run browser worker tasks inside isolated containers or separate background worker processes (`workers/agent-worker`).
- Restrict outbound container egress using network security groups, allowing only target web research domains.
- Enforce automated session cleanup routines to purge idle sessions and reclaim system RAM.
