export interface SSRFValidationResult {
  safe: boolean;
  error?: string;
  normalizedUrl?: string;
}

export class HttpSecurityGuard {
  // Disallowed hosts / IP patterns
  private static readonly BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS/GCP/Azure metadata service
    'metadata.google.internal',
    'instance-data'
  ]);

  /**
   * Validates whether a URL is safe to fetch and does not target internal services or metadata endpoints.
   */
  public static validateUrl(inputUrl: string): SSRFValidationResult {
    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return { safe: false, error: 'Invalid URL format' };
    }

    // Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Direct blocked hostnames
    if (HttpSecurityGuard.BLOCKED_HOSTS.has(hostname)) {
      return { safe: false, error: `SSRF Violation: Target host [${hostname}] is blocked` };
    }

    // Check for IPv4 private subnets
    if (HttpSecurityGuard.isPrivateIPv4(hostname)) {
      return { safe: false, error: `SSRF Violation: Private IPv4 address [${hostname}] is blocked` };
    }

    // Check for IPv6 loopback/private
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1);
      if (ipv6 === '::1' || ipv6.startsWith('fc00') || ipv6.startsWith('fe80')) {
        return { safe: false, error: `SSRF Violation: Private/local IPv6 address [${ipv6}] is blocked` };
      }
    }

    return { safe: true, normalizedUrl: parsed.toString() };
  }

  /**
   * Throws an error if URL fails SSRF safety checks.
   */
  public static assertSafeUrl(inputUrl: string): void {
    const res = HttpSecurityGuard.validateUrl(inputUrl);
    if (!res.safe) {
      throw new Error(res.error || 'SSRF Guard Blocked Request');
    }
  }

  private static isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) {
      return false; // Not a raw IPv4 string
    }

    const [a, b] = parts;
    // 10.0.0.0/8
    if (a === 10) return true;
    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local & Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8
    if (a === 0) return true;

    return false;
  }
}
