import { describe, it, expect } from 'vitest';
import { ContextService } from '../orchestration/context/context-service.js';
import { ArtifactBus } from '../orchestration/artifacts/artifact-bus.js';

describe('PRD 20: Context Service & Artifact Bus', () => {
  it('should publish, retrieve, and index typed artifacts via ArtifactBus', async () => {
    const artifactBus = ArtifactBus.getInstance();

    const published = await artifactBus.publishArtifact({
      workflowId: 'wf_run_999',
      taskId: 'task_code_patch',
      name: 'PQC_Implementation.patch',
      type: 'code_patch',
      data: '--- a/crypto.rs\n+++ b/crypto.rs\n@@ -1,3 +1,3 @@\n-pub fn encrypt() {}\n+pub fn mlkem_encrypt() {}',
      mimeType: 'text/x-diff',
    });

    expect(published).toBeDefined();
    expect(published.artifactId).toBeDefined();
    expect(published.sha256).toBeDefined();
    expect(published.sizeBytes).toBeGreaterThan(0);

    const fetched = artifactBus.getArtifact(published.artifactId);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('PQC_Implementation.patch');

    const list = artifactBus.listByWorkflow('wf_run_999');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some(a => a.artifactId === published.artifactId)).toBe(true);
  });

  it('should assemble token-budgeted context without blowing limits', async () => {
    const contextService = new ContextService();

    const context = await contextService.buildContext({
      workflowId: 'wf_test',
      taskId: 't_test',
      query: 'Quantum resistant algorithms',
      userId: 'usr_test',
      prerequisiteOutputs: { research: 'NIST standardized ML-KEM and ML-DSA in 2024.' },
      evidence: ['NIST FIPS 203'],
      maxTokens: 4000,
    });

    expect(context).toBeDefined();
    expect(context.estimatedTokenCount).toBeLessThanOrEqual(4000);
    expect(context.evidenceSnippets.length).toBeGreaterThanOrEqual(1);
  });
});
