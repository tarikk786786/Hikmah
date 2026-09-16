import { describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightBrowserDriver } from '../browser/core/driver/playwright-driver.js';
import { StagehandProvider } from '../browser/core/semantic/stagehand-provider.js';

describe('PRD 12: Stagehand Semantic Provider (Act, Extract, Observe)', () => {
  let driver: PlaywrightBrowserDriver;
  let stagehand: StagehandProvider;

  beforeEach(async () => {
    driver = new PlaywrightBrowserDriver();
    await driver.init();
    await driver.navigate('about:blank');
    stagehand = new StagehandProvider(driver);
  });

  it('should parse and execute natural language typing intent', async () => {
    const actResult = await stagehand.act({
      instruction: "type 'Hikmah OS Browser Intelligence' into search",
    });

    expect(actResult.success).toBe(true);
    expect(actResult.type).toBe('type');
    expect(actResult.data.typedText).toBe('Hikmah OS Browser Intelligence');
  });

  it('should parse and execute scroll intent', async () => {
    const scrollResult = await stagehand.act({
      instruction: 'scroll down',
    });

    expect(scrollResult.success).toBe(true);
    expect(scrollResult.type).toBe('scroll');
    expect(scrollResult.data.direction).toBe('down');
  });

  it('should extract structured data adhering to a requested schema', async () => {
    const extracted = await stagehand.extract({
      schema: {
        title: 'string',
        url: 'string',
      },
    });

    expect(extracted).toBeDefined();
    expect(extracted.title).toBe('Blank Page');
    expect(extracted.url).toBe('about:blank');
  });

  it('should observe and recommend interactive affordances', async () => {
    const observation = await stagehand.observe();
    expect(observation).toBeDefined();
    expect(observation.pageContext).toContain('about:blank');
    expect(Array.isArray(observation.suggestions)).toBe(true);
  });
});
