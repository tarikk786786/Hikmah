import crypto from 'crypto';
import { UniversalSkillManifest, SkillSecurityScanResult, SkillSecurityFinding, SkillRiskLevel, SkillPermissions } from '../manifests/types.js';

export class SkillSecurityScanner {
  private static instance: SkillSecurityScanner;

  public static getInstance(): SkillSecurityScanner {
    if (!SkillSecurityScanner.instance) {
      SkillSecurityScanner.instance = new SkillSecurityScanner();
    }
    return SkillSecurityScanner.instance;
  }

  /**
   * Scans a skill's manifest, scripts, and dependencies for security vulnerabilities.
   */
  public async scanSkill(
    manifest: UniversalSkillManifest,
    filesContent?: Record<string, string>
  ): Promise<SkillSecurityScanResult> {
    const findings: SkillSecurityFinding[] = [];
    const secretsFound: string[] = [];
    const dangerousAPIs: string[] = [];
    const permissionDiscrepancies: string[] = [];

    // 1. Verify Checksum / Integrity if provided
    if (manifest.sha256) {
      // Validated checksum format
      if (!/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
        findings.push({
          ruleId: 'SEC-INTEG-001',
          severity: 'HIGH',
          message: 'Invalid SHA-256 hash format in skill manifest.',
        });
      }
    }

    // 2. Secret Scanning Patterns (Gitleaks pattern)
    const secretPatterns: Array<{ name: string; regex: RegExp }> = [
      { name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|secret)[ \t]*[=:][ \t]*['"][a-zA-Z0-9_\-]{20,}['"]/i },
      { name: 'OpenAI Secret Key', regex: /sk-[a-zA-Z0-9]{32,}/ },
      { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
      { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
      { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
      { name: 'Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/ },
    ];

    // 3. Dangerous API Detection Patterns
    const dangerousPatterns: Array<{ api: string; severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; regex: RegExp }> = [
      { api: 'eval()', severity: 'HIGH', regex: /\beval\s*\(/ },
      { api: 'Function constructor', severity: 'HIGH', regex: /new\s+Function\s*\(/ },
      { api: 'child_process.exec', severity: 'CRITICAL', regex: /\b(exec|execSync|spawn|spawnSync)\s*\(/ },
      { api: 'os.system / subprocess', severity: 'CRITICAL', regex: /\b(os\.system|subprocess\.Popen|subprocess\.run)\b/ },
      { api: 'Raw Socket Creation', severity: 'HIGH', regex: /\b(net\.createServer|dgram\.createSocket|socket\.socket)\b/ },
      { api: 'Dynamic require / import', severity: 'MEDIUM', regex: /\brequire\s*\(\s*[^'"`]/ },
    ];

    const inferredPermissions: Partial<SkillPermissions> = {
      network: { enabled: false, allowedDomains: [] },
      filesystem: { read: [], write: [] },
      shell: { enabled: false, subprocess: false },
    };

    if (filesContent) {
      for (const [filepath, code] of Object.entries(filesContent)) {
        // Skip metadata and documentation files from executable code AST scanning
        const isMetadataOrDoc = /\.(json|md|txt|yaml|yml)$/i.test(filepath);
        if (isMetadataOrDoc) continue;
        // Scan for secrets
        for (const sp of secretPatterns) {
          if (sp.regex.test(code)) {
            secretsFound.push(sp.name);
            findings.push({
              ruleId: 'SEC-SECRET-001',
              severity: 'CRITICAL',
              message: `Potential hardcoded secret detected (${sp.name}) in ${filepath}`,
              file: filepath,
            });
          }
        }

        // Scan for dangerous APIs
        for (const dp of dangerousPatterns) {
          if (dp.regex.test(code)) {
            dangerousAPIs.push(dp.api);
            findings.push({
              ruleId: 'SEC-CODE-002',
              severity: dp.severity,
              message: `Dangerous API invocation detected: ${dp.api} in ${filepath}`,
              file: filepath,
            });
          }
        }

        // Inferred Network Activity (fetch, http, axios, urllib, requests)
        if (/fetch\s*\(|http\.request|https\.request|axios\.|requests\.get|urllib\.request/i.test(code)) {
          if (inferredPermissions.network) inferredPermissions.network.enabled = true;
          if (!manifest.permissions.network.enabled) {
            permissionDiscrepancies.push(`File ${filepath} attempts network requests, but manifest declared network: false`);
            findings.push({
              ruleId: 'SEC-PERM-UNDECLARED-NETWORK',
              severity: 'CRITICAL',
              message: `Undeclared network activity: code performs HTTP requests while manifest disables network permissions!`,
              file: filepath,
            });
          }
        }

        // Inferred Shell / Subprocess Activity
        if (/\b(exec|spawn|subprocess|system)\b/.test(code)) {
          if (inferredPermissions.shell) inferredPermissions.shell.enabled = true;
          if (!manifest.permissions.shell.enabled) {
            permissionDiscrepancies.push(`File ${filepath} executes subprocesses, but manifest declared shell: false`);
            findings.push({
              ruleId: 'SEC-PERM-UNDECLARED-SHELL',
              severity: 'CRITICAL',
              message: `Undeclared shell execution: code spawns child processes while manifest disables shell permissions!`,
              file: filepath,
            });
          }
        }

        // Inferred File Write Activity
        if (/fs\.writeFile|fs\.appendFile|fs\.unlink|open\([^)]+['"]w['"]\)/i.test(code)) {
          if (manifest.permissions.filesystem.write.length === 0) {
            permissionDiscrepancies.push(`File ${filepath} writes to disk, but manifest declares no write paths`);
            findings.push({
              ruleId: 'SEC-PERM-UNDECLARED-FS',
              severity: 'HIGH',
              message: `Undeclared filesystem write operations in ${filepath}.`,
              file: filepath,
            });
          }
        }
      }
    }

    // 4. Calculate Overall Risk Level
    let riskLevel: SkillRiskLevel = 'LOW';
    const hasCritical = findings.some(f => f.severity === 'CRITICAL');
    const hasHigh = findings.some(f => f.severity === 'HIGH');
    const hasMedium = findings.some(f => f.severity === 'MEDIUM');

    if (hasCritical) {
      riskLevel = 'CRITICAL';
    } else if (hasHigh) {
      riskLevel = 'HIGH';
    } else if (hasMedium) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = manifest.risk.level || 'LOW';
    }

    // 5. Generate SBOM
    const sbomPackages = manifest.dependencies.packages.map(p => ({
      name: p.name,
      version: p.version,
      license: 'UNKNOWN',
    }));

    const passed = !hasCritical && findings.filter(f => f.severity === 'HIGH').length <= 1;

    return {
      scanId: `scan-${crypto.randomBytes(8).toString('hex')}`,
      skillId: manifest.id,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      passed,
      riskLevel,
      findings,
      secretsFound: Array.from(new Set(secretsFound)),
      dangerousAPIs: Array.from(new Set(dangerousAPIs)),
      declaredPermissions: manifest.permissions,
      inferredPermissions,
      permissionDiscrepancies,
      sbom: { packages: sbomPackages },
    };
  }
}
