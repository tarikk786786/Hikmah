/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Stagehand Semantic Layer: Natural Language Act, Structured Schema Extract, and Interactive Observe
 */

import {
  BrowserDriver,
  SemanticActOptions,
  SemanticExtractOptions,
  SemanticObserveResult,
  SemanticObserveSuggestion,
  BrowserActionResult,
  InteractiveElement,
} from '../types.js';

export class StagehandProvider {
  constructor(private driver: BrowserDriver) {}

  /**
   * Executes a natural language instruction on the current page.
   * e.g., "click the search button", "type 'Hikmah AI' in search input", "select 'United States'"
   */
  public async act(options: SemanticActOptions): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const instruction = options.instruction.trim();
    const lower = instruction.toLowerCase();

    const snapshot = await this.driver.snapshotDOM();
    const elements = snapshot.interactiveElements;

    // 1. Identify intent: click, type, select, scroll, navigate
    try {
      if (lower.startsWith('click') || lower.includes('press ') || lower.includes('tap ')) {
        const targetQuery = lower
          .replace(/^(click|press|tap)\s+(on\s+)?(the\s+)?/, '')
          .replace(/\s+(button|link|icon|tab)$/, '')
          .trim();

        const match = this.findBestElementMatch(elements, targetQuery, ['button', 'a', 'role=button']);
        if (!match) {
          throw new Error(`Could not find interactive element matching [${targetQuery}]`);
        }

        await this.driver.click(match.selector);
        return {
          success: true,
          actionId: `act_${Date.now()}`,
          type: 'click',
          data: { matchedElement: match.selector, text: match.text },
          durationMs: Date.now() - startTime,
        };
      }

      if (lower.startsWith('type') || lower.startsWith('enter') || lower.startsWith('fill')) {
        // Extract text and target field: "type 'hello world' into search bar" or "fill name with John"
        let textToType = '';
        let targetField = '';

        const quoteMatch = instruction.match(/['"]([^'"]+)['"]/);
        if (quoteMatch) {
          textToType = quoteMatch[1];
          const rest = instruction.replace(quoteMatch[0], '');
          const intoMatch = rest.match(/(?:into|in|to)\s+(?:the\s+)?([\w\s]+)/i);
          targetField = intoMatch ? intoMatch[1].trim() : '';
        } else {
          // Heuristic parse
          const parts = instruction.split(/\s+(?:into|in|with)\s+/i);
          textToType = parts[0].replace(/^(type|enter|fill)\s+/i, '').trim();
          targetField = parts[1] || '';
        }

        const match = this.findBestElementMatch(elements, targetField, ['input', 'textarea']);
        const selector = match ? match.selector : 'input';

        await this.driver.type(selector, textToType);
        return {
          success: true,
          actionId: `act_${Date.now()}`,
          type: 'type',
          data: { typedText: textToType, selector },
          durationMs: Date.now() - startTime,
        };
      }

      if (lower.startsWith('select') || lower.startsWith('choose')) {
        const parts = instruction.split(/\s+(?:from|in)\s+/i);
        const value = parts[0].replace(/^(select|choose)\s+/i, '').replace(/['"]/g, '').trim();
        const dropdownQuery = parts[1] || '';

        const match = this.findBestElementMatch(elements, dropdownQuery, ['select']);
        const selector = match ? match.selector : 'select';

        await this.driver.select(selector, value);
        return {
          success: true,
          actionId: `act_${Date.now()}`,
          type: 'select',
          data: { selectedValue: value, selector },
          durationMs: Date.now() - startTime,
        };
      }

      if (lower.includes('scroll down') || lower.includes('scroll up')) {
        const isUp = lower.includes('up');
        await this.driver.scroll({ deltaY: isUp ? -600 : 600 });
        return {
          success: true,
          actionId: `act_${Date.now()}`,
          type: 'scroll',
          data: { direction: isUp ? 'up' : 'down' },
          durationMs: Date.now() - startTime,
        };
      }

      // Default fallback: search for clickable element by raw instruction
      const generalMatch = this.findBestElementMatch(elements, instruction, []);
      if (generalMatch) {
        await this.driver.click(generalMatch.selector);
        return {
          success: true,
          actionId: `act_${Date.now()}`,
          type: 'click',
          data: { matchedElement: generalMatch.selector, text: generalMatch.text },
          durationMs: Date.now() - startTime,
        };
      }

      throw new Error(`Unable to determine semantic action for: "${instruction}"`);
    } catch (error: any) {
      return {
        success: false,
        actionId: `act_err_${Date.now()}`,
        type: 'act_semantic',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extracts structured data matching schema from page content.
   */
  public async extract(options: SemanticExtractOptions): Promise<any> {
    const snapshot = await this.driver.snapshotDOM();
    const text = snapshot.cleanedText;

    let targetSchema: Record<string, any> = {};
    if (typeof options.schema === 'string') {
      try {
        targetSchema = JSON.parse(options.schema);
      } catch {
        targetSchema = { raw: 'string' };
      }
    } else {
      targetSchema = options.schema;
    }

    const result: Record<string, any> = {};

    // Intelligent schema extractor based on document structure and regex
    for (const key of Object.keys(targetSchema)) {
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes('title')) {
        result[key] = snapshot.title;
      } else if (lowerKey.includes('url')) {
        result[key] = snapshot.url;
      } else if (lowerKey.includes('link') || lowerKey.includes('links')) {
        result[key] = snapshot.interactiveElements
          .filter((el) => el.tag === 'a' && el.href)
          .map((el) => ({ text: el.text, href: el.href }))
          .slice(0, 10);
      } else if (lowerKey.includes('heading') || lowerKey.includes('headings')) {
        const headings = (snapshot.html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [])
          .map((h) => h.replace(/<[^>]+>/g, '').trim());
        result[key] = headings.slice(0, 8);
      } else if (lowerKey.includes('price') || lowerKey.includes('cost')) {
        const priceMatch = text.match(/\$[\d,]+(\.\d{2})?|\€[\d,]+|\£[\d,]+/);
        result[key] = priceMatch ? priceMatch[0] : null;
      } else {
        // Find sentences or segments containing key
        const regex = new RegExp(`(?:${key}[:\\s]+)([^\\n\\.\\,]+)`, 'i');
        const match = text.match(regex);
        result[key] = match ? match[1].trim() : text.slice(0, 150);
      }
    }

    return result;
  }

  /**
   * Discovers available interactive affordances on the page.
   */
  public async observe(query?: string): Promise<SemanticObserveResult> {
    const snapshot = await this.driver.snapshotDOM();
    const suggestions: SemanticObserveSuggestion[] = [];

    for (const el of snapshot.interactiveElements.slice(0, 15)) {
      if (el.tag === 'button' || el.role === 'button') {
        suggestions.push({
          description: `Click button "${el.text || el.ariaLabel || el.selector}"`,
          action: 'click',
          selector: el.selector,
          confidence: 0.95,
        });
      } else if (el.tag === 'a' && el.href) {
        suggestions.push({
          description: `Follow link to "${el.text || el.href}"`,
          action: 'click',
          selector: el.selector,
          confidence: 0.9,
          parameters: { href: el.href },
        });
      } else if (el.tag === 'input') {
        suggestions.push({
          description: `Type into ${el.placeholder ? `"${el.placeholder}"` : el.name || el.type || 'input'}`,
          action: 'type',
          selector: el.selector,
          confidence: 0.85,
        });
      } else if (el.tag === 'select') {
        suggestions.push({
          description: `Select option in dropdown "${el.name || el.selector}"`,
          action: 'select',
          selector: el.selector,
          confidence: 0.85,
        });
      }
    }

    if (query) {
      const qLower = query.toLowerCase();
      suggestions.sort((a, b) => {
        const aMatch = a.description.toLowerCase().includes(qLower);
        const bMatch = b.description.toLowerCase().includes(qLower);
        return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
      });
    }

    return {
      suggestions,
      pageContext: `URL: ${snapshot.url} | Title: ${snapshot.title} | Elements: ${snapshot.interactiveElements.length}`,
    };
  }

  private findBestElementMatch(
    elements: InteractiveElement[],
    query: string,
    preferredTags: string[]
  ): InteractiveElement | undefined {
    const cleanQuery = query.toLowerCase().trim();

    // Filter by preferred tags if specified
    const pool = preferredTags.length > 0
      ? elements.filter((el) => preferredTags.some((t) => el.tag === t || el.role === t))
      : elements;

    // 1. Exact text/label match in pool
    const exact = pool.find(
      (el) =>
        el.text.toLowerCase() === cleanQuery ||
        el.ariaLabel?.toLowerCase() === cleanQuery ||
        el.placeholder?.toLowerCase() === cleanQuery ||
        el.id?.toLowerCase() === cleanQuery
    );
    if (exact) return exact;

    // 2. Substring match in pool
    const substring = pool.find(
      (el) =>
        (el.text && el.text.toLowerCase().includes(cleanQuery)) ||
        (el.ariaLabel && el.ariaLabel.toLowerCase().includes(cleanQuery)) ||
        (el.placeholder && el.placeholder.toLowerCase().includes(cleanQuery))
    );
    if (substring) return substring;

    // 3. Fallback across all elements
    const fallback = elements.find(
      (el) =>
        (el.text && el.text.toLowerCase().includes(cleanQuery)) ||
        (el.ariaLabel && el.ariaLabel.toLowerCase().includes(cleanQuery)) ||
        (el.id && el.id.toLowerCase().includes(cleanQuery))
    );
    if (fallback) return fallback;

    // 4. Return first preferred tag element if query is empty or generic
    if (pool.length > 0 && (!cleanQuery || cleanQuery === 'input' || cleanQuery === 'button')) {
      return pool[0];
    }

    return undefined;
  }
}
