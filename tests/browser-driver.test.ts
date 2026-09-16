import { describe, it, expect, beforeEach } from 'vitest';
import { PlaywrightBrowserDriver } from '../browser/core/driver/playwright-driver.js';
import { BrowserSecurityGuard } from '../browser/core/security/browser-guard.js';

describe('PRD 12: Playwright & Virtual Browser Driver', () => {
  let driver: PlaywrightBrowserDriver;

  beforeEach(async () => {
    driver = new PlaywrightBrowserDriver({
      id: 'test-profile',
      name: 'Test Profile',
      cookies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await driver.init();
  });

  it('should initialize and navigate to about:blank', async () => {
    const res = await driver.navigate('about:blank');
    expect(res.status).toBe(200);
    expect(driver.getCurrentUrl()).toBe('about:blank');
    expect(driver.getTitle()).toBe('Blank Page');
  });

  it('should block unsafe SSRF targets and forbidden protocols', async () => {
    // Localhost
    await expect(driver.navigate('http://127.0.0.1:8080')).rejects.toThrow(/SSRF/);
    await expect(driver.navigate('http://localhost:3000')).rejects.toThrow(/SSRF/);

    // Cloud metadata
    await expect(driver.navigate('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/SSRF/);

    // Forbidden protocol
    await expect(driver.navigate('file:///etc/passwd')).rejects.toThrow(/Disallowed browser protocol/);
    await expect(driver.navigate('javascript:alert(1)')).rejects.toThrow(/Disallowed browser protocol/);
  });

  it('should capture valid screenshot byte buffers', async () => {
    const buffer = await driver.screenshot();
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });

  it('should extract clean DOM snapshot and interactive elements', async () => {
    const snapshot = await driver.snapshotDOM();
    expect(snapshot).toBeDefined();
    expect(snapshot.url).toBe('about:blank');
    expect(snapshot.html).toContain('html');
    expect(Array.isArray(snapshot.interactiveElements)).toBe(true);
  });

  it('should extract accessibility tree with roles and names', async () => {
    const a11y = await driver.extractAccessibilityTree();
    expect(a11y).toBeDefined();
    expect(a11y.role).toBe('WebArea');
    expect(a11y.children).toBeDefined();
  });

  it('should support typing, form filling, and select operations', async () => {
    await driver.type('#search-input', 'Hikmah OS');
    await driver.fillForm({
      '#username': 'agent_operator',
      '#email': 'agent@hikmah.os',
    });
    await driver.select('#country-dropdown', 'US');

    expect(driver.getCurrentUrl()).toBe('about:blank');
  });
});
