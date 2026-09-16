import { UniversalSkillManifest, SkillPermissions, SkillDependencies } from '../manifests/types.js';
import { SkillRegistry } from '../registry/skill-registry.js';
import { SkillSecurityScanner } from '../security/security-scanner.js';
import { normalizeSkillManifest } from '../manifests/validator.js';

export class SkillComposer {
  private static instance: SkillComposer;
  private registry: SkillRegistry;
  private scanner: SkillSecurityScanner;

  constructor() {
    this.registry = SkillRegistry.getInstance();
    this.scanner = SkillSecurityScanner.getInstance();
  }

  public static getInstance(): SkillComposer {
    if (!SkillComposer.instance) {
      SkillComposer.instance = new SkillComposer();
    }
    return SkillComposer.instance;
  }

  /**
   * Composes multiple modular skills into a single composite skill pipeline.
   */
  public async composeSkills(
    skillIds: string[],
    compositeName: string,
    compositeDescription: string
  ): Promise<{ success: boolean; compositeSkill?: UniversalSkillManifest; error?: string }> {
    if (skillIds.length < 2) {
      return { success: false, error: 'At least 2 skills are required to form a composite.' };
    }

    const skills: UniversalSkillManifest[] = [];
    for (const id of skillIds) {
      const s = this.registry.getSkill(id);
      if (!s) {
        return { success: false, error: `Skill '${id}' not found in registry.` };
      }
      skills.push(s);
    }

    // 1. Union of Permissions (Maximum inherited permissions)
    const combinedPermissions: SkillPermissions = {
      network: {
        enabled: skills.some(s => s.permissions.network.enabled),
        allowedDomains: Array.from(new Set(skills.flatMap(s => s.permissions.network.allowedDomains))),
        allowAllOutbound: skills.some(s => s.permissions.network.allowAllOutbound),
      },
      filesystem: {
        read: Array.from(new Set(skills.flatMap(s => s.permissions.filesystem.read))),
        write: Array.from(new Set(skills.flatMap(s => s.permissions.filesystem.write))),
        tempOnly: skills.every(s => s.permissions.filesystem.tempOnly),
      },
      shell: {
        enabled: skills.some(s => s.permissions.shell.enabled),
        allowedCommands: Array.from(new Set(skills.flatMap(s => s.permissions.shell.allowedCommands || []))),
        subprocess: skills.some(s => s.permissions.shell.subprocess),
      },
      credentials: {
        required: skills.some(s => s.permissions.credentials.required),
        providers: Array.from(new Set(skills.flatMap(s => s.permissions.credentials.providers))),
      },
      browser: {
        enabled: skills.some(s => s.permissions.browser?.enabled),
        headlessOnly: skills.every(s => s.permissions.browser?.headlessOnly ?? true),
      },
      memory: {
        read: skills.some(s => s.permissions.memory?.read),
        write: skills.some(s => s.permissions.memory?.write),
      },
    };

    // 2. Union of Dependencies
    const combinedDependencies: SkillDependencies = {
      skills: skillIds,
      packages: Array.from(new Map(skills.flatMap(s => s.dependencies.packages).map(p => [p.name, p])).values()),
      system: Array.from(new Set(skills.flatMap(s => s.dependencies.system))),
    };

    // 3. Union of Categories, Capabilities, and Tools
    const combinedCategories = Array.from(new Set(skills.flatMap(s => s.categories)));
    const combinedCapabilities = Array.from(new Set(skills.flatMap(s => s.capabilities)));
    const combinedTools = Array.from(new Set(skills.flatMap(s => s.tools)));

    // 4. Hardware limits
    const maxRam = Math.max(...skills.map(s => s.hardware.minRamGb || 1));
    const requiresGpu = skills.some(s => s.hardware.gpu);

    const compositeId = compositeName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const rawManifest: Record<string, any> = {
      id: compositeId,
      name: compositeName,
      version: '1.0.0',
      description: compositeDescription,
      categories: combinedCategories,
      capabilities: combinedCapabilities,
      tools: combinedTools,
      permissions: combinedPermissions,
      dependencies: combinedDependencies,
      hardware: {
        cpu: true,
        gpu: requiresGpu,
        minRamGb: maxRam,
      },
      source: 'private',
      publisher: {
        name: 'Hikmah Skill Composer',
        type: 'system',
        verified: true,
      },
      compositeOf: skillIds,
      isGenerated: true,
      state: 'VALIDATED',
      certification: 'SCANNED',
      enabled: true,
    };

    const compositeSkill = normalizeSkillManifest(rawManifest);

    // 5. Security Scan composite bundle
    const scanResult = await this.scanner.scanSkill(compositeSkill);
    if (!scanResult.passed) {
      return {
        success: false,
        error: `Composite skill failed security scan: ${scanResult.findings.map(f => f.message).join('; ')}`,
      };
    }

    this.registry.registerAvailableSkill(compositeSkill);
    return { success: true, compositeSkill };
  }
}
