import { UniversalSkillManifest, SkillCategory } from '../manifests/types.js';
import { normalizeSkillManifest } from '../manifests/validator.js';

export class SkillRegistry {
  private static instance: SkillRegistry;
  private installedSkills: Map<string, UniversalSkillManifest> = new Map();
  private availableSkills: Map<string, UniversalSkillManifest> = new Map();

  constructor() {
    this.seedCuratedMarketplaceSkills();
  }

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  public getSkill(idOrName: string): UniversalSkillManifest | undefined {
    return this.installedSkills.get(idOrName) || this.availableSkills.get(idOrName);
  }

  public isInstalled(skillId: string): boolean {
    return this.installedSkills.has(skillId);
  }

  public listInstalledSkills(): UniversalSkillManifest[] {
    return Array.from(this.installedSkills.values());
  }

  public listAvailableSkills(): UniversalSkillManifest[] {
    return Array.from(this.availableSkills.values());
  }

  public listAllSkills(): UniversalSkillManifest[] {
    const all = new Map<string, UniversalSkillManifest>();
    for (const [k, v] of this.availableSkills) all.set(k, v);
    for (const [k, v] of this.installedSkills) all.set(k, v);
    return Array.from(all.values());
  }

  public registerInstalledSkill(manifest: UniversalSkillManifest): void {
    this.installedSkills.set(manifest.id, manifest);
    this.availableSkills.set(manifest.id, manifest);
  }

  public registerAvailableSkill(manifest: UniversalSkillManifest): void {
    this.availableSkills.set(manifest.id, manifest);
  }

  public removeInstalledSkill(skillId: string): boolean {
    return this.installedSkills.delete(skillId);
  }

  public enableSkill(skillId: string, enabled: boolean): boolean {
    const s = this.installedSkills.get(skillId) || this.availableSkills.get(skillId);
    if (!s) return false;
    s.enabled = enabled;
    s.state = enabled ? 'ENABLED' : 'VALIDATED';
    return true;
  }

  // Backwards compatibility with legacy skills/registry.ts
  public listSkills(): any[] {
    return this.listInstalledSkills().map(s => ({
      name: s.id,
      version: s.version,
      description: s.description,
      tools: s.tools,
      permissions: [
        ...(s.permissions.network.enabled ? ['network'] : []),
        ...(s.permissions.filesystem.read.length > 0 ? ['filesystem:read'] : []),
        ...(s.permissions.filesystem.write.length > 0 ? ['filesystem:write'] : []),
        ...(s.permissions.shell.enabled ? ['terminal:execute'] : []),
      ],
      enabled: s.enabled,
    }));
  }

