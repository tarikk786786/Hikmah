import { AISystemBus } from '../events/ai-system-bus';
import { IdentityManager } from '../identity/identity-manager';
import { PAIOSPolicyEngine } from '../policy/paios-policy-engine';

export interface ContextLayer {
  level: number;
  name: string;
  tokensEstimate: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ContextAssemblyRequest {
  userMessage: string;
  sessionId?: string;
  projectId?: string;
  profileId?: string;
  maxBudgetTokens?: number;
  includeCapabilities?: boolean;
}

export interface AssembledContext {
  promptContext: string;
  totalTokensEstimate: number;
  layers: ContextLayer[];
  budgetTokens: number;
  assembledAt: string;
}

export class ContextEngine {
  private static instance: ContextEngine;
  private bus = AISystemBus.getInstance();

  private constructor() {}

  public static getInstance(): ContextEngine {
    if (!ContextEngine.instance) {
      ContextEngine.instance = new ContextEngine();
    }
    return ContextEngine.instance;
  }

  public async assembleContext(request: ContextAssemblyRequest): Promise<AssembledContext> {
    const identityMgr = IdentityManager.getInstance();
    const policyEngine = PAIOSPolicyEngine.getInstance();
    const activeProfile = request.profileId
      ? identityMgr.listProfiles().find(p => p.id === request.profileId) || identityMgr.getActiveProfile()
      : identityMgr.getActiveProfile();

    const maxBudget = request.maxBudgetTokens || activeProfile.contextBudgetTokens || 128000;
    const privacyMode = policyEngine.getPrivacyMode();

    const layers: ContextLayer[] = [];

    // L0: Current User Input
    const l0Content = `[CURRENT_USER_REQUEST]\n${request.userMessage.trim()}`;
    layers.push({
      level: 0,
      name: 'L0_CURRENT_INPUT',
      content: l0Content,
      tokensEstimate: Math.ceil(l0Content.length / 4),
    });

    // L1: Session / Conversation State
    const l1Content = request.sessionId
      ? `[SESSION_STATE]\nActive Session ID: ${request.sessionId}\nContinuation: true`
      : `[SESSION_STATE]\nNew Session initiated.`;
    layers.push({
      level: 1,
      name: 'L1_SESSION_HISTORY',
      content: l1Content,
      tokensEstimate: Math.ceil(l1Content.length / 4),
    });

    // L2: Active Project / Workspace Context
    const l2Content = request.projectId
      ? `[ACTIVE_PROJECT]\nProject ID: ${request.projectId}\nScope: Focused on current repository and project task list.`
      : `[ACTIVE_PROJECT]\nGlobal workspace scope (No project pinned).`;
    layers.push({
      level: 2,
      name: 'L2_PROJECT_CONTEXT',
      content: l2Content,
      tokensEstimate: Math.ceil(l2Content.length / 4),
    });

    // L3: Profile & Policy Persona
    const l3Content = `[USER_IDENTITY_AND_PREFERENCES]\nUser Role: ${activeProfile.role}\nProfile: ${activeProfile.name} (${activeProfile.slug})\nPrivacy Mode: ${privacyMode.toUpperCase()}\nLocale: ${activeProfile.preferences.locale || 'en-US'}\nPreferred Model: ${activeProfile.preferences.preferredModel || 'system-default'}`;
    layers.push({
      level: 3,
      name: 'L3_USER_PROFILE',
      content: l3Content,
      tokensEstimate: Math.ceil(l3Content.length / 4),
    });

    // L4: Semantic & Episodic Memory Context
    let l4Content = `[RELEVANT_MEMORY]\nPrivacy Mode: ${privacyMode}`;
    try {
      // Lazy attempt to query memory router if configured
      const { MemoryRouter } = await import('../../memory/core/router/router.js').catch(() => ({ MemoryRouter: null }));
      if (MemoryRouter && typeof MemoryRouter.getInstance === 'function') {
        const memRouter = MemoryRouter.getInstance();
        const memResults = await memRouter.search({
          queryText: request.userMessage,
          userId: activeProfile.userId,
          limit: 3,
        }).catch(() => []);
        if (memResults && memResults.length > 0) {
          l4Content += `\nRetrieved Memories:\n` + memResults.map((m: any) => `- ${m.content || m.text}`).join('\n');
        } else {
          l4Content += `\nNo direct conflicting or relevant past episodic memories found.`;
        }
      } else {
        l4Content += `\nMemory subsystem ready.`;
      }
    } catch {
      l4Content += `\nMemory subsystem standby.`;
    }

    layers.push({
      level: 4,
      name: 'L4_MEMORY',
      content: l4Content,
      tokensEstimate: Math.ceil(l4Content.length / 4),
    });

    // L5: Capabilities (Skills, Plugins, Tools)
    const l5Content = request.includeCapabilities !== false
      ? `[CAPABILITIES_ENVIRONMENT]\nTools: Universal MCP Gateway Active\nPlugins: Connected Services & Providers Active\nWorkflows: Dynamic Multi-Agent Orchestration Enabled`
      : `[CAPABILITIES_ENVIRONMENT]\nCore Capabilities Active.`;
    layers.push({
      level: 5,
      name: 'L5_CAPABILITIES',
      content: l5Content,
      tokensEstimate: Math.ceil(l5Content.length / 4),
    });

    // L6: System Directives & Principles
    const l6Content = `[PAIOS_OPERATING_PRINCIPLES]\n1. You are operating as the top-level PAIOS (Personal AI Operating System).\n2. Adhere strictly to the active Privacy Mode (${privacyMode}).\n3. Provide explainable decision rationales for high-impact actions.\n4. Protect user personal data and never disclose credentials.`;
    layers.push({
      level: 6,
      name: 'L6_SYSTEM_POLICIES',
      content: l6Content,
      tokensEstimate: Math.ceil(l6Content.length / 4),
    });

    // Calculate total tokens and budget trimming if needed
    let totalTokens = layers.reduce((acc, l) => acc + l.tokensEstimate, 0);

    // If budget exceeded, trim lower priority layers (L4 memory, then L2, but never L0, L3, L6)
    if (totalTokens > maxBudget) {
      for (const layer of layers) {
        if (layer.level === 4 && totalTokens > maxBudget) {
          layer.content = layer.content.slice(0, 500) + '... [truncated]';
          layer.tokensEstimate = Math.ceil(layer.content.length / 4);
          totalTokens = layers.reduce((acc, l) => acc + l.tokensEstimate, 0);
        }
      }
    }

    const assembledPrompt = [...layers]
      .sort((a, b) => b.level - a.level) // System policies first, then down to user input
      .map(l => l.content)
      .join('\n\n');

    const result: AssembledContext = {
      promptContext: assembledPrompt,
      totalTokensEstimate: totalTokens,
      layers,
      budgetTokens: maxBudget,
      assembledAt: new Date().toISOString(),
    };

    this.bus.emit({
      type: 'context.assembled',
      source: 'ContextEngine',
      userId: activeProfile.userId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      data: { totalTokens, layerCount: layers.length, maxBudget },
    });

    return result;
  }
}
