import { AgentTask, TaskPriority, WorkflowPlan } from '../core/types.js';

export class AgentPlanner {
  private static instance: AgentPlanner;

  public static getInstance(): AgentPlanner {
    if (!AgentPlanner.instance) {
      AgentPlanner.instance = new AgentPlanner();
    }
    return AgentPlanner.instance;
  }

  /**
   * Decomposes high-level user objective into an ordered execution plan with dependencies
   */
  public plan(goal: string, workflowId: string = `wf_${Date.now()}`): WorkflowPlan {
    const lower = goal.toLowerCase();
    const tasks: AgentTask[] = [];
    const dependencies: Array<{ from: string; to: string }> = [];
    const requiredCapabilities: string[] = [];
    const suggestedAgents: string[] = [];

    // Analyze intent keywords
    const needsResearch = lower.includes('research') || lower.includes('search') || lower.includes('find out') || lower.includes('competitor');
    const needsBrowser = lower.includes('website') || lower.includes('browse') || lower.includes('page') || lower.includes('login');
    const needsDocument = lower.includes('document') || lower.includes('pdf') || lower.includes('paper') || lower.includes('table');
    const needsOSINT = lower.includes('company') || lower.includes('domain') || lower.includes('person') || lower.includes('osint') || lower.includes('investigate');
    const needsSecurity = lower.includes('security') || lower.includes('vulnerability') || lower.includes('pentest') || lower.includes('soc') || lower.includes('alert');
    const needsCoding = lower.includes('code') || lower.includes('bug') || lower.includes('patch') || lower.includes('repo') || lower.includes('pr') || lower.includes('fix');
    const needsVision = lower.includes('image') || lower.includes('screenshot') || lower.includes('diagram') || lower.includes('chart');

    let taskIndex = 1;
    const defaultLimits = {
      maxRuntimeSeconds: 300,
      maxSteps: 20,
      maxToolCalls: 50,
      maxTokens: 30000,
      maxCostUsd: 0.5
    };

    // 1. Initial Information Gathering (Can execute in parallel)
    const initialTaskIds: string[] = [];

    if (needsResearch) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Execute web deep research for: ${goal}`,
        agentType: 'research',
        capability: 'web_research',
        priority: 'HIGH',
        status: 'pending',
        dependencies: [],
        inputs: { query: goal, mode: 'deep' },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('web_research');
      suggestedAgents.push('ResearchAgent');
    }

    if (needsBrowser) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Inspect targeted web resources and DOM state for: ${goal}`,
        agentType: 'browser',
        capability: 'browser_navigation',
        priority: 'NORMAL',
        status: 'pending',
        dependencies: [],
        inputs: { goal },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('browser_navigation');
      suggestedAgents.push('BrowserAgent');
    }

