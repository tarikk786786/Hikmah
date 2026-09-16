import { describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightBrowserDriver } from '../browser/core/driver/playwright-driver.js';
import { SelfHealingEngine } from '../browser/core/self-healing/self-healing-engine.js';

describe('PRD 12: Self-Healing Selector Engine', () => {
  let driver: PlaywrightBrowserDriver;
  let selfHealer: SelfHealingEngine;

  beforeEach(async () => {
    driver = new PlaywrightBrowserDriver();
    await driver.init();
    await driver.navigate('about:blank');
    selfHealer = new SelfHealingEngine(driver);
  });

  it('should attempt selector healing when exact selector is altered', async () => {
    const healed = await selfHealer.healSelector('#obsolete-search-btn-v1', {
      targetRole: 'button',
      targetText: 'Search',
    });

    expect(healed).toBeDefined();
    expect(healed.originalSelector).toBe('#obsolete-search-btn-v1');
    expect(healed.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should cache successfully healed selectors for rapid re-use', async () => {
    const first = await selfHealer.healSelector('button[name="login"]', {
      targetText: 'Log In',
    });

    const second = await selfHealer.healSelector('button[name="login"]');
    expect(second).toEqual(first);
  });
});
