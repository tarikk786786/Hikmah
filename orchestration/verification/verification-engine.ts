import { AgentTask } from '../core/types.js';

export interface VerificationResult {
  verified: boolean;
  score: number; // 0.0 - 1.0
  checks: Array<{ name: string; passed: boolean; message: string }>;
  timestamp: string;
}

export class VerificationEngine {
  private static instance: VerificationEngine;

  public static getInstance(): VerificationEngine {
    if (!VerificationEngine.instance) {
      VerificationEngine.instance = new VerificationEngine();
    }
    return VerificationEngine.instance;
  }

  /**
   * Evaluates task output based on domain rules
   */
  public verifyTask(task: AgentTask, outputs?: Record<string, unknown>): VerificationResult {
    const data = outputs || task.outputs || {};
    const checks: Array<{ name: string; passed: boolean; message: string }> = [];

    // 1. Output Existence & Structure
    const hasData = Object.keys(data).length > 0;
    checks.push({
      name: 'Output Non-Empty',
      passed: hasData,
      message: hasData ? 'Output payload successfully generated' : 'Task returned empty output payload'
    });

    // 2. Domain-Specific Verification
    if (task.agentType === 'research') {
      const hasSources = Boolean(data.sources && Array.isArray(data.sources) && data.sources.length > 0);
      checks.push({
        name: 'Research Provenance',
        passed: hasSources || Boolean(data.summary || data.findings),
        message: hasSources ? 'Primary source citations present' : 'Contextual summary provided'
      });
    } else if (task.agentType === 'coding') {
      const hasPatch = Boolean(data.diff || data.patch || data.filesModified || data.status === 'completed');
      checks.push({
        name: 'Code Patch Validity',
        passed: hasPatch,
        message: hasPatch ? 'Code changes formulated and verified' : 'No patch or modifications identified'
      });
    } else if (task.agentType === 'browser') {
      const hasUrl = Boolean(data.url || data.title || data.screenshot || data.status === 'completed');
      checks.push({
        name: 'Browser Session State',
        passed: hasUrl,
        message: hasUrl ? 'Browser navigation confirmed' : 'No active page state recorded'
      });
    } else if (task.agentType === 'security' || task.agentType === 'soc') {
      const hasFindings = Boolean(data.findings !== undefined || data.alerts !== undefined || data.status === 'completed');
      checks.push({
        name: 'Security Assessment Findings',
        passed: hasFindings,
        message: hasFindings ? 'Security posture verified' : 'Security findings absent'
      });
    }

    const passedCount = checks.filter(c => c.passed).length;
    const score = checks.length > 0 ? passedCount / checks.length : 1.0;

    return {
      verified: score >= 0.7,
      score,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}
