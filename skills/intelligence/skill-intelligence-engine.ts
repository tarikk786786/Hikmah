import { UniversalSkillManifest, SkillCanDoAssessment, SkillSecurityScanResult } from '../manifests/types.js';
import { SkillRegistry } from '../registry/skill-registry.js';
import { SkillDiscoveryEngine, SkillSearchFilters, SkillSearchResultItem } from '../discovery/discovery-engine.js';
import { SkillCanDoEngine } from '../discovery/can-do-engine.js';
import { SkillSecurityScanner } from '../security/security-scanner.js';
import { SkillPermissionMonitor } from '../security/permission-monitor.js';
import { SkillKillSwitch } from '../security/kill-switch.js';
import { SkillCompatibilityEngine } from '../compatibility/compatibility-engine.js';
import { SkillDependencyResolver } from '../dependencies/dependency-resolver.js';
import { SkillVersionManager } from '../versioning/version-manager.js';
import { SkillSandbox, SandboxExecutionOptions, SandboxExecutionResult } from '../sandbox/skill-sandbox.js';
import { SkillTestRunner, SkillTestSuiteReport } from '../testing/test-runner.js';
import { SkillCertificationTracker } from '../certification/certification-tracker.js';
import { SkillComposer } from '../composition/skill-composer.js';
import { SkillGenerator, SkillGenerationRequest, SkillGenerationResult } from '../generation/skill-generator.js';
import { SkillAnalytics, SkillStats } from '../analytics/skill-analytics.js';
import { PersonalSkillMemory } from '../memory/skill-memory.js';
import { SkillOptimizer, SkillOptimizationRecommendation } from '../optimizer/skill-optimizer.js';
import { SkillInstaller, SkillInstallResult } from '../installer/skill-installer.js';

export class SkillIntelligenceEngine {
  private static instance: SkillIntelligenceEngine;

  public readonly registry: SkillRegistry;
  public readonly discovery: SkillDiscoveryEngine;
  public readonly canDo: SkillCanDoEngine;
  public readonly security: SkillSecurityScanner;
  public readonly monitor: SkillPermissionMonitor;
  public readonly killSwitch: SkillKillSwitch;
  public readonly compatibility: SkillCompatibilityEngine;
  public readonly resolver: SkillDependencyResolver;
  public readonly versioning: SkillVersionManager;
  public readonly sandbox: SkillSandbox;
  public readonly testing: SkillTestRunner;
  public readonly certification: SkillCertificationTracker;
  public readonly composer: SkillComposer;
  public readonly generator: SkillGenerator;
  public readonly analytics: SkillAnalytics;
  public readonly memory: PersonalSkillMemory;
  public readonly optimizer: SkillOptimizer;
  public readonly installer: SkillInstaller;

  constructor() {
    this.registry = SkillRegistry.getInstance();
    this.discovery = SkillDiscoveryEngine.getInstance();
    this.canDo = SkillCanDoEngine.getInstance();
    this.security = SkillSecurityScanner.getInstance();
    this.monitor = SkillPermissionMonitor.getInstance();
    this.killSwitch = SkillKillSwitch.getInstance();
    this.compatibility = SkillCompatibilityEngine.getInstance();
    this.resolver = SkillDependencyResolver.getInstance();
    this.versioning = SkillVersionManager.getInstance();
    this.sandbox = SkillSandbox.getInstance();
    this.testing = SkillTestRunner.getInstance();
    this.certification = SkillCertificationTracker.getInstance();
    this.composer = SkillComposer.getInstance();
    this.generator = SkillGenerator.getInstance();
    this.analytics = SkillAnalytics.getInstance();
    this.memory = PersonalSkillMemory.getInstance();
    this.optimizer = SkillOptimizer.getInstance();
    this.installer = SkillInstaller.getInstance();
  }

  public static getInstance(): SkillIntelligenceEngine {
    if (!SkillIntelligenceEngine.instance) {
      SkillIntelligenceEngine.instance = new SkillIntelligenceEngine();
    }
    return SkillIntelligenceEngine.instance;
  }

  // --- Search & Discovery ---
  public searchSkills(query: string, filters?: SkillSearchFilters): SkillSearchResultItem[] {
    return this.discovery.search(query, filters);
  }

  public canHikmahDoThis(intent: string): SkillCanDoAssessment {
    return this.canDo.evaluateIntent(intent);
  }

  // --- Inspection & Lifecycle ---
  public async inspectSkill(skillId: string) {
    return this.installer.inspectSkill(skillId);
  }

  public async installSkill(skillId: string, options?: { force?: boolean }): Promise<SkillInstallResult> {
    return this.installer.installSkill(skillId, options);
  }

  public uninstallSkill(skillId: string): boolean {
    return this.installer.uninstallSkill(skillId);
  }

  public enableSkill(skillId: string, enabled: boolean): boolean {
    return this.registry.enableSkill(skillId, enabled);
  }

  public async updateSkill(skillId: string): Promise<SkillInstallResult> {
    return this.installer.updateSkill(skillId);
  }

  public rollbackSkill(skillId: string) {
    return this.installer.rollbackSkill(skillId);
  }

  // --- Security & Kill Switch ---
  public async scanSkill(skillId: string): Promise<SkillSecurityScanResult | undefined> {
    const manifest = this.registry.getSkill(skillId);
    if (!manifest) return undefined;
    return this.security.scanSkill(manifest);
  }

  public quarantineSkill(skillId: string, reason: string, evidence?: Record<string, any>) {
    return this.killSwitch.quarantine(skillId, reason, evidence);
  }

  // --- Testing & Sandbox Execution ---
  public async testSkill(skillId: string): Promise<SkillTestSuiteReport | undefined> {
    const manifest = this.registry.getSkill(skillId);
    if (!manifest) return undefined;
    return this.testing.runTests(manifest);
  }

  public async executeSkill(
    skillId: string,
    action: string,
    options: SandboxExecutionOptions
  ): Promise<SandboxExecutionResult> {
    const manifest = this.registry.getSkill(skillId);
    if (!manifest) {
      return {
        success: false,
        error: `Skill '${skillId}' not found.`,
        durationMs: 0,
      };
    }

    const result = await this.sandbox.executeSkill(manifest, action, options);

    // Record analytics
    this.analytics.recordExecution({
      skillId,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      durationMs: result.durationMs,
      success: result.success,
      error: result.error,
      memoryUsedMb: result.memoryUsedMb,
      toolCallsCount: 1,
      securityViolation: result.securityViolation,
    });

    return result;
  }

  // --- Composition & Generation ---
  public async composeSkills(skillIds: string[], name: string, description: string) {
    return this.composer.composeSkills(skillIds, name, description);
  }

  public async generateSkill(req: SkillGenerationRequest): Promise<SkillGenerationResult> {
    return this.generator.generateSkill(req);
  }

  // --- Analytics & Optimization ---
  public getSkillStats(skillId: string): SkillStats {
    return this.analytics.getStats(skillId);
  }

  public getOptimizationRecommendations(): SkillOptimizationRecommendation[] {
    return this.optimizer.analyzeInstalledSkills();
  }
}
