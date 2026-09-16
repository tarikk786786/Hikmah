import { PromptTemplate } from './types.js';

export class PromptManager {
  private static instance: PromptManager;
  private templates: Map<string, PromptTemplate> = new Map();
  private history: Map<string, PromptTemplate[]> = new Map();

  constructor() {
    this.seedDefaults();
  }

  public static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  private seedDefaults(): void {
    const builtins: PromptTemplate[] = [
      {
        id: 'system.core',
        name: 'Hikmah OS Core Identity',
        description: 'System prompt establishing the persona, security rules, and execution posture of Hikmah',
        version: '1.0.0',
        category: 'system',
        template: `You are Hikmah, an advanced autonomous AI operating system and intelligent assistant.
Your current user is {{user_name}}.
Today's date is {{current_date}}.
System Context: {{system_context}}

Core Directives:
1. Deliver precise, high-rigor, verified answers and code.
2. When executing actions or running tools, follow strict scope authorization and safety classifications.
3. Protect system integrity and never execute destructive or out-of-scope commands without explicit authorization.
4. Adapt seamlessly across providers, falling back gracefully if cloud services degrade.`,
        variables: ['user_name', 'current_date', 'system_context'],
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z'
      },
      {
        id: 'planner.task_decomposition',
        name: 'DAG Task Graph Decomposer',
        description: 'Breaks down complex user objectives into structured, dependency-resolved task nodes',
        version: '1.0.0',
        category: 'planner',
        template: `You are the Hikmah Task Planner.
Decompose the following user objective into an executable Directed Acyclic Graph (DAG) of task nodes.

User Goal: {{user_goal}}
Available Capabilities: {{available_capabilities}}
Constraints: {{constraints}}

Output a valid JSON array of tasks with:
- id: unique string
- name: clear task title
- capabilityId: exact capability ID from available list
- dependencies: array of node IDs that must succeed before this task runs
- input: parameters for the capability`,
        variables: ['user_goal', 'available_capabilities', 'constraints'],
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z'
      },
      {
        id: 'security.classifier',
        name: 'Action Risk Classifier',
        description: 'Evaluates commands, targets, and tool calls to assign risk level and approval requirement',
        version: '1.0.0',
        category: 'security',
        template: `Evaluate the proposed action and target for security risk.

Action Details: {{action_details}}
Target: {{target_scope}}

Respond with valid JSON:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "requires_approval": boolean,
  "rationale": "Explanation of safety assessment"
}`,
        variables: ['action_details', 'target_scope'],
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z'
      },
      {
        id: 'summarizer.context',
        name: 'Context Compactor',
        description: 'Distills long conversations into token-efficient summaries while preserving key entities',
        version: '1.0.0',
        category: 'summary',
        template: `Summarize the following conversation history for long-term memory retention.
Retain: key user preferences, architectural decisions, code paths modified, open items, and entity references.

Conversation:
{{conversation_text}}`,
        variables: ['conversation_text'],
        createdAt: '2026-09-16T00:00:00.000Z',
        updatedAt: '2026-09-16T00:00:00.000Z'
      }
    ];

    for (const t of builtins) {
      this.registerTemplate(t);
    }
  }

  public registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);

    const history = this.history.get(template.id) || [];
    history.push({ ...template });
    this.history.set(template.id, history);
  }

  public getTemplate(id: string, version?: string): PromptTemplate | undefined {
    if (!version) {
      return this.templates.get(id);
    }
    const versions = this.history.get(id) || [];
    return versions.find((v) => v.version === version);
  }

  public listTemplates(category?: string): PromptTemplate[] {
    let list = Array.from(this.templates.values());
    if (category) {
      list = list.filter((t) => t.category === category);
    }
    return list;
  }

  public getVersionHistory(id: string): PromptTemplate[] {
    return [...(this.history.get(id) || [])];
  }

  public createVersion(id: string, newTemplate: string, description?: string): PromptTemplate {
    const current = this.templates.get(id);
    if (!current) {
      throw new Error(`Cannot version non-existent prompt template [${id}]`);
    }

    // Increment patch version (e.g. 1.0.0 -> 1.0.1)
    const parts = current.version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = parts.join('.');

    // Extract variables {{var_name}}
    const varMatches = newTemplate.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [];
    const variables = Array.from(new Set(varMatches.map((m) => m.replace(/[{}]/g, '').trim())));

    const updated: PromptTemplate = {
      ...current,
      version: newVersion,
      template: newTemplate,
      variables,
      description: description || current.description,
      updatedAt: new Date().toISOString()
    };

    this.registerTemplate(updated);
    return updated;
  }

  public render(id: string, variables: Record<string, string>, version?: string): string {
    const tpl = this.getTemplate(id, version);
    if (!tpl) {
      throw new Error(`Prompt template [${id}] not found`);
    }

    let rendered = tpl.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value);
    }

    return rendered;
  }
}
