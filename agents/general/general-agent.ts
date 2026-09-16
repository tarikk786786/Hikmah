import { Agent, AgentRun, AgentType } from '../types.js';
import { TaskPlanner, ExecutionPlan } from '../../core/planner/planner.js';
import { JarvisCore } from '../../core/assistant/jarvis-core.js';

export class GeneralAgent implements Agent {
  public id = 'agent_general_01';
  public name = 'General Reasoning Agent';
  public type: AgentType = 'general';
  public description = 'Standard cognitive coordination and multi-tool goal execution agent';

  private planner: TaskPlanner;
  private core: JarvisCore;

  constructor(core?: JarvisCore) {
    this.core = core || new JarvisCore();
    this.planner = new TaskPlanner();
  }

  async plan(goal: string): Promise<ExecutionPlan> {
    const availableTools = this.core.getTools().listTools().filter(t => t.enabled).map(t => t.name);
    return this.planner.createPlan(goal, availableTools);
  }

  async execute(run: AgentRun): Promise<AgentRun> {
    run.status = 'running';
    run.startedAt = new Date().toISOString();

    try {
      const goal = String(run.input.goal || run.input.query || '');
      run.plan = await this.plan(goal);

      const res = await this.core.process({
        query: goal,
        userId: run.userId,
        conversationId: run.conversationId
      });

      run.output = {
        result: res.content,
        toolResults: res.toolResults,
        memoriesUsed: res.memoriesUsed
      };
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
    } catch (err: unknown) {
      run.status = 'failed';
      run.error = (err as Error).message;
      run.completedAt = new Date().toISOString();
    }

    return run;
  }

  async validate(output: Record<string, unknown>): Promise<boolean> {
    return Boolean(output && (output.result || output.toolResults));
  }

  async summarize(run: AgentRun): Promise<string> {
    if (run.status === 'completed') {
      return `Agent executed successfully with ${((run.output?.toolResults as unknown[]) || []).length} tool calls.`;
    }
    return `Agent run ended with status: ${run.status}. Error: ${run.error || 'none'}`;
  }
}
