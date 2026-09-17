import { describe, it, expect } from 'vitest';
import { HttpSecurityGuard } from '../research/core/security/ssrf-guard.js';
import { FetchRouter } from '../research/core/fetch-router.js';
import { TrafilaturaExtractor, DocumentExtractor } from '../research/core/extraction-router.js';
import { DiscoveryEngine } from '../research/core/discovery-engine.js';

describe('PRD 11: Fetching, SSRF Guard & Trafilatura Extraction', () => {
  it('should block SSRF requests to private and metadata addresses', () => {
    // Loopback
    expect(() => HttpSecurityGuard.assertSafeUrl('http://127.0.0.1:8080/admin')).toThrow(/SSRF/);
    expect(() => HttpSecurityGuard.assertSafeUrl('http://localhost:3000')).toThrow(/SSRF/);

    // Private subnets
    expect(() => HttpSecurityGuard.assertSafeUrl('http://192.168.1.1/router')).toThrow(/SSRF/);
    expect(() => HttpSecurityGuard.assertSafeUrl('http://10.0.0.5/api')).toThrow(/SSRF/);
    expect(() => HttpSecurityGuard.assertSafeUrl('http://172.16.0.1/status')).toThrow(/SSRF/);

    // Cloud metadata
    expect(() => HttpSecurityGuard.assertSafeUrl('http://169.254.169.254/latest/meta-data')).toThrow(/SSRF/);

    // Valid public URL
    expect(() => HttpSecurityGuard.assertSafeUrl('https://en.wikipedia.org/wiki/Artificial_intelligence')).not.toThrow();
  });

  it('should extract main text and strip scripts/navigation via TrafilaturaExtractor', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page Title</title>
          <meta name="author" content="Dr. Alan Turing">
          <script>console.log("malicious code or ad pixel");</script>
          <style>body { font-family: sans-serif; }</style>
        </head>
        <body>
          <nav>
            <a href="/">Home</a>
            <a href="/pricing">Pricing</a>
            <a href="/login">Sign In</a>
          </nav>
          <div class="cookie-banner">We use cookies. Click accept.</div>
          <main>
            <article>
              <h1>The Imitation Game and Neural Machinery</h1>
              <p>Can machines think? This question requires exploring computational limits, symbolic manipulation, and distributed neural representations in modern autonomous architectures.</p>
              <p>Universal Turing machines provide an idealized mathematical framework that grounds contemporary algorithmic processing.</p>
            </article>
          </main>
          <footer>Copyright 2026. All rights reserved. Privacy Policy.</footer>
        </body>
      </html>
    `;

    const extractor = new TrafilaturaExtractor();
    const result = extractor.extract({
      url: 'https://example.com/turing',
      canonicalUrl: 'https://example.com/turing',
      status: 200,
      contentType: 'text/html',
      html: rawHtml,
      sizeBytes: rawHtml.length,
      retrievedAt: new Date().toISOString(),
      isStatic: true,
    });

    expect(result.title).toContain('Test Page Title');
    expect(result.author).toBe('Dr. Alan Turing');
    expect(result.extractedText).toContain('Can machines think?');
    expect(result.extractedText).toContain('Universal Turing machines provide an idealized mathematical framework');
    // Ensure navigation and footer were stripped
    expect(result.extractedText).not.toContain('Cookie banner');
    expect(result.extractedText).not.toContain('Sign In');
  });

  it('should discover relative links through DiscoveryEngine', async () => {
    const fetchRouter = new FetchRouter();
    const engine = new DiscoveryEngine(fetchRouter);

    const discovered = await engine.discover('https://en.wikipedia.org/wiki/WebAssembly', 1);
    expect(Array.isArray(discovered)).toBe(true);
    expect(discovered.length).toBeGreaterThan(0);
  });
});
