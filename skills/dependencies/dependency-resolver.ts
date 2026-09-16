import { UniversalSkillManifest, SkillDependencyItem } from '../manifests/types.js';

export interface DependencyResolutionPlan {
  skillId: string;
  resolved: boolean;
  installOrder: Array<{
    name: string;
    type: string;
    version: string;
    status: 'ALREADY_INSTALLED' | 'TO_INSTALL';
  }>;
  missingSystemDeps: string[];
  missingSkills: string[];
  circularDetected: boolean;
  errors: string[];
}

export class SkillDependencyResolver {
  private static instance: SkillDependencyResolver;

  public static getInstance(): SkillDependencyResolver {
    if (!SkillDependencyResolver.instance) {
      SkillDependencyResolver.instance = new SkillDependencyResolver();
    }
    return SkillDependencyResolver.instance;
  }

  /**
   * Resolves the full dependency tree for a given skill.
   */
  public resolveDependencies(
    manifest: UniversalSkillManifest,
    installedSkills: Map<string, UniversalSkillManifest>,
    installedPackages: Set<string> = new Set()
  ): DependencyResolutionPlan {
    const installOrder: DependencyResolutionPlan['installOrder'] = [];
    const missingSystemDeps: string[] = [];
    const missingSkills: string[] = [];
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let circularDetected = false;

    // 1. Resolve Child Skills recursively
    const resolveSkillNode = (skillId: string) => {
      if (recursionStack.has(skillId)) {
        circularDetected = true;
        errors.push(`Circular skill dependency detected involving '${skillId}'`);
        return;
      }
      if (visited.has(skillId)) return;

      visited.add(skillId);
      recursionStack.add(skillId);

      const targetSkill = skillId === manifest.id ? manifest : installedSkills.get(skillId);
      if (!targetSkill) {
        missingSkills.push(skillId);
        recursionStack.delete(skillId);
        return;
      }

      // Check its child skill dependencies
      for (const childId of targetSkill.dependencies.skills) {
        resolveSkillNode(childId);
      }

      // Add packages
      for (const pkg of targetSkill.dependencies.packages) {
        const isInstalled = installedPackages.has(pkg.name);
        installOrder.push({
          name: pkg.name,
          type: pkg.type,
          version: pkg.version,
          status: isInstalled ? 'ALREADY_INSTALLED' : 'TO_INSTALL',
        });
      }

      recursionStack.delete(skillId);
    };

    resolveSkillNode(manifest.id);

    // 2. System dependencies check (e.g. ffmpeg, chromium, git)
    for (const sys of manifest.dependencies.system) {
      // In production, can check `which sys` or `where sys`
      if (sys === 'cuda' && process.env.CUDA_HOME === undefined && process.env.CUDA_PATH === undefined) {
        missingSystemDeps.push(sys);
      }
    }

    const resolved = errors.length === 0 && missingSkills.length === 0 && !circularDetected;

    return {
      skillId: manifest.id,
      resolved,
      installOrder,
      missingSystemDeps,
      missingSkills,
      circularDetected,
      errors,
    };
  }
}
