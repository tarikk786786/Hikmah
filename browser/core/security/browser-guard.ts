/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Browser Security Guard: SSRF Prevention, Protocol Enforcement, Download Quarantine, and Credential Protection
 */

export interface BrowserValidationResult {
  safe: boolean;
  error?: string;
  normalizedUrl?: string;
}

export class BrowserSecurityGuard {
  private static readonly BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS/GCP/Azure link-local metadata
    'metadata.google.internal',
    'instance-data',
  ]);

  private static readonly ALLOWED_PROTOCOLS = new Set([
    'http:',
    'https:',
    'about:', // needed for about:blank
  ]);

  private static readonly DANGEROUS_DOWNLOAD_EXTENSIONS = new Set([
    '.exe',
    '.bat',
    '.cmd',
    '.ps1',
    '.vbs',
    '.sh',
    '.scr',
    '.msi',
    '.dll',
    '.com',
    '.pif',
    '.application',
    '.gadget',
  ]);

  /**
   * Validates whether a target URL is safe for browser navigation.
   */
  public static validateNavigationUrl(inputUrl: string): BrowserValidationResult {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { safe: false, error: 'Empty or invalid URL supplied' };
    }

    const trimmed = inputUrl.trim();

    if (trimmed === 'about:blank') {
      return { safe: true, normalizedUrl: 'about:blank' };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { safe: false, error: `Malformed URL format: ${inputUrl}` };
    }

    if (!BrowserSecurityGuard.ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return {
        safe: false,
        error: `Disallowed browser protocol [${parsed.protocol}]. Only http: and https: (or about:blank) are permitted.`,
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hostnames
    if (BrowserSecurityGuard.BLOCKED_HOSTS.has(hostname)) {
      return { safe: false, error: `SSRF Violation: Target host [${hostname}] is blocked` };
    }

    // Check private domain suffixes
    if (
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false, error: `SSRF Violation: Internal domain [${hostname}] is blocked` };
    }

    // Check IPv4 private ranges
    if (BrowserSecurityGuard.isPrivateIPv4(hostname)) {
      return { safe: false, error: `SSRF Violation: Private IPv4 address [${hostname}] is blocked` };
    }

    // Check IPv6 loopback / private
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1);
      if (ipv6 === '::1' || ipv6.startsWith('fc00') || ipv6.startsWith('fe80')) {
        return { safe: false, error: `SSRF Violation: Private IPv6 address [${ipv6}] is blocked` };
      }
    }

    return { safe: true, normalizedUrl: parsed.toString() };
  }

  /**
   * Asserts URL is safe for navigation or throws an error.
   */
  public static assertSafeUrl(inputUrl: string): void {
    const res = BrowserSecurityGuard.validateNavigationUrl(inputUrl);
    if (!res.safe) {
      throw new Error(`[BrowserSecurityGuard] ${res.error}`);
    }
  }

  /**
   * Checks if a download filename or extension is permitted.
   */
  public static validateDownload(filename: string): { safe: boolean; reason?: string } {
    const lower = filename.toLowerCase();
    for (const ext of BrowserSecurityGuard.DANGEROUS_DOWNLOAD_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        return {
          safe: false,
          reason: `Executable or script download extension [${ext}] is prohibited.`,
        };
      }
    }
    return { safe: true };
  }

  /**
   * Sanitizes headers or logs to strip authorization tokens, cookies, or secrets.
   */
  public static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveKeys = new Set([
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'proxy-authorization',
    ]);

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED_BY_BROWSER_GUARD]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private static isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) {
      return false;
    }

    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    if (a === 0) return true; // 0.0.0.0/8

    return false;
  }
}
