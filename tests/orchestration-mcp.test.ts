import { describe, it, expect } from 'vitest';
import { OrchestrationMCPServer } from '../mcp/servers/orchestration/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

describe('PRD 20: Orchestration MCP Server & Tool Registration', () => {
  const toolRegistry = ToolRegistry.getInstance();
  const capabilityRegistry = CapabilityRegistry.getInstance();
  new OrchestrationMCPServer(undefined, toolRegistry, capabilityRegistry);

  const EXPECTED_TOOLS = [
    'workflow_create',
    'workflow_plan',
    'workflow_start',
    'workflow_pause',
    'workflow_resume',
    'workflow_cancel',
    'workflow_status',
    'workflow_list',
    'agents_list',
    'agent_execute',
    'agent_handoff',
    'agent_locks_acquire',
    'agent_locks_release',
    'agent_locks_list',
    'artifact_publish',
    'artifact_get',
    'artifact_list',
    'task_verify',
    'critic_review',
    'synthesis_generate',
    'approval_respond',
    'approval_list_pending',
    'agent_evaluate',
    'workflow_replay',
    'cost_budget_check',
    'orchestrator_status',
  ];

  it('should register all 26 orchestration tools in ToolRegistry', () => {
    for (const toolName of EXPECTED_TOOLS) {
      const tool = toolRegistry.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe(toolName);
      expect(tool?.enabled).toBe(true);
    }
  });

  it('should register multi-agent orchestration capability in CapabilityRegistry', () => {
    const cap = capabilityRegistry.get('cap_multi_agent_orchestration_engine');
    expect(cap).toBeDefined();
    expect(cap?.category).toBe('agent');
    expect(cap?.type).toBe('AGENT_ORCHESTRATOR');
    expect(cap?.tools.length).toBe(26);
  });

  it('should execute workflow lifecycle tools via ToolRegistry', async () => {
    // 1. Check orchestrator status
    const statusRes = await toolRegistry.executeTool('orchestrator_status', {}, {
      userId: 'usr_test',
      sessionId: 'sess_test',
      environment: 'development',
    });
    expect(statusRes.success).toBe(true);

    // 2. Plan workflow
    const planRes = await toolRegistry.executeTool(
      'workflow_plan',
      { goal: 'Coordinate research and development of new ML model' },
      { userId: 'usr_test', sessionId: 'sess_test', environment: 'development' }
    );
    expect(planRes.success).toBe(true);
    expect(planRes.data).toBeDefined();

    // 3. Create workflow
    const createRes = await toolRegistry.executeTool(
      'workflow_create',
      {
        goal: 'Coordinate research and development of new ML model',
        userId: 'usr_test',
        priority: 'NORMAL',
      },
      { userId: 'usr_test', sessionId: 'sess_test', environment: 'development' }
    );
    expect(createRes.success).toBe(true);
    const runId = (createRes.data as any)?.id;
    expect(runId).toBeDefined();

    // 4. Check cost budget
    const budgetRes = await toolRegistry.executeTool(
      'cost_budget_check',
      { workflowRunId: runId },
      { userId: 'usr_test', sessionId: 'sess_test', environment: 'development' }
    );
    expect(budgetRes.success).toBe(true);
  });
});
