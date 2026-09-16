import { UrlCanonicalizer } from './canonicalizer.js';
import { HttpSecurityGuard } from './security/ssrf-guard.js';

export interface DiscoveredSourceItem {
  url: string;
  canonicalUrl: string;
  sourceType: 'INTERNAL_LINK' | 'EXTERNAL_LINK' | 'SITEMAP' | 'RSS_FEED';
  relevanceScore: number;
}

export class DiscoveryEngine {
  constructor(private fetchRouter?: any) {}

  public async discover(
    seedUrl: string,
    linksOrMax?: string[] | number,
    options?: { maxLinks?: number; allowCrossDomain?: boolean }
  ): Promise<any> {
    if (typeof linksOrMax === 'number') {
      const maxLinks = linksOrMax;
      try {
        if (this.fetchRouter) {
          const fetched = await this.fetchRouter.fetch(seedUrl);
          const rawHtml = fetched?.html || fetched?.text || '';
          const linkMatches = Array.from(rawHtml.matchAll(/href=["'](https?:\/\/[^"'\s]+)["']/gi)).map((m: any) => m[1]);
          const items = DiscoveryEngine.discoverLinks(seedUrl, linkMatches, { maxLinks, ...options });
          return items.map((i) => i.url);
        }
      } catch {
        // Fallback
      }
      return [];
    }

    const links = Array.isArray(linksOrMax) ? linksOrMax : [];
    return DiscoveryEngine.discoverLinks(seedUrl, links, options);
  }
  public static discoverLinks(
    seedUrl: string,
    extractedLinks: string[],
    options?: { maxLinks?: number; allowCrossDomain?: boolean }
  ): DiscoveredSourceItem[] {
    const maxLinks = options?.maxLinks || 10;
    const allowCrossDomain = options?.allowCrossDomain ?? true;

    let seedHost = '';
    try {
      seedHost = new URL(seedUrl).hostname;
    } catch {
      return [];
    }

    const discovered: DiscoveredSourceItem[] = [];
    const seen = new Set<string>();

    for (const link of extractedLinks) {
      if (discovered.length >= maxLinks) break;

      const ssrfCheck = HttpSecurityGuard.validateUrl(link);
      if (!ssrfCheck.safe) continue;

      let linkHost = '';
      try {
        linkHost = new URL(link).hostname;
      } catch {
        continue;
      }

      if (!allowCrossDomain && linkHost !== seedHost) {
        continue;
      }

      const { canonicalUrl } = UrlCanonicalizer.canonicalize(link);
      if (seen.has(canonicalUrl)) continue;
      seen.add(canonicalUrl);

      const isInternal = linkHost === seedHost;
      discovered.push({
        url: link,
        canonicalUrl,
        sourceType: isInternal ? 'INTERNAL_LINK' : 'EXTERNAL_LINK',
        relevanceScore: isInternal ? 0.8 : 0.7
      });
    }

    return discovered;
  }

  /**
   * Generates sitemap and robots endpoints for domain discovery.
   */
  public static getDomainDiscoveryEndpoints(domain: string): { robotsUrl: string; sitemapUrl: string } {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    return {
      robotsUrl: `${base}/robots.txt`,
      sitemapUrl: `${base}/sitemap.xml`
    };
  }
}
