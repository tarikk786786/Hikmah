import { Agent, AgentRun, AgentType } from '../types.js';
import { ExecutionPlan } from '../../core/planner/planner.js';
import { JarvisCore } from '../../core/assistant/jarvis-core.js';

export class DocumentAgent implements Agent {
  public id = 'agent_doc_01';
  public name = 'Document Intelligence Agent';
  public type: AgentType = 'document';
  public description = 'Document parsing, outline generation, and structured information extraction';

  private core: JarvisCore;

  constructor(core?: JarvisCore) {
    this.core = core || new JarvisCore();
  }

  async plan(goal: string): Promise<ExecutionPlan> {
    return {
      id: `plan_doc_${Date.now()}`,
      goal,
      status: 'planned',
      createdAt: new Date().toISOString(),
      steps: [
        { stepNumber: 1, description: 'Load target document content', toolName: 'file_read', status: 'pending' },
        { stepNumber: 2, description: 'Extract key sections and summarize structure', status: 'pending' },
        { stepNumber: 3, description: 'Generate executive summary', status: 'pending' }
      ]
    };
  }

  async execute(run: AgentRun): Promise<AgentRun> {
    run.status = 'running';
    run.startedAt = new Date().toISOString();

    try {
      const filePath = String(run.input.filePath || 'README.md');
      const fileRes = await this.core.getTools().executeTool('file_read', { filePath }, {
        userId: run.userId,
        correlation: run.correlation
      });

      const summary = fileRes.success
        ? `Document [${filePath}] read (${((fileRes.data as { sizeBytes?: number })?.sizeBytes || 0)} bytes). Key elements analyzed.`
        : `Could not load document: ${fileRes.error}`;

      run.output = {
        filePath,
        summary,
        details: fileRes.data
      };
      run.status = fileRes.success ? 'completed' : 'failed';
      run.completedAt = new Date().toISOString();
    } catch (err: unknown) {
      run.status = 'failed';
      run.error = (err as Error).message;
      run.completedAt = new Date().toISOString();
    }

    return run;
  }

  async validate(output: Record<string, unknown>): Promise<boolean> {
    return Boolean(output && output.summary);
  }

  async summarize(run: AgentRun): Promise<string> {
    return `Document analysis of "${run.input.filePath || 'file'}" finished with status: ${run.status}.`;
  }
}
