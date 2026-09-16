import { UniversalSkillManifest, SkillSecurityScanResult, SkillCompatibilityReport } from '../manifests/types.js';
import { SkillRegistry } from '../registry/skill-registry.js';
import { SkillSecurityScanner } from '../security/security-scanner.js';
import { SkillCompatibilityEngine } from '../compatibility/compatibility-engine.js';
import { SkillDependencyResolver } from '../dependencies/dependency-resolver.js';
import { SkillTestRunner } from '../testing/test-runner.js';
import { SkillVersionManager } from '../versioning/version-manager.js';
import { SkillKillSwitch } from '../security/kill-switch.js';

export interface SkillInstallResult {
  success: boolean;
  skillId: string;
  version: string;
  installed: boolean;
  securityScan: SkillSecurityScanResult;
  compatibility: SkillCompatibilityReport;
  error?: string;
  rollbackTriggered?: boolean;
}

export class SkillInstaller {
  private static instance: SkillInstaller;
  private registry: SkillRegistry;
  private scanner: SkillSecurityScanner;
  private compatibility: SkillCompatibilityEngine;
  private resolver: SkillDependencyResolver;
  private testRunner: SkillTestRunner;
  private versionManager: SkillVersionManager;
  private killSwitch: SkillKillSwitch;

  constructor() {
    this.registry = SkillRegistry.getInstance();
    this.scanner = SkillSecurityScanner.getInstance();
    this.compatibility = SkillCompatibilityEngine.getInstance();
    this.resolver = SkillDependencyResolver.getInstance();
    this.testRunner = SkillTestRunner.getInstance();
    this.versionManager = SkillVersionManager.getInstance();
    this.killSwitch = SkillKillSwitch.getInstance();
  }

  public static getInstance(): SkillInstaller {
    if (!SkillInstaller.instance) {
      SkillInstaller.instance = new SkillInstaller();
    }
    return SkillInstaller.instance;
  }

  /**
   * Inspects a skill before installation, providing full security, compatibility, and dependency reports.
   */
  public async inspectSkill(skillId: string): Promise<{
    manifest: UniversalSkillManifest;
    securityScan: SkillSecurityScanResult;
    compatibility: SkillCompatibilityReport;
    isInstalled: boolean;
  } | undefined> {
    const manifest = this.registry.getSkill(skillId);
    if (!manifest) return undefined;

    const securityScan = await this.scanner.scanSkill(manifest);
    const compatibility = this.compatibility.evaluateCompatibility(manifest);
    const isInstalled = this.registry.isInstalled(skillId);

    return { manifest, securityScan, compatibility, isInstalled };
  }

  /**
   * Complete safe installation pipeline.
   */
  public async installSkill(skillId: string, options?: { force?: boolean }): Promise<SkillInstallResult> {
    const manifest = this.registry.getSkill(skillId);
    if (!manifest) {
      return {
        success: false,
        skillId,
        version: '0.0.0',
        installed: false,
        securityScan: {} as any,
        compatibility: {} as any,
        error: `Skill '${skillId}' not found in registry.`,
      };
    }

    // Step 1: Security Scan
    const securityScan = await this.scanner.scanSkill(manifest);
    if (!securityScan.passed && !options?.force) {
      return {
        success: false,
        skillId,
        version: manifest.version,
        installed: false,
        securityScan,
        compatibility: {} as any,
        error: `Security scan failed: ${securityScan.findings.map(f => f.message).join('; ')}`,
      };
    }

    // Step 2: Compatibility Evaluation
    const compatibility = this.compatibility.evaluateCompatibility(manifest);
    if (!compatibility.compatible && !options?.force) {
      return {
        success: false,
        skillId,
        version: manifest.version,
        installed: false,
        securityScan,
        compatibility,
        error: `Compatibility check failed: ${compatibility.issues.join('; ')}`,
      };
    }

    // Step 3: Dependency Resolution
    const installedMap = new Map(this.registry.listInstalledSkills().map(s => [s.id, s]));
    const depPlan = this.resolver.resolveDependencies(manifest, installedMap);
    if (!depPlan.resolved && !options?.force) {
      return {
        success: false,
        skillId,
        version: manifest.version,
        installed: false,
        securityScan,
        compatibility,
        error: `Missing dependencies: ${depPlan.missingSkills.join(', ')}`,
      };
    }

    // Step 4: Sandbox Pre-flight Tests
    const testReport = await this.testRunner.runTests(manifest);
    if (!testReport.allPassed && !options?.force) {
      return {
        success: false,
        skillId,
        version: manifest.version,
        installed: false,
        securityScan,
        compatibility,
        error: `Sandbox pre-flight tests failed (${testReport.failedCount}/${testReport.totalTests} failed).`,
      };
    }

    // Step 5: Lockfile Recording & Version History
    this.versionManager.recordInstalledVersion(manifest);

    // Step 6: Mark Installed and Enabled
    manifest.installedAt = new Date().toISOString();
    manifest.state = 'INSTALLED';
    manifest.enabled = true;
    this.registry.registerInstalledSkill(manifest);
    this.killSwitch.enable(manifest.id, 'Skill installed and verified');

    return {
      success: true,
      skillId,
      version: manifest.version,
      installed: true,
      securityScan,
      compatibility,
    };
  }

  /**
   * Uninstalls a skill from the system.
   */
  public uninstallSkill(skillId: string): boolean {
    const isInstalled = this.registry.isInstalled(skillId);
    if (!isInstalled) return false;

    this.registry.removeInstalledSkill(skillId);
    this.versionManager.removeLockEntry(skillId);
    this.killSwitch.delete(skillId, 'User uninstalled skill');
    return true;
  }

  /**
   * Updates an installed skill to a new version with canary test and auto-rollback on failure.
   */
  public async updateSkill(skillId: string, targetVersion?: string): Promise<SkillInstallResult> {
    const current = this.registry.getSkill(skillId);
    if (!current) {
      return {
        success: false,
        skillId,
        version: 'unknown',
        installed: false,
        securityScan: {} as any,
        compatibility: {} as any,
        error: `Skill '${skillId}' not found for update.`,
      };
    }

    // Backup current version in case of rollback
    const previousVersion = current.version;

    // Run installation of target
    const result = await this.installSkill(skillId);
    if (!result.success) {
      // Trigger automatic canary rollback
      const rollbackResult = this.versionManager.rollback(skillId);
      return {
        ...result,
        rollbackTriggered: rollbackResult.success,
        error: `${result.error} (Rolled back to v${previousVersion})`,
      };
    }

    return result;
  }

  /**
   * Manually rolls back a skill to its previous version.
   */
  public rollbackSkill(skillId: string): { success: boolean; message: string; version?: string } {
    const res = this.versionManager.rollback(skillId);
    if (res.success && res.rolledBackTo) {
      this.registry.registerInstalledSkill(res.rolledBackTo);
      return {
        success: true,
        version: res.rolledBackTo.version,
        message: res.message,
      };
    }
    return { success: false, message: res.message };
  }
}
