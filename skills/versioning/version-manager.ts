import { UniversalSkillManifest, SkillLockFile, SkillLockEntry } from '../manifests/types.js';
import crypto from 'crypto';

export class SkillVersionManager {
  private static instance: SkillVersionManager;
  private lockFile: SkillLockFile;
  private versionHistory: Map<string, UniversalSkillManifest[]> = new Map();

  constructor() {
    this.lockFile = {
      version: 1,
      generatedAt: new Date().toISOString(),
      skills: {},
    };
  }

  public static getInstance(): SkillVersionManager {
    if (!SkillVersionManager.instance) {
      SkillVersionManager.instance = new SkillVersionManager();
    }
    return SkillVersionManager.instance;
  }

  public getLockFile(): SkillLockFile {
    return { ...this.lockFile, skills: { ...this.lockFile.skills } };
  }

  public recordInstalledVersion(manifest: UniversalSkillManifest): void {
    // 1. Push to history stack
    const history = this.versionHistory.get(manifest.id) || [];
    // Only push if not exact duplicate version
    if (!history.some(h => h.version === manifest.version)) {
      history.push({ ...manifest });
      this.versionHistory.set(manifest.id, history);
    }

    // 2. Compute permissions hash to detect supply-chain modifications
    const permHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifest.permissions))
      .digest('hex');

    const depsMap: Record<string, string> = {};
    for (const pkg of manifest.dependencies.packages) {
      depsMap[pkg.name] = pkg.version;
    }

    // 3. Update lock entry
    const entry: SkillLockEntry = {
      id: manifest.id,
      version: manifest.version,
      sha256: manifest.sha256 || 'unknown-sha256',
      source: manifest.source,
      installedAt: new Date().toISOString(),
      dependencies: depsMap,
      permissionsHash: permHash,
    };

    this.lockFile.skills[manifest.id] = entry;
    this.lockFile.generatedAt = new Date().toISOString();
  }

  public removeLockEntry(skillId: string): boolean {
    if (this.lockFile.skills[skillId]) {
      delete this.lockFile.skills[skillId];
      this.lockFile.generatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getPreviousVersion(skillId: string): UniversalSkillManifest | undefined {
    const history = this.versionHistory.get(skillId);
    if (!history || history.length < 2) return undefined;
    // Return second to last version
    return history[history.length - 2];
  }

  public rollback(skillId: string): { success: boolean; rolledBackTo?: UniversalSkillManifest; message: string } {
    const previous = this.getPreviousVersion(skillId);
    if (!previous) {
      return {
        success: false,
        message: `No previous version available for skill '${skillId}' to rollback to.`,
      };
    }

    // Pop the current broken version
    const history = this.versionHistory.get(skillId)!;
    history.pop();
    this.versionHistory.set(skillId, history);

    // Re-record previous version in lockfile
    this.recordInstalledVersion(previous);

    return {
      success: true,
      rolledBackTo: previous,
      message: `Successfully rolled back skill '${skillId}' to version ${previous.version}.`,
    };
  }

  public listVersions(skillId: string): string[] {
    const history = this.versionHistory.get(skillId);
    return history ? history.map(h => h.version) : [];
  }
}
