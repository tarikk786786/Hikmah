import { AgentTask, CriticIssue, CriticReviewResult } from '../core/types.js';

export class CriticAgent {
  public id = 'agent_critic_01';
  public name = 'Adversarial Critic & Verification Agent';
  public version = '1.0.0';

  /**
   * Reviews all completed task outputs in a workflow before final synthesis
   */
  public async review(
    goal: string,
    tasks: AgentTask[],
    taskOutputs: Map<string, Record<string, unknown>>
  ): Promise<CriticReviewResult> {
    const issues: CriticIssue[] = [];
    const missingEvidence: string[] = [];
    const requiredActions: string[] = [];

    // 1. Completeness Check: Did all non-critic tasks finish?
    const nonCriticTasks = tasks.filter(t => t.agentType !== 'critic' && t.agentType !== 'synthesis');
    const incomplete = nonCriticTasks.filter(t => t.status !== 'completed');

    if (incomplete.length > 0) {
      issues.push({
        severity: 'MAJOR',
        type: 'INSTRUCTION_INCOMPLETE',
        description: `${incomplete.length} subtask(s) failed or remained unexecuted (${incomplete.map(t => t.objective).join(', ')})`,
        suggestedAction: 'Rerun failed tasks or compensate with secondary agent'
      });
      requiredActions.push('Execute missing subtask pipeline');
    }

    // 2. Evidence Support & Factual Grounding Check
    let totalEvidenceCount = 0;
    for (const task of nonCriticTasks) {
      const output = taskOutputs.get(task.taskId) || task.outputs || {};
      const evList = (output.evidence as string[]) || (output.sources as unknown[]) || [];
      totalEvidenceCount += evList.length;

      // If task claimed research or security but produced zero references
      if ((task.agentType === 'research' || task.agentType === 'security' || task.agentType === 'osint') && evList.length === 0) {
        if (!output.findings && !output.summary && !output.data) {
          missingEvidence.push(task.objective);
          issues.push({
            severity: 'MAJOR',
            type: 'MISSING_EVIDENCE',
            description: `Task [${task.objective}] lacks ground-truth evidence artifacts`,
            suggestedAction: 'Query verified search or retrieval engine'
          });
        }
      }
    }

    // 3. Hallucination Guard
    if (nonCriticTasks.length > 1 && totalEvidenceCount === 0 && !goal.toLowerCase().includes('hello') && !goal.toLowerCase().includes('help')) {
      issues.push({
        severity: 'MINOR',
        type: 'FACTUAL_ACCURACY',
        description: 'Output relies on internal model priors without external evidence citations',
        suggestedAction: 'Ground claims with primary citations'
      });
    }

    // Determine status
    let status: 'PASS' | 'REVISE' | 'FAIL' = 'PASS';
    const hasCritical = issues.some(i => i.severity === 'CRITICAL');
    const hasMajor = issues.some(i => i.severity === 'MAJOR');

    if (hasCritical) {
      status = 'FAIL';
    } else if (hasMajor) {
      status = 'REVISE';
    }

    const confidenceScore = Math.max(0.2, 1.0 - (issues.length * 0.15));

    return {
      status,
      confidenceScore: Math.min(1.0, confidenceScore),
      issues,
      missingEvidence,
      requiredActions,
      reviewedAt: new Date().toISOString()
    };
  }
}
