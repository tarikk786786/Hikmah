import { describe, it, expect } from 'vitest';
import { VerificationEngine } from '../orchestration/verification/verification-engine.js';
import { CriticAgent } from '../orchestration/critic/critic-agent.js';
import { SynthesisAgent } from '../orchestration/synthesis/synthesis-agent.js';

describe('PRD 20: Verification Engine, Critic Agent & Response Synthesis', () => {
  const verificationEngine = new VerificationEngine();
  const critic = new CriticAgent();
  const synthesis = new SynthesisAgent();

  it('should verify coding output deterministically', async () => {
    const task = {
      taskId: 'task_code_1',
      workflowId: 'wf_1',
      objective: 'Write patch',
      agentType: 'coding',
      capability: 'code_modification',
      priority: 'HIGH' as const,
      status: 'completed' as const,
      dependencies: [],
      inputs: {},
      resourceLimits: {},
      retries: 0,
      maxRetries: 1,
      createdAt: new Date().toISOString()
    };

    const result = verificationEngine.verifyTask(
      task,
      {
        diff: '--- a/main.ts\n+++ b/main.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;',
      }
    );

    expect(result.verified).toBe(true);
    expect(result.checks.some(c => c.name === 'Code Patch Validity' && c.passed)).toBe(true);
  });

  it('should flag ungrounded outputs in Critic adversarial review', async () => {
    const tasks = [
      {
        taskId: 't_res',
        workflowId: 'wf_1',
        objective: 'Research Standards',
        agentType: 'research',
        capability: 'research',
        priority: 'HIGH' as const,
        status: 'completed' as const,
        dependencies: [],
        inputs: {},
        resourceLimits: {},
        retries: 0,
        maxRetries: 1,
        createdAt: new Date().toISOString()
      },
      {
        taskId: 't_audit',
        workflowId: 'wf_1',
        objective: 'Security Audit',
        agentType: 'security',
        capability: 'security',
        priority: 'HIGH' as const,
        status: 'completed' as const,
        dependencies: [],
        inputs: {},
        resourceLimits: {},
        retries: 0,
        maxRetries: 1,
        createdAt: new Date().toISOString()
      }
    ];

    const outputsMap = new Map<string, Record<string, unknown>>();
    outputsMap.set('t_res', {
      claim: 'NIST selected SHA-1 as the primary quantum-resistant algorithm in 2024.',
      sources: [],
      evidence: []
    });
    outputsMap.set('t_audit', {
      sources: [],
      evidence: []
    });

    const review = await critic.review(
      'Analyze NIST Post-Quantum Standards',
      tasks,
      outputsMap
    );

    expect(review.status).toBe('REVISE');
    expect(review.issues.length).toBeGreaterThanOrEqual(1);
    expect(review.confidenceScore).toBeLessThan(0.8);
  });

  it('should approve grounded outputs and synthesize final unified answer', async () => {
    const tasks = [
      {
        taskId: 't1',
        workflowId: 'wf_1',
        objective: 'PQC Research',
        agentType: 'research',
        capability: 'research',
        priority: 'HIGH' as const,
        status: 'completed' as const,
        dependencies: [],
        inputs: {},
        resourceLimits: {},
        retries: 0,
        maxRetries: 1,
        createdAt: new Date().toISOString()
      },
      {
        taskId: 't2',
        workflowId: 'wf_1',
        objective: 'Implementation',
        agentType: 'coding',
        capability: 'code_modification',
        priority: 'HIGH' as const,
        status: 'completed' as const,
        dependencies: ['t1'],
        inputs: {},
        resourceLimits: {},
        retries: 0,
        maxRetries: 1,
        createdAt: new Date().toISOString()
      },
    ];

    const outputsMap = new Map<string, Record<string, unknown>>();
    outputsMap.set('t1', {
      findings: ['NIST finalized FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA) in August 2024.'],
      sources: [{ url: 'https://csrc.nist.gov/pubs/fips/203/final', title: 'NIST FIPS 203' }],
      evidence: ['https://csrc.nist.gov/pubs/fips/203/final']
    });
    outputsMap.set('t2', {
      summary: 'Rust bindings wrapped with zero-knowledge proof support.',
      patch: '--- a/pqc.rs\n+++ b/pqc.rs\n',
      artifacts: ['pqc_rust.patch']
    });

    const review = await critic.review('Implement NIST PQC standards in Rust', tasks, outputsMap);
    expect(review.status).toBe('PASS');
    expect(review.confidenceScore).toBeGreaterThanOrEqual(0.8);

    const synthesized = await synthesis.synthesize('Implement NIST PQC standards in Rust', tasks, outputsMap, review);
    expect(synthesized).toBeDefined();
    expect(synthesized.finalAnswer).toContain('Executive Summary');
    expect(synthesized.citations.length).toBeGreaterThanOrEqual(1);
  });
});

