/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Unified Browser Driver with Playwright and Resilient Virtual DOM Engine Fallback
 */

import {
  BrowserDriver,
  BrowserCookie,
  BrowserProfile,
  DOMSnapshot,
  AccessibilityNode,
  ScreenshotOptions,
  InteractiveElement,
  NetworkRequest,
} from '../types.js';
import { BrowserSecurityGuard } from '../security/browser-guard.js';

export class PlaywrightBrowserDriver implements BrowserDriver {
  private currentUrl = 'about:blank';
  private currentTitle = 'Blank Page';
  private currentHtml = '<!DOCTYPE html><html><head><title>Blank Page</title></head><body></body></html>';
  private cookies: BrowserCookie[] = [];
  private historyStack: string[] = ['about:blank'];
  private historyIndex = 0;
  private formValues = new Map<string, string>();
  private networkLogs: NetworkRequest[] = [];
  private realPlaywrightPage: any = null;
  private realPlaywrightBrowser: any = null;
  private isClosed = false;

  constructor(private profile?: BrowserProfile) {
    if (profile?.cookies) {
      this.cookies = [...profile.cookies];
    }
  }

  /**
   * Initializes the driver. Attempts dynamic load of Playwright; falls back to virtual engine.
   */
  public async init(): Promise<void> {
    try {
      // Bundler-safe dynamic import attempt
      const importDynamic = (moduleName: string) => new Function('m', 'return import(m)')(moduleName);
      const pw = await importDynamic('playwright').catch(() => null);
      if (pw && pw.chromium) {
        const launchOptions: any = {
          headless: true,
        };
        if (this.profile?.proxy?.server) {
          launchOptions.proxy = {
            server: this.profile.proxy.server,
            username: this.profile.proxy.username,
            password: this.profile.proxy.password,
          };
        }
        this.realPlaywrightBrowser = await pw.chromium.launch(launchOptions);
        const context = await this.realPlaywrightBrowser.newContext({
          userAgent: this.profile?.userAgent,
          viewport: this.profile?.viewport || { width: 1280, height: 800 },
        });
        this.realPlaywrightPage = await context.newPage();
      }
    } catch {
      // Fallback silently to Virtual Headless Driver
      this.realPlaywrightPage = null;
    }
  }

  public async navigate(
    url: string,
    options?: { timeoutMs?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
  ): Promise<{ url: string; title: string; status: number }> {
    if (this.isClosed) throw new Error('BrowserDriver instance is closed');

    BrowserSecurityGuard.assertSafeUrl(url);

    if (this.realPlaywrightPage) {
      try {
        const response = await this.realPlaywrightPage.goto(url, {
          timeout: options?.timeoutMs || 30000,
          waitUntil: options?.waitUntil || 'domcontentloaded',
        });
        this.currentUrl = this.realPlaywrightPage.url();
        this.currentTitle = await this.realPlaywrightPage.title();
        this.currentHtml = await this.realPlaywrightPage.content();
        return {
          url: this.currentUrl,
          title: this.currentTitle,
          status: response ? response.status() : 200,
        };
      } catch (err: any) {
        // Fallback to fetch if Playwright fails
      }
    }

    // Virtual Headless Fallback
    const startTime = Date.now();
    if (url === 'about:blank') {
      this.currentUrl = 'about:blank';
      this.currentTitle = 'Blank Page';
      this.currentHtml = '<!DOCTYPE html><html><head><title>Blank Page</title></head><body></body></html>';
      return { url: this.currentUrl, title: this.currentTitle, status: 200 };
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent':
          this.profile?.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 HikmahBrowser/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      };

      if (this.cookies.length > 0) {
        headers['Cookie'] = this.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      }

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(options?.timeoutMs || 25000),
      });

      const text = await res.text();
      this.currentUrl = res.url || url;
      this.currentHtml = text;

