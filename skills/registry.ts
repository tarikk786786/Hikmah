import { SkillManifest } from './types.js';
import { SkillRegistry as CanonicalSkillRegistry } from './registry/skill-registry.js';
import { UniversalSkillManifest } from './manifests/types.js';

export class SkillRegistry {
  private canonical: CanonicalSkillRegistry;
  private legacySkills: Map<string, SkillManifest> = new Map();

  constructor() {
    this.canonical = CanonicalSkillRegistry.getInstance();
    this.seedDefaultSkills();
  }

  private seedDefaultSkills(): void {
    const defaultSkills: SkillManifest[] = [
      {
        name: 'web',
        version: '1.0.0',
        description: 'Web browsing, real-time search, and URL content extraction',
        tools: ['web_search'],
        permissions: ['network'],
        enabled: true
      },
      {
        name: 'research',
        version: '1.0.0',
        description: 'Multi-source deep research synthesis and knowledge persistence',
        tools: ['web_search', 'memory_store'],
        permissions: ['network', 'memory:read', 'memory:write'],
        enabled: true
      },
      {
        name: 'files',
        version: '1.0.0',
        description: 'Safe sandboxed workspace file reading and inspection',
        tools: ['file_read'],
        permissions: ['filesystem:read'],
        enabled: true
      },
      {
        name: 'coding',
        version: '1.0.0',
        description: 'Codebase analysis, test execution, and pull request preparation (OpenHands ready)',
        tools: ['file_read'],
        permissions: ['filesystem:read', 'terminal:execute'],
        enabled: true
      },
      {
        name: 'browser',
        version: '1.0.0',
        description: 'Headless Chromium browser automation via Playwright queue workers',
        tools: ['web_search'],
        permissions: ['network', 'browser:control'],
        enabled: true
      }
    ];

    for (const skill of defaultSkills) {
      this.legacySkills.set(skill.name, skill);
    }
  }

  public registerSkill(skill: SkillManifest): void {
    this.legacySkills.set(skill.name, skill);
  }

  public getSkill(name: string): SkillManifest | undefined {
    return this.legacySkills.get(name);
  }

  public listSkills(): SkillManifest[] {
    return Array.from(this.legacySkills.values());
  }

  public enableSkill(name: string, enabled: boolean): boolean {
    const s = this.legacySkills.get(name);
    if (!s) return false;
    s.enabled = enabled;
    return true;
  }

  public getCanonicalRegistry(): CanonicalSkillRegistry {
    return this.canonical;
  }
}
