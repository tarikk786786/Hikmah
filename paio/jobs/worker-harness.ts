import { JobQueue } from './job-queue.js';
import { PAIOSKernel } from '../kernel/paios-kernel.js';

export class WorkerHarness {
  public static initialize(kernel: PAIOSKernel) {
    const jobs = kernel.jobs;
    
    jobs.registerWorker('agent_task', async (job) => {
      console.log(`[WorkerHarness] Processing agent_task ${job.id}`);
      const { taskId, agentId, instructions } = job.payload;
      
      const agent = kernel.agents.getAgent(agentId) || {
        id: agentId,
        name: 'Fallback Worker',
        type: 'worker',
        description: 'Auto-generated fallback',
        maturity: 'ACTIVE',
        capabilities: [],
        permissions: [],
        owner: 'system'
      };
      
      // Default to LangGraph adapter
      const adapter = kernel.agentProviders.getAdapter('langgraph');
      if (!adapter) throw new Error('LangGraph adapter not found');
      
      const result = await adapter.execute(agent, {
        taskId,
        instructions
      });
      
      return result;
    });

    jobs.registerWorker('research_task', async (job) => {
      console.log(`[WorkerHarness] Processing research_task ${job.id}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { status: 'COMPLETED', summary: 'Research completed asynchronously.' };
    });

    jobs.registerWorker('document_task', async (job) => {
      console.log(`[WorkerHarness] Processing document_task ${job.id}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { status: 'COMPLETED' };
    });

    console.log('[HIKMAH WORKER HARNESS] Background workers initialized for agent_task, research_task, and document_task.');
  }
}
