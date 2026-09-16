import { Workflow, WorkflowRun, WorkflowStep } from './workflow-types.js';
import { TaskManager } from '../tasks/task-manager.js';
import { TaskStore } from '../tasks/task-store.js';

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows: Map<string, Workflow> = new Map();
  private runs: Map<string, WorkflowRun> = new Map();
  private taskManager?: TaskManager;
  private taskStore: TaskStore;

  constructor(taskManager?: TaskManager, taskStore?: TaskStore) {
    this.taskManager = taskManager;
    this.taskStore = taskStore || TaskStore.getInstance();
    this.seedDefaultWorkflows();
  }

  public static getInstance(taskManager?: TaskManager): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine(taskManager);
    }
    return WorkflowEngine.instance;
  }

  public setTaskManager(taskManager: TaskManager): void {
    this.taskManager = taskManager;
  }

  private seedDefaultWorkflows(): void {
    const researchWorkflow: Workflow = {
      id: 'wf_research_deep',
      name: 'Autonomous Deep Research Pipeline',
      description: 'Multi-source search, data extraction, deduplication, and verified report generation',
      steps: [
        {
          id: 'step_search',
          name: 'Broad Search & Query Expansion',
          taskType: 'RESEARCH',
          dependsOn: [],
          inputTemplate: { stage: 'search' }
        },
        {
          id: 'step_fetch',
          name: 'Extract & Parse Source Documents',
          taskType: 'RESEARCH',
          dependsOn: ['step_search'],
          inputTemplate: { stage: 'fetch' }
        },
        {
          id: 'step_synthesize',
          name: 'Cognitive Synthesis & Verification',
          taskType: 'GENERAL',
          dependsOn: ['step_fetch'],
          inputTemplate: { stage: 'synthesize' }
        },
        {
          id: 'step_report',
          name: 'Generate Final Formatted Report',
          taskType: 'GENERAL',
          dependsOn: ['step_synthesize'],
          inputTemplate: { stage: 'report' }
        }
      ],
      createdAt: '2026-09-16T00:00:00.000Z'
    };

    this.registerWorkflow(researchWorkflow);
  }

  public registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  public getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  public listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  public async startRun(
    workflowId: string,
    initialInput: Record<string, unknown>,
    userId = 'usr_default'
  ): Promise<WorkflowRun> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow [${workflowId}] not found`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const stepStates: Record<string, 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'> = {};

    for (const step of workflow.steps) {
      stepStates[step.id] = 'PENDING';
    }

    const run: WorkflowRun = {
      id: runId,
      workflowId,
      userId,
      status: 'RUNNING',
      stepTasks: {},
      stepStates,
      progress: 0,
      startedAt: new Date().toISOString()
    };

    this.runs.set(runId, run);

    // Trigger initial ready steps
    await this.advance(runId, initialInput);

    return { ...run };
  }

  public async advance(
    runId: string,
    contextInput?: Record<string, unknown>
  ): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`WorkflowRun [${runId}] not found`);
    }

    const workflow = this.workflows.get(run.workflowId);
    if (!workflow) {
      throw new Error(`Workflow [${run.workflowId}] not found`);
    }

    let allCompleted = true;
    let anyFailed = false;

    // Evaluate step states by checking underlying tasks in TaskStore
    for (const step of workflow.steps) {
      const existingTaskId = run.stepTasks[step.id];
      if (existingTaskId) {
        const task = await this.taskStore.getTask(existingTaskId);
        if (task) {
          if (task.status === 'SUCCEEDED') {
            run.stepStates[step.id] = 'SUCCEEDED';
          } else if (task.status === 'FAILED') {
            run.stepStates[step.id] = 'FAILED';
            if (!step.isOptional) anyFailed = true;
          } else if (task.status === 'RUNNING' || task.status === 'QUEUED') {
            run.stepStates[step.id] = 'RUNNING';
            allCompleted = false;
          }
        }
      } else {
        allCompleted = false;
      }
    }

    if (anyFailed) {
      run.status = 'FAILED';
      return { ...run };
    }

    // Identify ready steps (whose dependencies are all SUCCEEDED)
    for (const step of workflow.steps) {
      if (run.stepStates[step.id] === 'PENDING') {
        const depsSatisfied = step.dependsOn.every(
          (depId) => run.stepStates[depId] === 'SUCCEEDED'
        );

        if (depsSatisfied && this.taskManager) {
          // Launch task for this step
          const task = await this.taskManager.createTask({
            userId: run.userId,
            workflowId: run.id,
            type: step.taskType,
            title: `[${workflow.name}] ${step.name}`,
            input: { ...step.inputTemplate, ...(contextInput || {}) },
            metadata: { stepId: step.id, workflowRunId: run.id }
          });

          run.stepTasks[step.id] = task.id;
          run.stepStates[step.id] = 'RUNNING';
          allCompleted = false;
        } else if (!depsSatisfied) {
          allCompleted = false;
        }
      }
    }

    // Calculate total progress
    const completedCount = Object.values(run.stepStates).filter(
      (s) => s === 'SUCCEEDED'
    ).length;
    run.progress = Math.round((completedCount / workflow.steps.length) * 100);

    if (allCompleted) {
      run.status = 'COMPLETED';
      run.completedAt = new Date().toISOString();
      run.progress = 100;
    }

    return { ...run };
  }

  public getRun(runId: string): WorkflowRun | undefined {
    const r = this.runs.get(runId);
    return r ? { ...r } : undefined;
  }

  public listRuns(workflowId?: string): WorkflowRun[] {
    let list = Array.from(this.runs.values());
    if (workflowId) {
      list = list.filter((r) => r.workflowId === workflowId);
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
}
