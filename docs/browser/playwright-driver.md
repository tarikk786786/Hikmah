# Playwright Browser Driver Reference

## 1. Responsibilities
The `PlaywrightBrowserDriver` provides deterministic automation primitives:
- Navigation: `navigate(url, options)` with wait conditions (`domcontentloaded`, `load`, `networkidle`).
- Keystroke & Form interactions: `type(selector, text)`, `fillForm(fields)`, `select(selector, value)`.
- Element clicks: `click(selector, options)`.
- Viewport scrolling: `scroll({ deltaX, deltaY, selector })`.
- Synchronization: `waitFor(selectorOrTimeout, options)`.
- Visual capture: `screenshot(options)` returning PNG byte buffers.
- State inspection: `snapshotDOM()`, `extractAccessibilityTree()`, `evaluate(script)`.

---

## 2. API Contract

```typescript
export interface BrowserDriver {
  navigate(url: string, options?: { timeoutMs?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<{ url: string; title: string; status: number }>;
  click(selector: string, options?: { timeoutMs?: number; clickCount?: number }): Promise<void>;
  type(selector: string, text: string, options?: { delayMs?: number; clearFirst?: boolean }): Promise<void>;
  fillForm(fields: Record<string, string>): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  scroll(options: { deltaX?: number; deltaY?: number; selector?: string }): Promise<void>;
  waitFor(selectorOrTimeout: string | number, options?: { state?: 'attached' | 'visible' | 'hidden'; timeoutMs?: number }): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  snapshotDOM(): Promise<DOMSnapshot>;
  extractAccessibilityTree(): Promise<AccessibilityNode>;
  evaluate<T = any>(script: string, arg?: any): Promise<T>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  getCookies(): Promise<BrowserCookie[]>;
  setCookies(cookies: BrowserCookie[]): Promise<void>;
  close(): Promise<void>;
  getCurrentUrl(): string;
  getTitle(): string;
}
```

---

## 3. History & Cookie Isolation
Each driver instance maintains an isolated session history stack and cookie jar. Sessions do not cross-contaminate cookies, allowing simultaneous operations under different authenticated identities.
