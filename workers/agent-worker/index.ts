import { TaskQueue } from '../../workflows/queue/queue.js';
import { GeneralAgent } from '../../agents/general/general-agent.js';
import { ResearchAgent } from '../../agents/research/research-agent.js';
import { DocumentAgent } from '../../agents/document/document-agent.js';
import { AuditLogger } from '../../security/audit/logger.js';
import { AgentRun } from '../../agents/types.js';

export function setupWorkers(queue: TaskQueue): void {
  const generalAgent = new GeneralAgent();
  const researchAgent = new ResearchAgent();
  const documentAgent = new DocumentAgent();

  // 1. Agent Task Handler
  queue.registerHandler('agent_task', async (job) => {
    const correlation = AuditLogger.createCorrelation({
      jobId: job.id,
      userId: job.userId
    });

    AuditLogger.log('WORKER_AGENT_TASK_START', 'LOW', correlation, { jobId: job.id });

    const run: AgentRun = {
      id: `run_${job.id}`,
      agentType: 'general',
      userId: job.userId,
      status: 'queued',
      input: job.payload,
      correlation,
      createdAt: new Date().toISOString()
    };

    const completedRun = await generalAgent.execute(run);
    return completedRun.output;
  });

  // 2. Research Task Handler
  queue.registerHandler('research_task', async (job) => {
    const correlation = AuditLogger.createCorrelation({
      jobId: job.id,
      userId: job.userId
    });

    AuditLogger.log('WORKER_RESEARCH_TASK_START', 'LOW', correlation, { jobId: job.id });

    const run: AgentRun = {
      id: `run_research_${job.id}`,
      agentType: 'research',
      userId: job.userId,
      status: 'queued',
      input: job.payload,
      correlation,
      createdAt: new Date().toISOString()
    };

    const completedRun = await researchAgent.execute(run);
    return completedRun.output;
  });

  // 3. Document Task Handler
  queue.registerHandler('document_task', async (job) => {
    const correlation = AuditLogger.createCorrelation({
      jobId: job.id,
      userId: job.userId
    });

    const run: AgentRun = {
      id: `run_doc_${job.id}`,
      agentType: 'document',
      userId: job.userId,
      status: 'queued',
      input: job.payload,
      correlation,
      createdAt: new Date().toISOString()
    };

    const completedRun = await documentAgent.execute(run);
    return completedRun.output;
  });

  console.log('[JARVIS WORKER HARNESS] Background workers initialized for agent_task, research_task, and document_task.');
}

// Standalone execution if executed directly via ts-node
if (require.main === module) {
  const queue = new TaskQueue();
  setupWorkers(queue);
  console.log('[JARVIS WORKER HARNESS] Worker process listening for jobs...');
}
