/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Dedicated Browser MCP Server: 16 Production-Grade Browser Tools Registered into ToolRegistry & CapabilityRegistry
 */

import { ToolDefinition } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { BrowserOrchestrator } from '../../../browser/core/orchestrator.js';

export class BrowserMCPServer {
  private orchestrator: BrowserOrchestrator;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    orchestrator?: BrowserOrchestrator,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry
  ) {
    this.orchestrator = orchestrator || BrowserOrchestrator.getInstance();
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. browser_navigate
      {
        name: 'browser_navigate',
        version: '1.0.0',
        description: 'Navigate to target URL in an active or new browser session with wait options',
        risk: 'LOW',
        timeoutMs: 35000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Destination web URL to load' },
            sessionId: { type: 'string', description: 'Active session ID (optional, creates new if omitted)' },
            waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'] },
            timeoutMs: { type: 'number', description: 'Max wait time in milliseconds' },
          },
          required: ['url'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          let sessionId = input.sessionId;
          if (!sessionId) {
            const session = await this.orchestrator.createSession();
            sessionId = session.id;
          }
          const result = await this.orchestrator.navigate(sessionId, input.url, {
            waitUntil: input.waitUntil,
            timeoutMs: input.timeoutMs,
          });
          return { success: result.success, data: { ...result.data, sessionId }, error: result.error };
        },
      },

      // 2. browser_click
      {
        name: 'browser_click',
        version: '1.0.0',
        description: 'Click an element via selector or text with automatic self-healing recovery',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            selector: { type: 'string', description: 'CSS, XPath, or text selector' },
            enableSelfHealing: { type: 'boolean', default: true },
            targetText: { type: 'string', description: 'Optional text hint for self-healing recovery' },
            targetRole: { type: 'string', description: 'Optional ARIA role hint for self-healing' },
          },
          required: ['sessionId', 'selector'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.click(input.sessionId, input.selector, {
            enableSelfHealing: input.enableSelfHealing,
            targetText: input.targetText,
            targetRole: input.targetRole,
          });
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 3. browser_type
      {
        name: 'browser_type',
        version: '1.0.0',
        description: 'Type text into an input or textarea element',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            selector: { type: 'string', description: 'Selector targeting the input field' },
            text: { type: 'string', description: 'Text string to type' },
            clearFirst: { type: 'boolean', default: true },
            delayMs: { type: 'number', default: 0 },
          },
          required: ['sessionId', 'selector', 'text'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.type(input.sessionId, input.selector, input.text, {
            clearFirst: input.clearFirst,
            delayMs: input.delayMs,
          });
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 4. browser_fill_form
      {
        name: 'browser_fill_form',
        version: '1.0.0',
        description: 'Populate multiple form fields simultaneously in a single command',
        risk: 'LOW',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            fields: { type: 'object', description: 'Key-value map of selector to input text' },
          },
          required: ['sessionId', 'fields'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.fillForm(input.sessionId, input.fields);
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 5. browser_select
      {
        name: 'browser_select',
        version: '1.0.0',
        description: 'Select an option in a dropdown <select> element',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            selector: { type: 'string', description: 'Dropdown selector' },
            value: { type: 'string', description: 'Option value or text to choose' },
          },
          required: ['sessionId', 'selector', 'value'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.select(input.sessionId, input.selector, input.value);
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 6. browser_scroll
      {
        name: 'browser_scroll',
        version: '1.0.0',
        description: 'Scroll view vertically or horizontally',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            deltaY: { type: 'number', description: 'Vertical scroll distance in px (positive down, negative up)' },
            deltaX: { type: 'number', description: 'Horizontal scroll distance in px' },
            selector: { type: 'string', description: 'Target element to scroll into view' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.scroll(input.sessionId, {
            deltaY: input.deltaY,
            deltaX: input.deltaX,
            selector: input.selector,
          });
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 7. browser_wait
      {
        name: 'browser_wait',
        version: '1.0.0',
        description: 'Wait for a selector to appear, state change, or fixed timeout',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            selectorOrTimeout: { type: ['string', 'number'], description: 'Element selector or sleep duration in ms' },
            timeoutMs: { type: 'number' },
          },
          required: ['sessionId', 'selectorOrTimeout'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.waitFor(input.sessionId, input.selectorOrTimeout, {
            timeoutMs: input.timeoutMs,
          });
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 8. browser_screenshot
      {
        name: 'browser_screenshot',
        version: '1.0.0',
        description: 'Capture screenshot of the active browser viewport or element',
        risk: 'LOW',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            fullPage: { type: 'boolean', default: false },
            type: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
            persistToStorage: { type: 'boolean', default: false },
            userId: { type: 'string' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const res = await this.orchestrator.screenshot(input.sessionId, {
            fullPage: input.fullPage,
            type: input.type,
            persistToStorage: input.persistToStorage,
            userId: input.userId,
          });
          return {
            success: true,
            data: {
              sizeBytes: res.buffer.length,
              storageKey: res.storageKey,
              base64: res.buffer.toString('base64'),
            },
          };
        },
      },

      // 9. browser_snapshot_dom
      {
        name: 'browser_snapshot_dom',
        version: '1.0.0',
        description: 'Extract cleaned DOM snapshot and catalog of all interactive elements on the page',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const snapshot = await this.orchestrator.snapshotDOM(input.sessionId);
          return { success: true, data: snapshot };
        },
      },

      // 10. browser_extract_accessibility
      {
        name: 'browser_extract_accessibility',
        version: '1.0.0',
        description: 'Extract the full accessibility tree with roles, names, and keyboard focus states',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const a11y = await this.orchestrator.extractAccessibilityTree(input.sessionId);
          return { success: true, data: a11y };
        },
      },

      // 11. browser_act_semantic
      {
        name: 'browser_act_semantic',
        version: '1.0.0',
        description: 'Execute high-level natural language intent (Stagehand act) on the current page',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            instruction: { type: 'string', description: 'Natural language command (e.g. "click on Sign In")' },
            variables: { type: 'object', description: 'Variables for dynamic form population' },
          },
          required: ['sessionId', 'instruction'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.actSemantic(input.sessionId, {
            instruction: input.instruction,
            variables: input.variables,
          });
          return { success: result.success, data: result.data, error: result.error };
        },
      },

      // 12. browser_extract_semantic
      {
        name: 'browser_extract_semantic',
        version: '1.0.0',
        description: 'Extract typed structured JSON schema directly from visible page state (Stagehand extract)',
        risk: 'LOW',
        timeoutMs: 25000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            schema: { type: 'object', description: 'Desired JSON schema template or field descriptors' },
            instruction: { type: 'string', description: 'Extraction guidance instruction' },
          },
          required: ['sessionId', 'schema'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const data = await this.orchestrator.extractSemantic(input.sessionId, {
            schema: input.schema,
            instruction: input.instruction,
          });
          return { success: true, data };
        },
      },

      // 13. browser_observe
      {
        name: 'browser_observe',
        version: '1.0.0',
        description: 'Discover available interactive actions and affordances on the current page (Stagehand observe)',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Active session ID' },
            query: { type: 'string', description: 'Optional focus query for suggested actions' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const result = await this.orchestrator.observe(input.sessionId, input.query);
          return { success: true, data: result };
        },
      },

      // 14. browser_session_create
      {
        name: 'browser_session_create',
        version: '1.0.0',
        description: 'Initialize an isolated browser session with specific profile, cookies, and proxy',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            profileId: { type: 'string', description: 'Browser profile ID (defaults to "default")' },
            browserType: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], default: 'chromium' },
            metadata: { type: 'object' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const session = await this.orchestrator.createSession({
            profileId: input.profileId,
            browserType: input.browserType,
            metadata: input.metadata,
          });
          return { success: true, data: session };
        },
      },

      // 15. browser_session_close
      {
        name: 'browser_session_close',
        version: '1.0.0',
        description: 'Terminate an active browser session and flush session cookies to profile',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session ID to close' },
          },
          required: ['sessionId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const closed = await this.orchestrator.closeSession(input.sessionId);
          return { success: closed, data: { sessionId: input.sessionId, closed } };
        },
      },

      // 16. browser_run_agent
      {
        name: 'browser_run_agent',
        version: '1.0.0',
        description: 'Execute an autonomous multi-step web agent goal (BrowserUseAgent)',
        risk: 'MEDIUM',
        timeoutMs: 120000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'High-level objective to complete' },
            startUrl: { type: 'string', description: 'Initial URL to navigate to' },
            maxSteps: { type: 'number', default: 10 },
            profileId: { type: 'string' },
            sessionId: { type: 'string' },
          },
          required: ['goal'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const goalResult = await this.orchestrator.runAgent({
            goal: input.goal,
            startUrl: input.startUrl,
            maxSteps: input.maxSteps,
            profileId: input.profileId,
            sessionId: input.sessionId,
          });
          return { success: goalResult.status === 'completed', data: goalResult };
        },
      },
    ];

    // Register all tools into ToolRegistry
    for (const tool of tools) {
      this.toolRegistry.registerTool(tool);
    }

    // Register Browser Capability in CapabilityRegistry
    const capability: Capability = {
      id: 'cap_browser_intelligence_engine',
      name: 'Browser Intelligence Engine',
      description:
        'Unified Playwright browser driver with Stagehand semantic actions, autonomous BrowserUseAgent, self-healing selectors, and profile isolation',
      category: 'browser',
      type: 'BROWSER_PROVIDER',
      provider: 'hikmah-browser',
      version: '1.0.0',
      status: 'AVAILABLE',
      health: 'HEALTHY',
      tools: tools.map((t) => t.name),
      features: [
        'Deterministic Playwright browser automation',
        'Stagehand natural language act, extract, and observe',
        'Autonomous BrowserUseAgent multi-step execution',
        'Multi-strategy self-healing selector engine',
        'Profile isolation, cookie jars & storage state',
        'Accessibility tree & interactive DOM snapshots',
        'SSRF-safe navigation & download quarantine',
        'Universal Storage & Memory Router integration',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.capabilityRegistry.register(capability);
  }
}
