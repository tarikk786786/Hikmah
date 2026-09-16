import { PAIOSKernel } from '../kernel/paios-kernel';
import { PrivacyMode } from '../policy/paios-policy-engine';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export class PAIOSMcpServer {
  private kernel = PAIOSKernel.getInstance();

  public getTools(): MCPToolDefinition[] {
    return [
      {
        name: 'system_status',
        description: 'Get comprehensive PAIOS status, active profile, privacy mode, current device, and 24-subsystem health.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'system_set_privacy_mode',
        description: 'Set system privacy mode (normal, private, offline, air-gapped).',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['normal', 'private', 'offline', 'air-gapped'] },
            reason: { type: 'string', description: 'Audit rationale for mode change' },
          },
          required: ['mode'],
        },
      },
      {
        name: 'system_diagnostics',
        description: 'Run deep diagnostic tests across all 24 subsystems.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'system_self_heal',
        description: 'Trigger automated self-healing on a specified degraded subsystem.',
        inputSchema: {
          type: 'object',
          properties: {
            subsystemId: { type: 'string', description: 'ID of the subsystem to heal' },
          },
          required: ['subsystemId'],
        },
      },
      {
        name: 'intent_decompose',
        description: 'Decompose a user prompt into structured objectives, urgency, risk, capabilities, and subtasks.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'User input command or request' },
            projectId: { type: 'string', description: 'Optional project context' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'context_assemble',
        description: 'Assemble 7-layer context prompt within token budget.',
        inputSchema: {
          type: 'object',
          properties: {
            userMessage: { type: 'string' },
            projectId: { type: 'string' },
            maxBudgetTokens: { type: 'number' },
          },
          required: ['userMessage'],
        },
      },
      {
        name: 'project_get_briefing',
        description: 'Get continuity briefing, recent activities, and recommended next actions for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or slug' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'project_set_active',
        description: 'Switch the active workspace project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'device_handoff',
        description: 'Transfer an active session seamlessly to another device (e.g. Desktop to iPhone).',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            targetDeviceId: { type: 'string' },
          },
          required: ['sessionId', 'targetDeviceId'],
        },
      },
      {
        name: 'device_list',
        description: 'List all registered devices and their live telemetry.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'tasks_create',
        description: 'Create an AI-native personal task with optional agent assignment.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            projectId: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            assignedAgentId: { type: 'string' },
          },
          required: ['title'],
        },
      },
      {
        name: 'tasks_list',
        description: 'List personal tasks filtered by status or project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'blocked', 'completed', 'cancelled'] },
          },
        },
      },
      {
        name: 'notifications_send',
        description: 'Dispatch a multi-channel alert or brief.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
          },
          required: ['title', 'body'],
        },
      },
      {
        name: 'approval_resolve',
        description: 'Approve or reject a pending security approval request.',
        inputSchema: {
          type: 'object',
          properties: {
            approvalId: { type: 'string' },
            approved: { type: 'boolean' },
          },
          required: ['approvalId', 'approved'],
        },
      },
      {
        name: 'audit_explain',
        description: 'Retrieve structured decision rationale explaining why an action was permitted or blocked.',
        inputSchema: {
          type: 'object',
          properties: {
            traceIdOrAction: { type: 'string' },
          },
          required: ['traceIdOrAction'],
        },
      },
    ];
  }

  public async callTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'system_status': {
        return this.kernel.getStatus();
      }
      case 'system_set_privacy_mode': {
        this.kernel.policy.setPrivacyMode(args.mode as PrivacyMode, args.reason);
        return { success: true, mode: args.mode };
      }
      case 'system_diagnostics': {
        return await this.kernel.health.runDiagnostics();
      }
      case 'system_self_heal': {
        return this.kernel.health.triggerSelfHealing(args.subsystemId);
      }
      case 'intent_decompose': {
        return this.kernel.intent.decompose(args.prompt, { currentProjectId: args.projectId });
      }
      case 'context_assemble': {
        return await this.kernel.context.assembleContext({
          userMessage: args.userMessage,
          projectId: args.projectId,
          maxBudgetTokens: args.maxBudgetTokens,
        });
      }
      case 'project_get_briefing': {
        return this.kernel.projects.getContinuityBriefing(args.projectId);
      }
      case 'project_set_active': {
        return this.kernel.projects.setActiveProject(args.projectId);
      }
      case 'device_handoff': {
        return this.kernel.devices.handoffSession(args.sessionId, args.targetDeviceId);
      }
      case 'device_list': {
        return this.kernel.devices.listDevices();
      }
      case 'tasks_create': {
        return this.kernel.tasks.createTask({
          title: args.title,
          description: args.description,
          projectId: args.projectId,
          priority: args.priority,
          assignedAgentId: args.assignedAgentId,
        });
      }
      case 'tasks_list': {
        return this.kernel.tasks.listTasks({
          projectId: args.projectId,
          status: args.status,
        });
      }
      case 'notifications_send': {
        return this.kernel.notifications.send({
          title: args.title,
          body: args.body,
          priority: args.priority,
        });
      }
      case 'approval_resolve': {
        const ok = this.kernel.policy.resolveApproval(args.approvalId, args.approved);
        return { success: ok, approvalId: args.approvalId, approved: args.approved };
      }
      case 'audit_explain': {
        const rec = this.kernel.audit.explain(args.traceIdOrAction);
        return rec || { error: 'No decision record found for specified query.' };
      }
      default:
        throw new Error(`Unknown PAIOS MCP tool: ${name}`);
    }
  }
}
