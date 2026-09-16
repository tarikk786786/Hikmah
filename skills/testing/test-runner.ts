import { UniversalSkillManifest } from '../manifests/types.js';
import { SkillSandbox } from '../sandbox/skill-sandbox.js';

export interface TestCase {
  id: string;
  name: string;
  type: 'inputs' | 'outputs' | 'permissions' | 'basic' | 'security';
  inputs: Record<string, any>;
  expectedSuccess: boolean;
  expectSecurityViolation?: boolean;
}

export interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface SkillTestSuiteReport {
  skillId: string;
  version: string;
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  results: TestResult[];
}

export class SkillTestRunner {
  private static instance: SkillTestRunner;
  private sandbox: SkillSandbox;

  constructor() {
    this.sandbox = SkillSandbox.getInstance();
  }

  public static getInstance(): SkillTestRunner {
    if (!SkillTestRunner.instance) {
      SkillTestRunner.instance = new SkillTestRunner();
    }
    return SkillTestRunner.instance;
  }

  /**
   * Runs the complete validation test suite on a skill.
   */
  public async runTests(manifest: UniversalSkillManifest, customTests?: TestCase[]): Promise<SkillTestSuiteReport> {
    const tests: TestCase[] = customTests || [
      {
        id: 'test-basic-init',
        name: 'Basic Initialization and Manifest Contract Test',
        type: 'basic',
        inputs: {},
        expectedSuccess: true,
      },
      {
        id: 'test-input-schema',
        name: 'Required Inputs Validation Test',
        type: 'inputs',
        inputs: { testParam: 'test-value' },
        expectedSuccess: true,
      },
      {
        id: 'test-sandbox-isolation',
        name: 'Sandbox Boundary and Resource Limit Test',
        type: 'security',
        inputs: {},
        expectedSuccess: true,
      },
    ];

    const results: TestResult[] = [];

    for (const t of tests) {
      const start = Date.now();
      const execResult = await this.sandbox.executeSkill(manifest, t.name, {
        inputs: t.inputs,
        timeoutMs: 5000,
      });

      const passed = t.expectSecurityViolation 
        ? execResult.securityViolation === true
        : execResult.success === t.expectedSuccess;

      results.push({
        testId: t.id,
        name: t.name,
        passed,
        durationMs: Date.now() - start,
        error: execResult.error,
      });
    }

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.length - passedCount;

    return {
      skillId: manifest.id,
      version: manifest.version,
      timestamp: new Date().toISOString(),
      totalTests: tests.length,
      passedCount,
      failedCount,
      allPassed: failedCount === 0,
      results,
    };
  }
}
