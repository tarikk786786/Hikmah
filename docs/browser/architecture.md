# Browser Intelligence Engine — Architecture

## 1. Subsystem Architecture

The Hikmah Browser Intelligence Engine (PRD 12) enforces strict layering between driver mechanics, AI semantic intent, self-healing recovery, and persistent session states:

```
                            Hikmah Agent / Web UI / MCP Tools
                                            │
                                  BrowserOrchestrator
                                            │
          ┌─────────────────────────────────┼─────────────────────────────────┐
          ▼                                 ▼                                 ▼
   SessionManager                  BrowserSecurityGuard               StagehandProvider
(Profiles, Cookies,             (SSRF Filter, Protocols,             (Semantic act, extract,
  Storage, Proxy)                  Download Quarantine)                      observe)
          │                                 │                                 │
          └─────────────────────────────────┼─────────────────────────────────┘
                                            ▼
                                  PlaywrightBrowserDriver
                                (Chromium / Firefox / WebKit /
                                  Virtual DOM Fallback)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
      DOM & A11y Tree                                             Visual Viewport
   (InteractiveElements)                                        (Screenshot Buffers)
               │                                                         │
               └────────────────────────────┬────────────────────────────┘
                                            ▼
                                    SelfHealingEngine
                               (Fuzzy Attribute / A11y /
                                Semantic Text Fallback)
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
       Universal Storage                                           Memory Router
    (Screenshots & Traces)                                      (Extracted Facts)
```

---

## 2. Decoupled Driver vs. Semantic Layer
Previous agent frameworks suffered from running multiple competing browser control loops (e.g. raw Playwright scripts fighting Stagehand automation and external crawler sessions). 

Hikmah solves this by making **`PlaywrightBrowserDriver` the single authoritative browser handle**:
- The driver owns page navigation, network interception, cookie management, viewport geometry, and element dispatch.
- `StagehandProvider` does not spawn its own browser instance; it inspects the driver's current snapshot and dispatches semantic instructions directly through the driver.
- `SelfHealingEngine` intercepts selector lookup failures at the driver boundary, evaluating alternative DOM candidates and transparently re-routing the click or input event.

---

## 3. Resilience and Fallback Mechanics
In environments where local display servers or Playwright browser binaries are not installed (such as lean serverless runtimes or CI containers), `PlaywrightBrowserDriver` gracefully switches to its **Virtual Headless Engine**:
- Navigations perform validated HTTP/HTTPS fetches with full SSRF guard protection.
- Incoming HTML is parsed into an interactive element catalog (`<button>`, `<a href>`, `<input>`, `<select>`).
- Clicks on hyperlinks advance the navigation stack; typing updates virtual form states.
- Screenshot requests produce valid PNG byte buffers satisfying image storage contracts.
