/**
 * Hikmah — PRD 20: Multi-Agent Orchestration Engine
 * Dedicated Orchestration MCP Server: 26 Production-Grade Multi-Agent Tools
 * Registered into ToolRegistry and CapabilityRegistry
 */

import { ToolDefinition } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { AgentOrchestrationEngine } from '../../../orchestration/orchestrator.js';
import { AgentPriority } from '../../../orchestration/core/types.js';

export class OrchestrationMCPServer {
  private orchestrator: AgentOrchestrationEngine;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    orchestrator?: AgentOrchestrationEngine,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry
  ) {
    this.orchestrator = orchestrator || AgentOrchestrationEngine.getInstance();
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. workflow_create
      {
        name: 'workflow_create',
        version: '1.0.0',
        description: 'Create a new orchestration workflow and plan its task graph DAG',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'High-level objective or request' },
            userId: { type: 'string', description: 'User or tenant ID' },
            sessionId: { type: 'string', description: 'Session or conversation ID' },
            priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND'], default: 'NORMAL' },
            budgetLimit: { type: 'number', description: 'Optional max USD budget' },
            tokenBudget: { type: 'number', description: 'Optional max tokens limit' },
            maxTimeMs: { type: 'number', description: 'Optional max workflow duration in ms' },
          },
          required: ['goal', 'userId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const run = await this.orchestrator.createWorkflow({
            goal: input.goal as string,
            userId: input.userId as string,
            sessionId: input.sessionId as string,
            priority: (input.priority as AgentPriority) || 'NORMAL',
            budgetLimit: input.budgetLimit as number,
            tokenBudget: input.tokenBudget as number,
            maxTimeMs: input.maxTimeMs as number,
          });
          return { success: true, data: run };
        },
      },

      // 2. workflow_plan
      {
        name: 'workflow_plan',
        version: '1.0.0',
        description: 'Generate an explicit task breakdown DAG and agent assignment plan without executing it',
        risk: 'LOW',
        timeoutMs: 25000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'High-level objective or request' },
            context: { type: 'object', description: 'Optional key-value context variables' },
          },
          required: ['goal'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const plan = await this.orchestrator.planWorkflow(
            input.goal as string,
            (input.context as Record<string, unknown>) || {}
          );
          return { success: true, data: plan };
        },
      },

      // 3. workflow_start
      {
        name: 'workflow_start',
        version: '1.0.0',
        description: 'Start execution of a planned or queued workflow run',
        risk: 'MEDIUM',
        timeoutMs: 120000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Workflow Run ID to execute' },
          },
          required: ['runId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.executeWorkflow(input.runId as string);
          return { success: result.status === 'COMPLETED', data: result };
        },
      },

      // 4. workflow_pause
      {
        name: 'workflow_pause',
        version: '1.0.0',
        description: 'Pause an actively running workflow',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Workflow Run ID to pause' },
          },
          required: ['runId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const paused = await this.orchestrator.pauseWorkflow(input.runId as string);
          return { success: paused, data: { runId: input.runId, paused } };
        },
      },

      // 5. workflow_resume
      {
        name: 'workflow_resume',
        version: '1.0.0',
        description: 'Resume a paused workflow run',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Workflow Run ID to resume' },
          },
          required: ['runId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const resumed = await this.orchestrator.resumeWorkflow(input.runId as string);
          return { success: resumed, data: { runId: input.runId, resumed } };
        },
      },

      // 6. workflow_cancel
      {
        name: 'workflow_cancel',
        version: '1.0.0',
        description: 'Cancel a pending or running workflow run and release all held leases',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Workflow Run ID to cancel' },
            reason: { type: 'string', description: 'Reason for cancellation' },
          },
          required: ['runId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const canceled = await this.orchestrator.cancelWorkflow(
            input.runId as string,
            input.reason as string
          );
          return { success: canceled, data: { runId: input.runId, canceled } };
        },
      },

      // 7. workflow_status
      {
        name: 'workflow_status',
        version: '1.0.0',
        description: 'Retrieve live status, task states, metrics, and progress of a workflow run',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Workflow Run ID' },
          },
          required: ['runId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const run = await this.orchestrator.getWorkflowStatus(input.runId as string);
          if (!run) {
            return { success: false, error: `Workflow run ${input.runId} not found` };
          }
          return { success: true, data: run };
        },
      },

      // 8. workflow_list
      {
        name: 'workflow_list',
        version: '1.0.0',
        description: 'List recent workflow runs with optional filtering by status and limit',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
            status: { type: 'string' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const runs = await this.orchestrator.listWorkflows(
            input.limit as number,
            input.status as string
          );
          return { success: true, data: runs };
        },
      },

      // 9. agents_list
      {
        name: 'agents_list',
        version: '1.0.0',
        description: 'List all available specialized agents in the registry with roles and tool access',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            capability: { type: 'string', description: 'Filter agents providing this capability' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const agents = this.orchestrator.listAgents(input.capability as string);
          return { success: true, data: agents };
        },
      },

      // 10. agent_execute
      {
        name: 'agent_execute',
        version: '1.0.0',
        description: 'Directly dispatch a standalone task to a specialized agent',
        risk: 'MEDIUM',
        timeoutMs: 60000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            agentRole: { type: 'string', description: 'Target specialized agent role' },
            taskName: { type: 'string', description: 'Descriptive title of task' },
            description: { type: 'string', description: 'Actionable instructions' },
            input: { type: 'object', description: 'Input data payload' },
            userId: { type: 'string' },
          },
          required: ['agentRole', 'taskName', 'description'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.executeDirectAgentTask(
            input.agentRole as string,
            {
              title: input.taskName as string,
              description: input.description as string,
              input: (input.input as Record<string, unknown>) || {},
              userId: input.userId as string,
            }
          );
          return { success: result.success, data: result };
        },
      },

      // 11. agent_handoff
      {
        name: 'agent_handoff',
        version: '1.0.0',
        description: 'Execute a verified handoff between two specialized agents with artifact transfer',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Active workflow run ID' },
            fromAgent: { type: 'string', description: 'Source agent role' },
            toAgent: { type: 'string', description: 'Target destination agent role' },
            summary: { type: 'string', description: 'Summary of findings or completed step' },
            artifactIds: { type: 'array', items: { type: 'string' }, description: 'Artifact IDs to transfer' },
            contextVariables: { type: 'object' },
          },
          required: ['workflowRunId', 'fromAgent', 'toAgent', 'summary'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const handoff = await this.orchestrator.executeHandoff({
            workflowRunId: input.workflowRunId as string,
            fromAgent: input.fromAgent as string,
            toAgent: input.toAgent as string,
            summary: input.summary as string,
            artifactIds: (input.artifactIds as string[]) || [],
            contextVariables: (input.contextVariables as Record<string, unknown>) || {},
          });
          return { success: true, data: handoff };
        },
      },

      // 12. agent_locks_acquire
      {
        name: 'agent_locks_acquire',
        version: '1.0.0',
        description: 'Acquire an exclusive or shared distributed lease on a resource (file, repo, browser profile)',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', description: 'Target resource ID' },
            resourceType: { type: 'string', enum: ['REPOSITORY', 'FILE_PATH', 'BROWSER_PROFILE', 'DEPLOYMENT_TARGET', 'API_ENDPOINT', 'CUSTOM'] },
            agentId: { type: 'string', description: 'Holder agent identifier' },
            workflowRunId: { type: 'string', description: 'Workflow Run ID' },
            leaseType: { type: 'string', enum: ['EXCLUSIVE', 'SHARED'], default: 'EXCLUSIVE' },
            ttlMs: { type: 'number', description: 'Lease validity duration in ms' },
          },
          required: ['resourceId', 'resourceType', 'agentId', 'workflowRunId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const lease = await this.orchestrator.acquireResourceLease({
            resourceId: input.resourceId as string,
            resourceType: input.resourceType as any,
            agentId: input.agentId as string,
            workflowRunId: input.workflowRunId as string,
            leaseType: (input.leaseType as any) || 'EXCLUSIVE',
            ttlMs: input.ttlMs as number,
          });
          return { success: lease.granted, data: lease };
        },
      },

      // 13. agent_locks_release
      {
        name: 'agent_locks_release',
        version: '1.0.0',
        description: 'Release an acquired distributed resource lease',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            leaseId: { type: 'string', description: 'Lease ID to release' },
          },
          required: ['leaseId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const released = await this.orchestrator.releaseResourceLease(input.leaseId as string);
          return { success: released, data: { leaseId: input.leaseId, released } };
        },
      },

      // 14. agent_locks_list
      {
        name: 'agent_locks_list',
        version: '1.0.0',
        description: 'List active resource locks/leases with optional workflow filter',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const locks = await this.orchestrator.listActiveLeases(input.workflowRunId as string);
          return { success: true, data: locks };
        },
      },

      // 15. artifact_publish
      {
        name: 'artifact_publish',
        version: '1.0.0',
        description: 'Publish a typed artifact (code diff, report, log, binary) to the ArtifactBus backed by StorageManager',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Workflow Run ID' },
            taskId: { type: 'string', description: 'Originating task ID' },
            producerAgent: { type: 'string', description: 'Producing agent role' },
            name: { type: 'string', description: 'Human-readable artifact name' },
            type: { type: 'string', enum: ['RESEARCH_REPORT', 'CODE_DIFF', 'TEST_RESULTS', 'SCAN_REPORT', 'PROVENANCE_RECORD', 'BROWSER_CAPTURE', 'GENERIC_JSON'] },
            content: { description: 'String or JSON object content' },
            metadata: { type: 'object' },
          },
          required: ['workflowRunId', 'taskId', 'producerAgent', 'name', 'type', 'content'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const artifact = await this.orchestrator.publishArtifact({
            workflowRunId: input.workflowRunId as string,
            taskId: input.taskId as string,
            producerAgent: input.producerAgent as string,
            name: input.name as string,
            type: input.type as any,
            content: input.content,
            metadata: (input.metadata as Record<string, unknown>) || {},
          });
          return { success: true, data: artifact };
        },
      },

      // 16. artifact_get
      {
        name: 'artifact_get',
        version: '1.0.0',
        description: 'Fetch artifact metadata and full content by ID from the ArtifactBus',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            artifactId: { type: 'string', description: 'Artifact identifier' },
          },
          required: ['artifactId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const item = await this.orchestrator.getArtifact(input.artifactId as string);
          if (!item) {
            return { success: false, error: `Artifact ${input.artifactId} not found` };
          }
          return { success: true, data: item };
        },
      },

      // 17. artifact_list
      {
        name: 'artifact_list',
        version: '1.0.0',
        description: 'List all artifacts produced during a specific workflow run',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Workflow Run ID' },
          },
          required: ['workflowRunId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const items = await this.orchestrator.listArtifacts(input.workflowRunId as string);
          return { success: true, data: items };
        },
      },

      // 18. task_verify
      {
        name: 'task_verify',
        version: '1.0.0',
        description: 'Run deterministic domain verification on a task output before synthesis',
        risk: 'LOW',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID to verify' },
            output: { type: 'object', description: 'Task output payload' },
            domain: { type: 'string', enum: ['RESEARCH', 'CODING', 'BROWSER', 'SECURITY', 'GENERIC'] },
          },
          required: ['taskId', 'output'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const verResult = await this.orchestrator.verifyTaskOutput(
            input.taskId as string,
            input.output as Record<string, unknown>,
            input.domain as any
          );
          return { success: verResult.passed, data: verResult };
        },
      },

      // 19. critic_review
      {
        name: 'critic_review',
        version: '1.0.0',
        description: 'Adversarially evaluate task outputs and synthesis for hallucinations, logic gaps, or policy violations',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'Original user goal' },
            results: { type: 'array', description: 'List of completed task outputs' },
            workflowRunId: { type: 'string' },
          },
          required: ['goal', 'results'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const review = await this.orchestrator.reviewWithCritic(
            input.goal as string,
            input.results as any[],
            input.workflowRunId as string
          );
          return { success: review.verdict === 'PASS', data: review };
        },
      },

      // 20. synthesis_generate
      {
        name: 'synthesis_generate',
        version: '1.0.0',
        description: 'Synthesize verified outputs from all completed tasks into a coherent unified response',
        risk: 'LOW',
        timeoutMs: 35000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'Original user goal' },
            taskOutputs: { type: 'array', description: 'Array of verified task outputs' },
            workflowRunId: { type: 'string' },
          },
          required: ['goal', 'taskOutputs'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const synthesis = await this.orchestrator.synthesizeResults(
            input.goal as string,
            input.taskOutputs as any[],
            input.workflowRunId as string
          );
          return { success: true, data: synthesis };
        },
      },

      // 21. approval_respond
      {
        name: 'approval_respond',
        version: '1.0.0',
        description: 'Submit an approval or rejection response for a blocked human-in-the-loop task node',
        risk: 'HIGH',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            approvalId: { type: 'string', description: 'Approval request identifier' },
            decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
            comment: { type: 'string', description: 'Optional explanation or feedback' },
            reviewerId: { type: 'string', description: 'User or reviewer ID' },
          },
          required: ['approvalId', 'decision'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.respondToApproval({
            approvalId: input.approvalId as string,
            decision: input.decision as 'APPROVED' | 'REJECTED',
            comment: input.comment as string,
            reviewerId: input.reviewerId as string,
          });
          return { success: result.success, data: result };
        },
      },

      // 22. approval_list_pending
      {
        name: 'approval_list_pending',
        version: '1.0.0',
        description: 'List all currently pending human-in-the-loop approval requests',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Optional filter by workflow' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const list = await this.orchestrator.listPendingApprovals(input.workflowRunId as string);
          return { success: true, data: list };
        },
      },

      // 23. agent_evaluate
      {
        name: 'agent_evaluate',
        version: '1.0.0',
        description: 'Calculate and store post-run evaluation metrics (accuracy, cost, latency, safety adherence)',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Workflow Run ID to evaluate' },
          },
          required: ['workflowRunId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const evalMetrics = await this.orchestrator.evaluateWorkflowRun(input.workflowRunId as string);
          return { success: true, data: evalMetrics };
        },
      },

      // 24. workflow_replay
      {
        name: 'workflow_replay',
        version: '1.0.0',
        description: 'Replay recorded execution timeline, tool calls, and state transitions of a workflow run',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Workflow Run ID to inspect' },
          },
          required: ['workflowRunId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const timeline = await this.orchestrator.replayWorkflow(input.workflowRunId as string);
          return { success: true, data: timeline };
        },
      },

      // 25. cost_budget_check
      {
        name: 'cost_budget_check',
        version: '1.0.0',
        description: 'Check active token count and USD spend against enforced budgets',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            workflowRunId: { type: 'string', description: 'Workflow Run ID' },
          },
          required: ['workflowRunId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const budget = await this.orchestrator.checkCostBudget(input.workflowRunId as string);
          return { success: true, data: budget };
        },
      },

      // 26. orchestrator_status
      {
        name: 'orchestrator_status',
        version: '1.0.0',
        description: 'Check health, active workers, queue lengths, and lease counts of the Orchestration Engine',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        outputSchema: { type: 'object' },
        execute: async () => {
          const health = await this.orchestrator.getStatus();
          return { success: true, data: health };
        },
      },
    ];

    // Register all tools in ToolRegistry
    for (const tool of tools) {
      this.toolRegistry.registerTool(tool);
    }

    // Register Multi-Agent Orchestration Capability in CapabilityRegistry
    const capability: Capability = {
      id: 'cap_multi_agent_orchestration_engine',
      name: 'Multi-Agent Orchestration Engine',
      description:
        'Canonical multi-agent orchestration subsystem: DAG task planning, priority scheduling, distributed resource leases, cross-agent handoffs, artifact exchange, adversarial critic verification, and response synthesis',
      category: 'agent',
      type: 'AGENT_ORCHESTRATOR',
      provider: 'hikmah-orchestration',
      version: '1.0.0',
      status: 'AVAILABLE',
      health: 'HEALTHY',
      tools: tools.map((t) => t.name),
      features: [
        'Deterministic DAG Task Planning & Cycle Detection',
        'Five-Tier Priority Queue Scheduler with Anti-Starvation Aging',
        'Distributed Resource Leases (File, Repo, Browser Profile, Deploy Target)',
        'StorageManager-backed Typed ArtifactBus',
        'Structured Cross-Agent Handoff Contracts',
        'MemoryRouter-backed Token-Budgeted Context Aggregation',
        'Domain-Specific Output Verification Gate',
        'Adversarial Critic Review (PASS / REVISE / FAIL)',
        'Unified Citation-Preserving Result Synthesis',
        'Human-in-the-Loop Approval Pauses',
        'Deterministic Timeline Replay & Observability Replay',
        'Strict USD and Token Budget Limit Enforcement',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.capabilityRegistry.register(capability);
  }
}