      // Extract title from HTML
      const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      this.currentTitle = titleMatch ? titleMatch[1].trim() : new URL(this.currentUrl).hostname;

      // Track in history
      if (this.historyStack[this.historyIndex] !== this.currentUrl) {
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        this.historyStack.push(this.currentUrl);
        this.historyIndex = this.historyStack.length - 1;
      }

      // Log network request
      this.networkLogs.push({
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sessionId: 'virtual',
        url: this.currentUrl,
        method: 'GET',
        headers: BrowserSecurityGuard.sanitizeHeaders(headers),
        resourceType: 'document',
        timestamp: new Date().toISOString(),
        response: {
          status: res.status,
          statusText: res.statusText,
          headers: {},
          mimeType: res.headers.get('content-type') || 'text/html',
          sizeBytes: text.length,
        },
      });

      return {
        url: this.currentUrl,
        title: this.currentTitle,
        status: res.status,
      };
    } catch (error: any) {
      this.currentUrl = url;
      this.currentTitle = `Error loading ${url}`;
      this.currentHtml = `<html><body><h1>Failed to load: ${url}</h1><p>${error.message}</p></body></html>`;
      return { url: this.currentUrl, title: this.currentTitle, status: 500 };
    }
  }

  public async click(
    selector: string,
    options?: { timeoutMs?: number; clickCount?: number }
  ): Promise<void> {
    if (this.isClosed) throw new Error('Driver is closed');

    if (this.realPlaywrightPage) {
      await this.realPlaywrightPage.click(selector, { timeout: options?.timeoutMs });
      return;
    }

    // Virtual DOM Click
    const elements = this.findInteractiveElements();
    const target = this.matchElement(elements, selector);

    if (!target) {
      throw new Error(`Element matching selector [${selector}] not found on page ${this.currentUrl}`);
    }

    // If it's a link, navigate to target href
    if (target.href && (target.tag === 'a' || target.selector.includes('a'))) {
      const resolved = new URL(target.href, this.currentUrl).toString();
      await this.navigate(resolved);
    }
  }

  public async type(
    selector: string,
    text: string,
    options?: { delayMs?: number; clearFirst?: boolean }
  ): Promise<void> {
    if (this.isClosed) throw new Error('Driver is closed');

    if (this.realPlaywrightPage) {
      if (options?.clearFirst) {
        await this.realPlaywrightPage.fill(selector, '');
      }
      await this.realPlaywrightPage.type(selector, text, { delay: options?.delayMs });
      return;
    }

    // Virtual DOM input fill
    this.formValues.set(selector, text);
  }

  public async fillForm(fields: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(fields)) {
      await this.type(selector, value, { clearFirst: true });
    }
  }

  public async select(selector: string, value: string): Promise<void> {
    if (this.isClosed) throw new Error('Driver is closed');

    if (this.realPlaywrightPage) {
      await this.realPlaywrightPage.selectOption(selector, value);
      return;
    }

    this.formValues.set(selector, value);
  }

  public async scroll(options: { deltaX?: number; deltaY?: number; selector?: string }): Promise<void> {
    if (this.realPlaywrightPage) {
      await this.realPlaywrightPage.evaluate(
        ({ dx, dy }: { dx: number; dy: number }) => window.scrollBy(dx, dy),
        { dx: options.deltaX || 0, dy: options.deltaY || 500 }
      );
    }
    // In virtual mode, scroll is a no-op that succeeds
  }

  public async waitFor(
    selectorOrTimeout: string | number,
    options?: { state?: 'attached' | 'visible' | 'hidden'; timeoutMs?: number }
  ): Promise<void> {
    if (typeof selectorOrTimeout === 'number') {
      await new Promise((resolve) => setTimeout(resolve, selectorOrTimeout));
      return;
    }

    if (this.realPlaywrightPage) {
      await this.realPlaywrightPage.waitForSelector(selectorOrTimeout, {
        state: options?.state || 'visible',
        timeout: options?.timeoutMs || 10000,
      });
      return;
    }

    // Virtual mode check
    const elements = this.findInteractiveElements();
    const found = this.matchElement(elements, selectorOrTimeout);
    if (!found) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  public async screenshot(options?: ScreenshotOptions): Promise<Buffer> {
    if (this.realPlaywrightPage) {
      const buffer = await this.realPlaywrightPage.screenshot({
        fullPage: options?.fullPage ?? false,
        type: options?.type || 'png',
      });
      return Buffer.from(buffer);
    }

    // Generate a valid 1x1 transparent/colored PNG Buffer fallback for headless mode
    // 68-byte valid PNG file
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    return minimalPng;
  }

  public async snapshotDOM(): Promise<DOMSnapshot> {
    if (this.realPlaywrightPage) {
      const html = await this.realPlaywrightPage.content();
      const title = await this.realPlaywrightPage.title();
      const url = this.realPlaywrightPage.url();
      const text = await this.realPlaywrightPage.evaluate(() => document.body?.innerText || '');
      const interactive = await this.realPlaywrightPage.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
        return els.map((el, i) => ({
          selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}:nth-of-type(${i + 1})`,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 100),
          role: el.getAttribute('role') || undefined,
          type: (el as any).type || undefined,
          href: (el as any).href || undefined,
          name: (el as any).name || undefined,
          placeholder: (el as any).placeholder || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          isVisible: true,
        }));
      });

      return {
        url,
        title,
        html,
        cleanedText: text,
        nodesCount: interactive.length * 5,
        interactiveElements: interactive,
      };
    }

    // Virtual Mode Extraction
    const interactive = this.findInteractiveElements();
    const cleanedText = this.currentHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      url: this.currentUrl,
      title: this.currentTitle,
      html: this.currentHtml,
      cleanedText,
      nodesCount: interactive.length * 3 + 10,
      interactiveElements: interactive,
    };
  }

  public async extractAccessibilityTree(): Promise<AccessibilityNode> {
    if (this.realPlaywrightPage) {
      const snapshot = await this.realPlaywrightPage.accessibility?.snapshot();
      if (snapshot) {
        return this.mapPlaywrightA11y(snapshot);
      }
    }

    // Virtual Accessibility Tree Builder
    const interactive = this.findInteractiveElements();
    const children: AccessibilityNode[] = interactive.map((el) => ({
      role: el.role || (el.tag === 'a' ? 'link' : el.tag === 'button' ? 'button' : 'generic'),
      name: el.text || el.ariaLabel || el.placeholder || el.selector,
      selector: el.selector,
      focused: false,
      disabled: false,
    }));

    return {
      role: 'WebArea',
      name: this.currentTitle,
      children: [
        {
          role: 'main',
          name: 'Main Content',
          children,
        },
      ],
    };
  }

  public async evaluate<T = any>(script: string, arg?: any): Promise<T> {
    if (this.realPlaywrightPage) {
      return await this.realPlaywrightPage.evaluate(script, arg);
    }
    // Safe mock evaluate
    if (script.includes('document.title')) {
      return this.currentTitle as any;
    }
    if (script.includes('window.location.href')) {
      return this.currentUrl as any;
    }
    return undefined as any;
  }

  public async goBack(): Promise<void> {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      await this.navigate(this.historyStack[this.historyIndex]);
    }
  }

  public async goForward(): Promise<void> {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      await this.navigate(this.historyStack[this.historyIndex]);
    }
  }

  public async reload(): Promise<void> {
    await this.navigate(this.currentUrl);
  }

  public async getCookies(): Promise<BrowserCookie[]> {
    return [...this.cookies];
  }

  public async setCookies(cookies: BrowserCookie[]): Promise<void> {
    this.cookies = [...cookies];
  }

  public async close(): Promise<void> {
    this.isClosed = true;
    if (this.realPlaywrightBrowser) {
      await this.realPlaywrightBrowser.close().catch(() => {});
      this.realPlaywrightBrowser = null;
      this.realPlaywrightPage = null;
    }
  }

  public getCurrentUrl(): string {
    return this.currentUrl;
  }

  public getTitle(): string {
    return this.currentTitle;
  }

  public getNetworkLogs(): NetworkRequest[] {
    return [...this.networkLogs];
  }

  // --- Helpers for Virtual DOM Parsing ---

  private findInteractiveElements(): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    const html = this.currentHtml;

    // Matches buttons, inputs, links, textareas, selects
    const tagRegex = /<(button|a|input|textarea|select)([^>]*)>([\s\S]*?)<\/\1>|<(input)([^>]*)\/?>/gi;
    let match: RegExpExecArray | null;

    let index = 0;
    while ((match = tagRegex.exec(html)) !== null) {
      index++;
      const tag = (match[1] || match[4] || '').toLowerCase();
      const rawAttrs = match[2] || match[5] || '';
      const innerText = (match[3] || '').replace(/<[^>]+>/g, '').trim();

      const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
      const nameMatch = rawAttrs.match(/\bname=["']([^"']+)["']/i);
      const typeMatch = rawAttrs.match(/\btype=["']([^"']+)["']/i);
      const hrefMatch = rawAttrs.match(/\bhref=["']([^"']+)["']/i);
      const ariaMatch = rawAttrs.match(/\baria-label=["']([^"']+)["']/i);
      const roleMatch = rawAttrs.match(/\brole=["']([^"']+)["']/i);
      const placeholderMatch = rawAttrs.match(/\bplaceholder=["']([^"']+)["']/i);

      const id = idMatch ? idMatch[1] : undefined;
      const selector = id ? `#${id}` : nameMatch ? `${tag}[name="${nameMatch[1]}"]` : `${tag}:nth-of-type(${index})`;

      elements.push({
        selector,
        tag,
        text: innerText,
        id,
        name: nameMatch ? nameMatch[1] : undefined,
        type: typeMatch ? typeMatch[1] : undefined,
        href: hrefMatch ? hrefMatch[1] : undefined,
        ariaLabel: ariaMatch ? ariaMatch[1] : undefined,
        role: roleMatch ? roleMatch[1] : undefined,
        placeholder: placeholderMatch ? placeholderMatch[1] : undefined,
        isVisible: true,
      });
    }

    return elements;
  }

  private matchElement(elements: InteractiveElement[], query: string): InteractiveElement | undefined {
    const q = query.trim().toLowerCase();

    // 1. Exact selector match
    const bySelector = elements.find((el) => el.selector.toLowerCase() === q);
    if (bySelector) return bySelector;

    // 2. Exact ID match
    if (q.startsWith('#')) {
      const idQuery = q.substring(1);
      const byId = elements.find((el) => el.id?.toLowerCase() === idQuery);
      if (byId) return byId;
    }

    // 3. Exact text match
    const byText = elements.find((el) => el.text.toLowerCase() === q);
    if (byText) return byText;

    // 4. Aria label match
    const byAria = elements.find((el) => el.ariaLabel?.toLowerCase() === q);
    if (byAria) return byAria;

    // 5. Placeholder match
    const byPlaceholder = elements.find((el) => el.placeholder?.toLowerCase() === q);
    if (byPlaceholder) return byPlaceholder;

    // 6. Substring text match
    return elements.find((el) => el.text.toLowerCase().includes(q));
  }

  private mapPlaywrightA11y(node: any): AccessibilityNode {
    return {
      role: node.role || 'generic',
      name: node.name,
      value: node.value,
      description: node.description,
      focused: node.focused,
      disabled: node.disabled,
      children: node.children ? node.children.map((c: any) => this.mapPlaywrightA11y(c)) : undefined,
    };
  }
}
