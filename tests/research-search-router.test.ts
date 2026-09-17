import { describe, it, expect } from 'vitest';
import { QueryPlanner } from '../research/core/query-planner.js';
import { UrlCanonicalizer } from '../research/core/canonicalizer.js';
import { SearchRouter } from '../research/core/search-router.js';

describe('PRD 11: Query Planning & Search Routing', () => {
  it('should plan queries based on research mode', () => {
    const planner = new QueryPlanner();

    const quickQueries = planner.plan('What is WebAssembly?', 'QUICK');
    expect(quickQueries.length).toBeGreaterThanOrEqual(1);
    expect(quickQueries.length).toBeLessThanOrEqual(2);

    const deepQueries = planner.plan('Compare PostgreSQL vs MySQL for high-concurrency workloads', 'DEEP');
    expect(deepQueries.length).toBeGreaterThanOrEqual(4);
    expect(deepQueries.some((q) => q.intent === 'TECHNICAL' || q.intent === 'ACADEMIC')).toBe(true);
  });

  it('should canonicalize URLs and strip tracking parameters', () => {
    const raw = 'HTTPS://WWW.Example.com:443/docs/api?utm_source=twitter&utm_medium=social&page=1#section-2';
    const { canonicalUrl: canonical, urlHash } = UrlCanonicalizer.canonicalize(raw);

    expect(canonical).toBe('https://www.example.com/docs/api?page=1');
    expect(urlHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should route multi-intent searches across providers', async () => {
    const router = new SearchRouter();

    // General search
    const generalResults = await router.search('TypeScript 5.8 features', { intent: 'GENERAL', limit: 3 });
    expect(generalResults.length).toBeGreaterThan(0);
    expect(generalResults[0].title).toBeDefined();
    expect(generalResults[0].canonicalUrl).toBeDefined();

    // Academic search
    const academicResults = await router.search('Transformer attention mechanisms', { intent: 'ACADEMIC', limit: 2 });
    expect(academicResults.length).toBeGreaterThan(0);
    expect(academicResults.some((r) => r.domain.includes('arxiv') || r.domain.includes('openalex'))).toBe(true);

    // GitHub search
    const githubResults = await router.search('vitest test runner', { intent: 'GITHUB', limit: 2 });
    expect(githubResults.length).toBeGreaterThan(0);
    expect(githubResults.some((r) => r.domain === 'github.com')).toBe(true);
  });
});