    if (needsDocument) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Extract, parse, and verify structured document content`,
        agentType: 'document',
        capability: 'document_analysis',
        priority: 'NORMAL',
        status: 'pending',
        dependencies: [],
        inputs: { goal },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('document_analysis');
      suggestedAgents.push('DocumentAgent');
    }

    if (needsOSINT) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Perform entity resolution and OSINT correlation`,
        agentType: 'osint',
        capability: 'osint_investigation',
        priority: 'HIGH',
        status: 'pending',
        dependencies: [],
        inputs: { target: goal },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('osint_investigation');
      suggestedAgents.push('OSINTAgent');
    }

    if (needsVision) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Extract OCR, visual layout, and visual evidence`,
        agentType: 'vision',
        capability: 'visual_intelligence',
        priority: 'NORMAL',
        status: 'pending',
        dependencies: [],
        inputs: { goal },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('visual_intelligence');
      suggestedAgents.push('VisionAgent');
    }

    // If nothing specifically detected, default to general research
    if (initialTaskIds.length === 0) {
      const taskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId,
        workflowId,
        objective: `Investigate and gather context for: ${goal}`,
        agentType: 'research',
        capability: 'web_research',
        priority: 'NORMAL',
        status: 'pending',
        dependencies: [],
        inputs: { query: goal },
        resourceLimits: defaultLimits,
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.push(taskId);
      requiredCapabilities.push('web_research');
      suggestedAgents.push('ResearchAgent');
    }

    // 2. Specialized Processing (Depends on initial gathering)
    let processingTaskId: string | undefined;

    if (needsSecurity) {
      const secTaskId = `task_${workflowId}_${taskIndex++}`;
      tasks.push({
        taskId: secTaskId,
        workflowId,
        objective: `Assess security exposure, correlation, and policy posture`,
        agentType: 'security',
        capability: 'security_analysis',
        priority: 'HIGH',
        status: 'pending',
        dependencies: [...initialTaskIds],
        inputs: { target: goal },
        resourceLimits: { ...defaultLimits, maxRuntimeSeconds: 600 },
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      initialTaskIds.forEach(id => dependencies.push({ from: id, to: secTaskId }));
      processingTaskId = secTaskId;
      requiredCapabilities.push('security_analysis');
      suggestedAgents.push('SecurityAgent');
    }

    if (needsCoding) {
      const codeTaskId = `task_${workflowId}_${taskIndex++}`;
      const codeDeps = processingTaskId ? [processingTaskId] : [...initialTaskIds];
      tasks.push({
        taskId: codeTaskId,
        workflowId,
        objective: `Formulate, sandbox-test, and verify code modifications`,
        agentType: 'coding',
        capability: 'code_modification',
        priority: 'HIGH',
        status: 'pending',
        dependencies: codeDeps,
        inputs: { instruction: goal },
        resourceLimits: { ...defaultLimits, maxRuntimeSeconds: 900, maxCostUsd: 1.0 },
        retries: 0,
        maxRetries: 2,
        createdAt: new Date().toISOString()
      });
      codeDeps.forEach(id => dependencies.push({ from: id, to: codeTaskId }));
      processingTaskId = codeTaskId;
      requiredCapabilities.push('code_modification');
      suggestedAgents.push('CodingAgent');
    }

    // 3. Verification & Critic Step (Must examine all prior outputs)
    const criticPrereqs = processingTaskId ? [processingTaskId] : [...initialTaskIds];
    const criticTaskId = `task_${workflowId}_${taskIndex++}`;
    tasks.push({
      taskId: criticTaskId,
      workflowId,
      objective: `Perform adversarial audit, verify evidence, check hallucinations, and test compliance`,
      agentType: 'critic',
      capability: 'verification_critic',
      priority: 'CRITICAL',
      status: 'pending',
      dependencies: criticPrereqs,
      inputs: { goal },
      resourceLimits: { ...defaultLimits, maxRuntimeSeconds: 180 },
      retries: 0,
      maxRetries: 1,
      createdAt: new Date().toISOString()
    });
    criticPrereqs.forEach(id => dependencies.push({ from: id, to: criticTaskId }));
    requiredCapabilities.push('verification_critic');
    suggestedAgents.push('CriticAgent');

    // 4. Final Synthesis Step
    const synthTaskId = `task_${workflowId}_${taskIndex++}`;
    tasks.push({
      taskId: synthTaskId,
      workflowId,
      objective: `Synthesize unified final response with preserved evidence citations and artifacts`,
      agentType: 'synthesis',
      capability: 'synthesis_reporting',
      priority: 'HIGH',
      status: 'pending',
      dependencies: [criticTaskId],
      inputs: { goal },
      resourceLimits: { ...defaultLimits, maxRuntimeSeconds: 180 },
      retries: 0,
      maxRetries: 1,
      createdAt: new Date().toISOString()
    });
    dependencies.push({ from: criticTaskId, to: synthTaskId });
    requiredCapabilities.push('synthesis_reporting');
    suggestedAgents.push('SynthesisAgent');

    // Determine complexity
    let estimatedComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'MISSION_CRITICAL' = 'SIMPLE';
    if (tasks.length > 5 || needsSecurity || needsCoding) {
      estimatedComplexity = 'COMPLEX';
    } else if (tasks.length > 3) {
      estimatedComplexity = 'MODERATE';
    }

    const estimatedRuntimeSeconds = tasks.reduce((sum, t) => sum + (t.resourceLimits.maxRuntimeSeconds || 300), 0);
    const estimatedCostUsd = tasks.reduce((sum, t) => sum + (t.resourceLimits.maxCostUsd || 0.5), 0);

    return {
      planId: `plan_${workflowId}`,
      goal,
      estimatedComplexity,
      estimatedRuntimeSeconds,
      estimatedCostUsd,
      tasks,
      dependencies,
      requiredCapabilities,
      suggestedAgents,
      createdAt: new Date().toISOString()
    };
  }
}
