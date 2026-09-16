import { describe, it, expect, beforeEach } from 'vitest';
import { SkillIntelligenceEngine } from '../../skills/intelligence/skill-intelligence-engine.js';
import { normalizeSkillManifest } from '../../skills/manifests/validator.js';
import { SkillSecurityViolationError } from '../../skills/security/permission-monitor.js';
import { SkillsMcpServer } from '../../mcp/servers/skills/server.js';

describe('HIKMAH Step 23 - Skill Marketplace & Intelligence Engine', () => {
  let engine: SkillIntelligenceEngine;
  let mcpServer: SkillsMcpServer;

  beforeEach(() => {
    engine = SkillIntelligenceEngine.getInstance();
    mcpServer = SkillsMcpServer.getInstance();
  });

  describe('Universal Skill Manifest & Validator', () => {
    it('normalizes raw skill data into a compliant UniversalSkillManifest', () => {
      const raw = {
        name: 'Test Extractor',
        version: '1.0.0',
        description: 'Test skill',
        permissions: {
          network: false,
          filesystem: { read: ['/tmp'] },
        },
        tools: ['test.extract'],
        capabilities: ['data_extraction'],
      };

      const manifest = normalizeSkillManifest(raw);
      expect(manifest.id).toBe('test-extractor');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.permissions.network.enabled).toBe(false);
      expect(manifest.permissions.filesystem.read).toContain('/tmp');
      expect(manifest.sha256).toBeDefined();
    });
  });

  describe('Skill Discovery & Can-Do Engine', () => {
    it('discovers skills based on natural language capabilities and keywords', () => {
      const results = engine.searchSkills('Shopify SEO audit');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].skill.id).toBe('shopify-seo-auditor');
      expect(results[0].relevanceScore).toBeGreaterThan(0.5);
    });

    it('filters skills by category and installed status', () => {
      const results = engine.searchSkills('', { categories: ['PDF'], onlyInstalled: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.skill.id === 'pdf-invoice-extractor')).toBe(true);
    });

    it('evaluates "Can Hikmah Do This?" for existing direct capability', () => {
      const assessment = engine.canHikmahDoThis('Analyze Shopify website for SEO issues');
      expect(assessment.canDo).toBe('YES_EXISTING');
      expect(assessment.recommendedSkillIds).toContain('shopify-seo-auditor');
      expect(assessment.confidence).toBeGreaterThan(0.5);
    });

    it('evaluates "Can Hikmah Do This?" for composite multi-skill capabilities', () => {
      const assessment = engine.canHikmahDoThis('Extract PDF invoice text and translate to Indic language');
      expect(assessment.canDo).toBe('YES_COMPOSITION');
      expect(assessment.recommendedSkillIds.length).toBeGreaterThanOrEqual(2);
      expect(assessment.compositionPlan).toBeDefined();
    });
  });

  describe('Skill Security Scanner & Declared vs Actual Permissions', () => {
    it('detects exposed secrets and dangerous APIs in skill code', async () => {
      const manifest = normalizeSkillManifest({
        id: 'unsafe-skill',
        name: 'Unsafe Skill',
        version: '1.0.0',
        permissions: { network: false, shell: false },
      });

      const maliciousFiles = {
        'index.js': `
          const apiKey = "sk-1234567890abcdef1234567890abcdef";
          eval("console.log('malicious code')");
        `,
      };

      const scanResult = await engine.security.scanSkill(manifest, maliciousFiles);
      expect(scanResult.passed).toBe(false);
      expect(scanResult.secretsFound).toContain('OpenAI Secret Key');
      expect(scanResult.dangerousAPIs).toContain('eval()');
      expect(scanResult.riskLevel).toBe('CRITICAL');
    });

    it('detects undeclared network activity and blocks it at runtime', () => {
      const manifest = normalizeSkillManifest({
        id: 'strict-local-skill',
        name: 'Strict Local Skill',
        version: '1.0.0',
        permissions: { network: false }, // Network explicitly forbidden
      });

      // Attempting network egress must throw a SkillSecurityViolationError
      expect(() => {
        engine.monitor.checkNetworkAccess(manifest, 'https://unauthorized-api.com');
      }).toThrowError(SkillSecurityViolationError);

      // Verify skill was quarantined by the Kill Switch
      expect(engine.killSwitch.getSkillState('strict-local-skill')).toBe('QUARANTINED');
    });

    it('allows declared and authorized network egress to allowed domains', () => {
      const manifest = normalizeSkillManifest({
        id: 'github-sync-skill',
        name: 'GitHub Sync',
        version: '1.0.0',
        permissions: {
          network: { enabled: true, allowedDomains: ['api.github.com'] },
        },
      });

      expect(engine.monitor.checkNetworkAccess(manifest, 'https://api.github.com/repos')).toBe(true);

      // Connecting to undeclared domain must fail
      expect(() => {
        engine.monitor.checkNetworkAccess(manifest, 'https://evil.com/exfiltrate');
      }).toThrowError(SkillSecurityViolationError);
    });
  });

  describe('Skill Compatibility & Dependency Resolver', () => {
    it('flags hardware mismatches when GPU is required on CPU-only system', () => {
      const manifest = normalizeSkillManifest({
        id: 'gpu-model',
        name: 'GPU Model',
        hardware: { cpu: true, gpu: true, minVramGb: 16 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
      });

      const report = engine.compatibility.evaluateCompatibility(manifest, {
        hasGpu: false,
        vramGb: 0,
      });

      expect(report.status).toBe('NEEDS_HARDWARE');
      expect(report.compatible).toBe(false);
      expect(report.missingHardware.length).toBeGreaterThan(0);
    });

    it('resolves dependency graph and detects circular dependencies', () => {
      const manifestA = normalizeSkillManifest({
        id: 'skill-a',
        dependencies: { skills: ['skill-b'], packages: [], system: [] },
      });
      const manifestB = normalizeSkillManifest({
        id: 'skill-b',
        dependencies: { skills: ['skill-a'], packages: [], system: [] },
      });

      const installed = new Map([
        ['skill-a', manifestA],
        ['skill-b', manifestB],
      ]);

      const plan = engine.resolver.resolveDependencies(manifestA, installed);
      expect(plan.circularDetected).toBe(true);
      expect(plan.resolved).toBe(false);
    });
  });

  describe('Skill Lifecycle, Versioning & Rollback', () => {
    it('installs a skill and records it into skills.lock', async () => {
      const res = await engine.installSkill('pdf-invoice-extractor');
      expect(res.success).toBe(true);
      expect(res.installed).toBe(true);

      const lock = engine.versioning.getLockFile();
      expect(lock.skills['pdf-invoice-extractor']).toBeDefined();
      expect(lock.skills['pdf-invoice-extractor'].version).toBe('2.1.0');
    });

    it('supports version recording and rolling back to previous version', () => {
      const skillId = 'rollback-test-skill';
      const v1 = normalizeSkillManifest({ id: skillId, version: '1.0.0', name: 'Rollback Test' });
      const v2 = normalizeSkillManifest({ id: skillId, version: '1.1.0', name: 'Rollback Test' });

      engine.versioning.recordInstalledVersion(v1);
      engine.versioning.recordInstalledVersion(v2);

      const rollbackRes = engine.rollbackSkill(skillId);
      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.version).toBe('1.0.0');
    });
  });

  describe('Skill Composition & Generation', () => {
    it('composes two modular skills into a single composite skill with unioned permissions', async () => {
      const compResult = await engine.composeSkills(
        ['pdf-invoice-extractor', 'indic-multilingual-translator'],
        'Indic Invoice Intelligence',
        'Composite OCR and translation workflow'
      );

      expect(compResult.success).toBe(true);
      expect(compResult.compositeSkill).toBeDefined();
      const comp = compResult.compositeSkill!;
      expect(comp.compositeOf).toContain('pdf-invoice-extractor');
      expect(comp.compositeOf).toContain('indic-multilingual-translator');
      expect(comp.capabilities).toContain('ocr_text_extraction');
      expect(comp.capabilities).toContain('indic_translation');
    });

    it('generates a new skill starting in UNVERIFIED state with security and test scans', async () => {
      const genResult = await engine.generateSkill({
        name: 'Custom CSV Converter',
        description: 'Converts unstructured tabular data into clean CSV',
        category: 'Data Analytics',
      });

      expect(genResult.success).toBe(true);
      expect(genResult.skill).toBeDefined();
      expect(genResult.files['SKILL.md']).toBeDefined();
      expect(genResult.files['index.js']).toBeDefined();
      expect(genResult.scanPassed).toBe(true);
      expect(genResult.testsPassed).toBe(true);
    });
  });

  describe('Universal MCP Server for Skills', () => {
    it('lists supported MCP tools with complete schemas', () => {
      const tools = mcpServer.getSupportedTools();
      expect(tools.length).toBeGreaterThanOrEqual(20);
      const names = tools.map(t => t.name);
      expect(names).toContain('skills.search');
      expect(names).toContain('skills.install');
      expect(names).toContain('skills.can_do');
      expect(names).toContain('skills.compose');
      expect(names).toContain('skills.scan');
    });

    it('handles skills.search MCP tool call', async () => {
      const res = await mcpServer.handleToolCall({
        tool: 'skills.search',
        arguments: { query: 'OSINT' },
      });
      expect(res.isError).toBeFalsy();
      expect(res.content[0].type).toBe('json');
      const results = res.content[0].json;
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: any) => r.skill.id === 'osint-domain-analyzer')).toBe(true);
    });

    it('handles skills.can_do MCP tool call', async () => {
      const res = await mcpServer.handleToolCall({
        tool: 'skills.can_do',
        arguments: { intent: 'Perform security scan on code repository' },
      });
      expect(res.isError).toBeFalsy();
      const assessment = res.content[0].json;
      expect(assessment.canDo).toBe('YES_EXISTING');
      expect(assessment.recommendedSkillIds).toContain('code-security-hardening');
    });
  });
});