  /**
   * Seeds production-grade catalog of curated skills across Hikmah domains.
   */
  private seedCuratedMarketplaceSkills(): void {
    const curatedRaw: Array<Record<string, any>> = [
      {
        id: 'shopify-seo-auditor',
        name: 'Shopify SEO Auditor',
        version: '1.4.0',
        description: 'Performs automated technical, meta-tag, structured data, and accessibility audits for Shopify stores using headless browser.',
        categories: ['SEO', 'E-commerce', 'Shopify', 'Browser'],
        capabilities: ['browser_automation', 'seo_analysis', 'structured_data_audit', 'web_inspection'],
        tools: ['browser.navigate', 'browser.inspect_dom', 'seo.check_metadata', 'seo.generate_report'],
        source: 'public_registry',
        publisher: { name: 'Hikmah Core Team', verified: true, type: 'official' },
        permissions: {
          network: { enabled: true, allowedDomains: ['*'], allowAllOutbound: true },
          filesystem: { read: ['./reports'], write: ['./reports'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, gpu: false, minRamGb: 2 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'pdf-invoice-extractor',
        name: 'PDF & Invoice OCR Extractor',
        version: '2.1.0',
        description: 'Extracts structured line items, vendor details, tax amounts, and dates from invoices and PDF documents.',
        categories: ['PDF', 'OCR', 'Documents', 'Finance'],
        capabilities: ['ocr_text_extraction', 'pdf_parsing', 'invoice_data_extraction', 'table_parsing'],
        tools: ['pdf.extract_text', 'ocr.scan_image', 'invoice.extract_fields'],
        source: 'public_registry',
        publisher: { name: 'DocumentAI Group', verified: true, type: 'community' },
        permissions: {
          network: { enabled: false, allowedDomains: [] },
          filesystem: { read: ['./documents'], write: ['./extracted'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, minCores: 2, gpu: false, minRamGb: 2 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'osint-domain-analyzer',
        name: 'OSINT Domain & DNS Intelligence',
        version: '1.2.0',
        description: 'Performs passive reconnaissance, sub-domain enumeration, DNS records inspection, and certificate transparency graph analysis.',
        categories: ['OSINT', 'Cybersecurity', 'Networking'],
        capabilities: ['dns_recon', 'subdomain_enumeration', 'certificate_transparency', 'whois_lookup'],
        tools: ['osint.dns_lookup', 'osint.subdomain_scan', 'osint.cert_history'],
        source: 'public_registry',
        publisher: { name: 'SecOps Guild', verified: true, type: 'community' },
        permissions: {
          network: { enabled: true, allowedDomains: ['*'], allowAllOutbound: true },
          filesystem: { read: [], write: ['./osint_out'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, gpu: false, minRamGb: 1 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'code-security-hardening',
        name: 'Code Security & Vulnerability Scanner',
        version: '3.0.1',
        description: 'Multi-language SAST analyzer scanning for OWASP Top 10, SQLi, XSS, insecure deserialization, and exposed secrets.',
        categories: ['Coding', 'Cybersecurity', 'DevOps'],
        capabilities: ['sast_scan', 'vulnerability_detection', 'secret_scanning', 'ast_analysis'],
        tools: ['code.ast_scan', 'sec.check_cve', 'sec.verify_patch'],
        source: 'public_registry',
        publisher: { name: 'Hikmah Security Team', verified: true, type: 'official' },
        permissions: {
          network: { enabled: false, allowedDomains: [] },
          filesystem: { read: ['*'], write: ['./reports'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, gpu: false, minRamGb: 2 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'indic-multilingual-translator',
        name: 'Indic Multi-lingual Document Translator',
        version: '1.1.0',
        description: 'Translates high-volume documents and prompts across 22 scheduled Indian languages and Hinglish with cultural nuances.',
        categories: ['Translation', 'India', 'Documents', 'AI / LLM'],
        capabilities: ['indic_translation', 'hinglish_normalization', 'multilingual_nlp'],
        tools: ['translate.indic_text', 'nlp.detect_language'],
        source: 'public_registry',
        publisher: { name: 'BharatAI Consortium', verified: true, type: 'community' },
        permissions: {
          network: { enabled: false, allowedDomains: [] },
          filesystem: { read: ['./docs'], write: ['./translated'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, minRamGb: 2, gpu: false },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'deep-research-synthesizer',
        name: 'Deep Research & Cross-Source Synthesizer',
        version: '2.0.0',
        description: 'Autonomous research worker that scrapes, fact-checks, eliminates bias, and cites peer-reviewed sources.',
        categories: ['Research', 'Browser', 'Writing'],
        capabilities: ['deep_research', 'citation_graph', 'fact_checking', 'report_generation'],
        tools: ['research.query_academic', 'browser.extract_content', 'synthesis.merge_facts'],
        source: 'public_registry',
        publisher: { name: 'Hikmah Core Team', verified: true, type: 'official' },
        permissions: {
          network: { enabled: true, allowedDomains: ['*'], allowAllOutbound: true },
          filesystem: { read: [], write: ['./research_output'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, gpu: false, minRamGb: 2 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'ENABLED',
        enabled: true,
        installed: true,
      },
      {
        id: 'git-repo-doctor',
        name: 'Git Repository Health & Dependency Doctor',
        version: '1.0.4',
        description: 'Analyzes repo commit history, branch health, stale PRs, bloated dependencies, and license compliance.',
        categories: ['GitHub', 'DevOps', 'Coding'],
        capabilities: ['git_analysis', 'dependency_audit', 'license_compliance'],
        tools: ['git.inspect_history', 'git.audit_deps'],
        source: 'public_registry',
        publisher: { name: 'DevTools Lab', verified: false, type: 'community' },
        permissions: {
          network: { enabled: true, allowedDomains: ['api.github.com', 'github.com'] },
          filesystem: { read: ['*'], write: [], tempOnly: true },
          shell: { enabled: true, allowedCommands: ['git', 'npm'], subprocess: false },
          credentials: { required: true, providers: ['github'] },
        },
        hardware: { cpu: true, gpu: false, minRamGb: 1 },
        compatibility: { platforms: ['any'], architectures: ['any'] },
        risk: { level: 'MEDIUM', reasons: ['Requires shell access for git and npm commands'] },
        certification: 'TESTED',
        state: 'VALIDATED',
        enabled: false,
        installed: false,
      },
      {
        id: 'gpu-video-upscaler',
        name: 'GPU Neural Video & Frame Upscaler',
        version: '1.0.0',
        description: 'Uses Real-ESRGAN / Waifu2x neural models to upscale video frames and imagery up to 4K resolution.',
        categories: ['Video', 'Vision', 'AI / LLM'],
        capabilities: ['video_upscaling', 'frame_interpolation', 'super_resolution'],
        tools: ['video.upscale_frame', 'video.render_4k'],
        source: 'public_registry',
        publisher: { name: 'VisionML Inc', verified: true, type: 'organization' },
        permissions: {
          network: { enabled: false, allowedDomains: [] },
          filesystem: { read: ['./media'], write: ['./media/upscaled'], tempOnly: false },
          shell: { enabled: false, subprocess: false },
          credentials: { required: false, providers: [] },
        },
        hardware: { cpu: true, gpu: true, minVramGb: 12, cudaRequired: true, minRamGb: 16 },
        compatibility: { platforms: ['linux', 'win32'], architectures: ['x64'] },
        risk: { level: 'LOW', reasons: [] },
        certification: 'CERTIFIED',
        state: 'DISCOVERED',
        enabled: false,
        installed: false,
      },
    ];

    for (const raw of curatedRaw) {
      const isInst = Boolean(raw.installed);
      delete raw.installed;
      const manifest = normalizeSkillManifest(raw);
      this.availableSkills.set(manifest.id, manifest);
      if (isInst) {
        this.installedSkills.set(manifest.id, manifest);
      }
    }
  }
}
