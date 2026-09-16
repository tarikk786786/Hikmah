import * as crypto from 'crypto';

export class UrlCanonicalizer {
  private static readonly TRACKING_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'fbclid',
    'gclid',
    'gclsrc',
    'dclid',
    'msclkid',
    'mc_eid',
    'yclid',
    '_ga',
    '_gl',
    'ref',
    'ref_src',
    'source'
  ]);

  /**
   * Normalizes a raw URL by stripping tracking parameters, fragments, and redundant ports,
   * returning the canonical URL and its SHA-256 hash.
   */
  public static canonicalize(rawUrl: string): { canonicalUrl: string; urlHash: string } {
    try {
      const parsed = new URL(rawUrl.trim());

      // Lowercase protocol and host
      parsed.protocol = parsed.protocol.toLowerCase();
      parsed.hostname = parsed.hostname.toLowerCase();

      // Remove default ports
      if ((parsed.protocol === 'http:' && parsed.port === '80') ||
          (parsed.protocol === 'https:' && parsed.port === '443')) {
        parsed.port = '';
      }

      // Remove fragment / anchor
      parsed.hash = '';

      // Strip tracking query parameters
      const params = new URLSearchParams(parsed.search);
      const keysToDelete: string[] = [];
      for (const key of params.keys()) {
        if (UrlCanonicalizer.TRACKING_PARAMS.has(key.toLowerCase()) || key.startsWith('utm_')) {
          keysToDelete.push(key);
        }
      }
      for (const k of keysToDelete) {
        params.delete(k);
      }

      // Sort remaining query parameters alphabetically
      params.sort();
      parsed.search = params.toString() ? `?${params.toString()}` : '';

      // Remove trailing slash on path if longer than 1 character
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      const canonicalUrl = parsed.toString();
      const urlHash = crypto.createHash('sha256').update(canonicalUrl).digest('hex');

      return { canonicalUrl, urlHash };
    } catch {
      // Fallback if URL parsing fails
      const fallbackUrl = rawUrl.trim().split('#')[0];
      const urlHash = crypto.createHash('sha256').update(fallbackUrl).digest('hex');
      return { canonicalUrl: fallbackUrl, urlHash };
    }
  }
}
