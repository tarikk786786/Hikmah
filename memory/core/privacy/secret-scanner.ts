export interface SecretScanResult {
  hasSecrets: boolean;
  secretTypes: string[];
  redactedText: string;
}

export class SecretScanner {
  private static instance: SecretScanner;

  private secretPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'OPENAI_API_KEY', regex: /sk-[a-zA-Z0-9_-]{20,}/g },
    { name: 'ANTHROPIC_API_KEY', regex: /sk-ant-[a-zA-Z0-9_-]{20,}/g },
    { name: 'GOOGLE_API_KEY', regex: /AIza[0-9A-Za-z-_]{35}/g },
    { name: 'AWS_ACCESS_KEY', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
    { name: 'PRIVATE_KEY', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
    { name: 'JWT_TOKEN', regex: /ey[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,}/g },
    { name: 'DATABASE_URL', regex: /(?:postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi },
    { name: 'GENERIC_PASSWORD', regex: /(?:password|secret|passwd|token)\s*[:=]\s*["']([^"']{8,})["']/gi }
  ];

  public static getInstance(): SecretScanner {
    if (!SecretScanner.instance) {
      SecretScanner.instance = new SecretScanner();
    }
    return SecretScanner.instance;
  }

  public scan(text: string): SecretScanResult {
    if (!text || typeof text !== 'string') {
      return { hasSecrets: false, secretTypes: [], redactedText: text || '' };
    }

    let redacted = text;
    const detected: Set<string> = new Set();

    for (const pattern of this.secretPatterns) {
      if (pattern.regex.test(redacted)) {
        detected.add(pattern.name);
        redacted = redacted.replace(pattern.regex, `[REDACTED_${pattern.name}]`);
      }
      // Reset lastIndex for global regex
      pattern.regex.lastIndex = 0;
    }

    return {
      hasSecrets: detected.size > 0,
      secretTypes: Array.from(detected),
      redactedText: redacted
    };
  }

  public assertSafe(text: string): void {
    const res = this.scan(text);
    if (res.hasSecrets) {
      throw new Error(
        `Secret detected in memory payload! Detected types: ${res.secretTypes.join(', ')}. Action blocked by Zero-Trust policy.`
      );
    }
  }
}
