/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Self-Healing Selector Engine: Multi-Strategy Selector Recovery (A11y, Text Semantics, Attribute Fuzzy Matching)
 */

import {
  BrowserDriver,
  SelfHealingSelector,
  SelectorHealStrategy,
  DOMSnapshot,
  InteractiveElement,
} from '../types.js';

export class SelfHealingEngine {
  // In-memory cache of learned healed selectors: originalSelector -> healed
  private healedCache = new Map<string, SelfHealingSelector>();

  constructor(private driver: BrowserDriver) {}

  /**
   * Attempts to heal a broken selector using multi-strategy fallbacks.
   */
  public async healSelector(
    originalSelector: string,
    hints?: {
      targetText?: string;
      targetRole?: string;
      targetAriaLabel?: string;
    }
  ): Promise<SelfHealingSelector> {
    // 1. Check cache first
    const cached = this.healedCache.get(originalSelector);
    if (cached && cached.confidence > 0.8) {
      return cached;
    }

    const snapshot = await this.driver.snapshotDOM();
    const elements = snapshot.interactiveElements;

    // Strategy 1: Fuzzy Attribute & ID parsing from original selector
    const attrMatch = this.healByAttributeHeuristics(elements, originalSelector);
    if (attrMatch) {
      const result: SelfHealingSelector = {
        originalSelector,
        targetText: attrMatch.text,
        targetRole: attrMatch.role,
        healedSelector: attrMatch.selector,
        confidence: 0.9,
        strategyUsed: 'attribute_fuzzy',
      };
      this.healedCache.set(originalSelector, result);
      return result;
    }

    // Strategy 2: Accessibility Role & Name matching
    if (hints?.targetRole || hints?.targetAriaLabel) {
      const a11yMatch = elements.find((el) => {
        const roleMatches = !hints.targetRole || el.role?.toLowerCase() === hints.targetRole.toLowerCase();
        const ariaMatches =
          !hints.targetAriaLabel ||
          el.ariaLabel?.toLowerCase().includes(hints.targetAriaLabel.toLowerCase());
        return roleMatches && ariaMatches;
      });

      if (a11yMatch) {
        const result: SelfHealingSelector = {
          originalSelector,
          targetText: a11yMatch.text,
          targetRole: a11yMatch.role,
          targetAriaLabel: a11yMatch.ariaLabel,
          healedSelector: a11yMatch.selector,
          confidence: 0.88,
          strategyUsed: 'a11y_role_name',
        };
        this.healedCache.set(originalSelector, result);
        return result;
      }
    }

    // Strategy 3: Semantic Text Match
    const targetText = hints?.targetText || this.extractTextFromSelector(originalSelector);
    if (targetText) {
      const textMatch = elements.find(
        (el) =>
          el.text &&
          (el.text.toLowerCase().includes(targetText.toLowerCase()) ||
            targetText.toLowerCase().includes(el.text.toLowerCase()))
      );

      if (textMatch) {
        const result: SelfHealingSelector = {
          originalSelector,
          targetText: textMatch.text,
          healedSelector: textMatch.selector,
          confidence: 0.85,
          strategyUsed: 'semantic_text',
        };
        this.healedCache.set(originalSelector, result);
        return result;
      }
    }

    // Strategy 4: Tag-based nearest fallback
    const tag = this.extractTagFromSelector(originalSelector);
    if (tag) {
      const tagMatch = elements.find((el) => el.tag.toLowerCase() === tag.toLowerCase());
      if (tagMatch) {
        const result: SelfHealingSelector = {
          originalSelector,
          healedSelector: tagMatch.selector,
          confidence: 0.7,
          strategyUsed: 'attribute_fuzzy',
        };
        this.healedCache.set(originalSelector, result);
        return result;
      }
    }

    // Unable to heal
    return {
      originalSelector,
      confidence: 0,
      healedSelector: originalSelector,
    };
  }

  /**
   * Executes a click using self-healing if original selector fails.
   */
  public async resilientClick(
    selector: string,
    hints?: { targetText?: string; targetRole?: string; targetAriaLabel?: string }
  ): Promise<{ healed: boolean; finalSelector: string }> {
    try {
      await this.driver.click(selector, { timeoutMs: 2500 });
      return { healed: false, finalSelector: selector };
    } catch {
      // Primary failed, initiate healing
      const healed = await this.healSelector(selector, hints);
      if (healed.healedSelector && healed.healedSelector !== selector) {
        await this.driver.click(healed.healedSelector);
        return { healed: true, finalSelector: healed.healedSelector };
      }
      throw new Error(`Selector [${selector}] failed and could not be self-healed`);
    }
  }

  private healByAttributeHeuristics(
    elements: InteractiveElement[],
    selector: string
  ): InteractiveElement | undefined {
    // Extract potential ID or class name keywords from selector
    const clean = selector.replace(/[#\.\-_\[\]"']/g, ' ').trim();
    const tokens = clean.split(/\s+/).filter((t) => t.length > 2);

    for (const el of elements) {
      for (const token of tokens) {
        const lowerToken = token.toLowerCase();
        if (
          (el.id && el.id.toLowerCase().includes(lowerToken)) ||
          (el.name && el.name.toLowerCase().includes(lowerToken)) ||
          (el.placeholder && el.placeholder.toLowerCase().includes(lowerToken)) ||
          (el.ariaLabel && el.ariaLabel.toLowerCase().includes(lowerToken)) ||
          (el.text && el.text.toLowerCase().includes(lowerToken))
        ) {
          return el;
        }
      }
    }
    return undefined;
  }

  private extractTextFromSelector(selector: string): string | undefined {
    const textMatch = selector.match(/text=['"]?([^'"]+)['"]?/i);
    if (textMatch) return textMatch[1];
    const containsMatch = selector.match(/:contains\(['"]?([^'"]+)['"]?\)/i);
    if (containsMatch) return containsMatch[1];
    return undefined;
  }

  private extractTagFromSelector(selector: string): string | undefined {
    const match = selector.match(/^([a-zA-Z0-9]+)/);
    return match ? match[1] : undefined;
  }
}
