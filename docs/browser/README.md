# Hikmah — PRD 12: Browser Intelligence Engine

## 1. Overview
The **Browser Intelligence Engine** expands Hikmah from passive web querying into interactive, autonomous, and self-healing browser automation.

By decoupling the underlying browser execution driver (**Playwright**) from the high-level semantic reasoning layer (**Stagehand** and **BrowserUseAgent**), Hikmah executes both deterministic workflows (such as form submits, exact-click sequences, and network inspections) and flexible, goal-directed AI actions without multiple runtimes colliding over the same browser session.

$$\text{Session Manager} \longrightarrow \text{Playwright Driver} \longrightarrow \text{Stagehand Provider} \longrightarrow \text{Self-Healing Router} \longrightarrow \text{Storage / Memory}$$

---

## 2. Key Components
1. **Playwright Driver (`browser/core/driver/playwright-driver.ts`)**:
   - Single unified underlying execution engine.
   - Deterministic navigation, clicks, typing, form fills, dropdown selection, viewport scrolling, wait conditions, and PNG screenshot captures.
   - Resilient virtual DOM fallback ensuring seamless execution across headless containers and developer workstations.
2. **Stagehand Semantic Provider (`browser/core/semantic/stagehand-provider.ts`)**:
   - `act(instruction)`: Natural language intent execution on visible interactive DOM elements.
   - `extract(schema)`: Schema-constrained structured JSON extraction from visible text and attributes.
   - `observe(query)`: Autonomous discovery of interactive page affordances.
3. **Self-Healing Selector Engine (`browser/core/self-healing/self-healing-engine.ts`)**:
   - Multi-strategy fallback when selectors break due to dynamic UI changes:
     - Accessibility role & name matching (`aria-label`, role).
     - Fuzzy attribute and ID token heuristics.
     - Semantic visible text proximity matching.
     - Learned selector in-memory cache for instant subsequent calls.
4. **Autonomous Browser Agent (`browser/core/agent/browser-use-agent.ts`)**:
   - Multi-step goal planner and execution loop.
   - Automatic error recovery, observe-driven navigation, and structured summarization.
5. **Session & Profile Manager (`browser/core/session-manager.ts`)**:
   - Isolated browser contexts with custom user-agents, viewport geometries, cookie jars, local storage states, and proxy definitions.
6. **Security Guard (`browser/core/security/browser-guard.ts`)**:
   - SSRF protection against loopback, RFC1918 private subnets, cloud metadata endpoints (`169.254.169.254`), and protocol restrictions (`http:`, `https:`).
   - Dangerous download extension quarantine and header redaction.
7. **MCP Server (`mcp/servers/browser/server.ts`)**:
   - 16 production-grade tools registered in Hikmah's central `ToolRegistry` and `CapabilityRegistry`.
8. **Web Cockpit (`apps/web/app/browser/page.tsx`)**:
   - Interactive live viewport, DOM element table, accessibility tree viewer, Stagehand action terminal, and autonomous agent monitor.

---

## 3. Subsystem Architecture Map
```
browser/
├── core/
│   ├── types.ts                     # Domain types, interfaces & data contracts
│   ├── session-manager.ts           # Context isolation, profiles, cookies, proxies
│   ├── security/
│   │   └── browser-guard.ts         # SSRF protection, protocol enforcement & quarantine
│   ├── driver/
│   │   └── playwright-driver.ts     # Unified browser driver & virtual DOM fallback
│   ├── semantic/
│   │   └── stagehand-provider.ts    # AI-driven act, extract, and observe
│   ├── self-healing/
│   │   └── self-healing-engine.ts   # Multi-strategy selector recovery
│   ├── agent/
│   │   └── browser-use-agent.ts     # Autonomous multi-step goal execution
│   └── orchestrator.ts              # Master coordinator unifying driver, storage & memory
└── index.ts                         # Public API exports
```

---

## 4. Quick Usage Example

```typescript
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

// 1. Create an isolated session
const session = await orchestrator.createSession();

// 2. Navigate to target URL
await orchestrator.navigate(session.id, 'https://news.ycombinator.com');

// 3. Stagehand semantic action
const actResult = await orchestrator.actSemantic(session.id, {
  instruction: 'click on the first article title',
});

// 4. Capture screenshot
const { buffer } = await orchestrator.screenshot(session.id);

// 5. Close session when done
await orchestrator.closeSession(session.id);
```
