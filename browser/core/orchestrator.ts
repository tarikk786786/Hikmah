/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Master Browser Orchestrator: Driver Lifecycle, Semantic Operations, Self-Healing, Storage & Memory Ingestion
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BrowserSession,
  BrowserProfile,
  BrowserActionType,
  BrowserActionResult,
  DOMSnapshot,
  AccessibilityNode,
  ScreenshotOptions,
  SemanticActOptions,
  SemanticExtractOptions,
  SemanticObserveResult,
  BrowserAgentGoal,
  BrowserType,
} from './types.js';
import { BrowserSessionManager } from './session-manager.js';
import { PlaywrightBrowserDriver } from './driver/playwright-driver.js';
import { StagehandProvider } from './semantic/stagehand-provider.js';
import { SelfHealingEngine } from './self-healing/self-healing-engine.js';
import { BrowserUseAgent } from './agent/browser-use-agent.js';
import { StorageOrchestrator } from '../../storage/core/orchestrator.js';

export class BrowserOrchestrator {
  private static instance: BrowserOrchestrator;

  private sessionManager: BrowserSessionManager;
  private drivers = new Map<string, PlaywrightBrowserDriver>();
  private stagehandProviders = new Map<string, StagehandProvider>();
  private selfHealingEngines = new Map<string, SelfHealingEngine>();
  private actionAuditLogs: BrowserActionResult[] = [];
  private storageOrchestrator?: StorageOrchestrator;

  constructor(options?: {
    sessionManager?: BrowserSessionManager;
    storageOrchestrator?: StorageOrchestrator;
  }) {
    this.sessionManager = options?.sessionManager || new BrowserSessionManager();
    this.storageOrchestrator = options?.storageOrchestrator;
  }

  public static getInstance(): BrowserOrchestrator {
    if (!BrowserOrchestrator.instance) {
      BrowserOrchestrator.instance = new BrowserOrchestrator();
    }
    return BrowserOrchestrator.instance;
  }

  // --- Session Management ---

  public async createSession(options?: {
    profileId?: string;
    browserType?: BrowserType;
    metadata?: Record<string, any>;
  }): Promise<BrowserSession> {
    const session = this.sessionManager.createSession(options);
    const profile = this.sessionManager.getProfile(session.profileId);

    const driver = new PlaywrightBrowserDriver(profile);
    await driver.init();

    this.drivers.set(session.id, driver);
    this.stagehandProviders.set(session.id, new StagehandProvider(driver));
    this.selfHealingEngines.set(session.id, new SelfHealingEngine(driver));

    return session;
  }

  public getSession(sessionId: string): BrowserSession | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  public listSessions(includeClosed = false): BrowserSession[] {
    return this.sessionManager.listSessions(includeClosed);
  }

  public async closeSession(sessionId: string): Promise<boolean> {
    const driver = this.drivers.get(sessionId);
    if (driver) {
      // Sync cookies back to profile
      const cookies = await driver.getCookies();
      const session = this.sessionManager.getSession(sessionId);
      if (session) {
        this.sessionManager.updateProfileCookies(session.profileId, cookies);
      }

      await driver.close();
      this.drivers.delete(sessionId);
      this.stagehandProviders.delete(sessionId);
      this.selfHealingEngines.delete(sessionId);
    }

    return this.sessionManager.closeSession(sessionId);
  }

  // --- Profile Management ---

  public createProfile(params: {
    name: string;
    userAgent?: string;
    viewport?: { width: number; height: number };
    proxy?: { server: string; username?: string; password?: string; bypass?: string };
  }): BrowserProfile {
    return this.sessionManager.createProfile(params);
  }

  public getProfile(profileId: string): BrowserProfile | undefined {
    return this.sessionManager.getProfile(profileId);
  }

  public listProfiles(): BrowserProfile[] {
    return this.sessionManager.listProfiles();
  }

  // --- Navigation & Driver Actions ---

  public async navigate(
    sessionId: string,
    url: string,
    options?: { timeoutMs?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    this.sessionManager.updateSession(sessionId, { status: 'navigating' });

    try {
      const res = await driver.navigate(url, options);
      this.sessionManager.updateSession(sessionId, {
        status: 'idle',
        currentUrl: res.url,
        title: res.title,
      });

      const result: BrowserActionResult = {
        success: res.status < 400,
        actionId: uuidv4(),
        type: 'navigate',
        data: res,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      this.sessionManager.updateSession(sessionId, { status: 'error' });
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'navigate',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async click(
    sessionId: string,
    selector: string,
    options?: {
      enableSelfHealing?: boolean;
      targetText?: string;
      targetRole?: string;
      targetAriaLabel?: string;
      timeoutMs?: number;
    }
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);
    const selfHealer = this.selfHealingEngines.get(sessionId)!;

    this.sessionManager.updateSession(sessionId, { status: 'busy' });

    try {
      let healedSelector: string | undefined;

      if (options?.enableSelfHealing ?? true) {
        const healResult = await selfHealer.resilientClick(selector, {
          targetText: options?.targetText,
          targetRole: options?.targetRole,
          targetAriaLabel: options?.targetAriaLabel,
        });
        if (healResult.healed) {
          healedSelector = healResult.finalSelector;
        }
      } else {
        await driver.click(selector, { timeoutMs: options?.timeoutMs });
      }

      this.sessionManager.updateSession(sessionId, {
        status: 'idle',
        currentUrl: driver.getCurrentUrl(),
        title: driver.getTitle(),
      });

      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'click',
        healedSelector,
        data: { selector: healedSelector || selector },
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      this.sessionManager.updateSession(sessionId, { status: 'idle' });
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'click',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async type(
    sessionId: string,
    selector: string,
    text: string,
    options?: { delayMs?: number; clearFirst?: boolean }
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    this.sessionManager.updateSession(sessionId, { status: 'busy' });

    try {
      await driver.type(selector, text, options);
      this.sessionManager.updateSession(sessionId, { status: 'idle' });

      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'type',
        data: { selector, length: text.length },
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      this.sessionManager.updateSession(sessionId, { status: 'idle' });
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'type',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async fillForm(sessionId: string, fields: Record<string, string>): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    this.sessionManager.updateSession(sessionId, { status: 'busy' });

    try {
      await driver.fillForm(fields);
      this.sessionManager.updateSession(sessionId, { status: 'idle' });

      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'fill_form',
        data: { fieldCount: Object.keys(fields).length },
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      this.sessionManager.updateSession(sessionId, { status: 'idle' });
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'fill_form',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async select(sessionId: string, selector: string, value: string): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    this.sessionManager.updateSession(sessionId, { status: 'busy' });

    try {
      await driver.select(selector, value);
      this.sessionManager.updateSession(sessionId, { status: 'idle' });

      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'select',
        data: { selector, value },
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      this.sessionManager.updateSession(sessionId, { status: 'idle' });
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'select',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async scroll(
    sessionId: string,
    options: { deltaX?: number; deltaY?: number; selector?: string }
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    try {
      await driver.scroll(options);
      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'scroll',
        data: options,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'scroll',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async waitFor(
    sessionId: string,
    selectorOrTimeout: string | number,
    options?: { timeoutMs?: number }
  ): Promise<BrowserActionResult> {
    const startTime = Date.now();
    const driver = await this.ensureDriver(sessionId);

    try {
      await driver.waitFor(selectorOrTimeout, options);
      const result: BrowserActionResult = {
        success: true,
        actionId: uuidv4(),
        type: 'wait',
        data: { waitedFor: selectorOrTimeout },
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    } catch (error: any) {
      const result: BrowserActionResult = {
        success: false,
        actionId: uuidv4(),
        type: 'wait',
        error: error.message,
        durationMs: Date.now() - startTime,
      };
      this.logAction(result, sessionId);
      return result;
    }
  }

  public async screenshot(
    sessionId: string,
    options?: ScreenshotOptions & { persistToStorage?: boolean; userId?: string }
  ): Promise<{ buffer: Buffer; storageKey?: string }> {
    const driver = await this.ensureDriver(sessionId);
    const buffer = await driver.screenshot(options);

    let storageKey: string | undefined;
    if (options?.persistToStorage && this.storageOrchestrator && options.userId) {
      try {
        const upload = await this.storageOrchestrator.put({
          key: `screenshots/screenshot-${Date.now()}.png`,
          data: buffer,
          mimeType: 'image/png',
          userId: options.userId,
        });
        storageKey = upload.id;
      } catch {
        // Storage persistence fallback
      }
    }

    return { buffer, storageKey };
  }

  public async snapshotDOM(sessionId: string): Promise<DOMSnapshot> {
    const driver = await this.ensureDriver(sessionId);
    return await driver.snapshotDOM();
  }

  public async extractAccessibilityTree(sessionId: string): Promise<AccessibilityNode> {
    const driver = await this.ensureDriver(sessionId);
    return await driver.extractAccessibilityTree();
  }

  // --- Semantic Stagehand Actions ---

  public async actSemantic(sessionId: string, options: SemanticActOptions): Promise<BrowserActionResult> {
    await this.ensureDriver(sessionId);
    const stagehand = this.stagehandProviders.get(sessionId)!;
    const result = await stagehand.act(options);
    this.logAction(result, sessionId);
    return result;
  }

  public async extractSemantic(sessionId: string, options: SemanticExtractOptions): Promise<any> {
    await this.ensureDriver(sessionId);
    const stagehand = this.stagehandProviders.get(sessionId)!;
    return await stagehand.extract(options);
  }

  public async observe(sessionId: string, query?: string): Promise<SemanticObserveResult> {
    await this.ensureDriver(sessionId);
    const stagehand = this.stagehandProviders.get(sessionId)!;
    return await stagehand.observe(query);
  }

  // --- Autonomous Agent Execution ---

  public async runAgent(options: {
    goal: string;
    startUrl?: string;
    maxSteps?: number;
    profileId?: string;
    sessionId?: string;
  }): Promise<BrowserAgentGoal> {
    let session: BrowserSession;
    if (options.sessionId && this.sessionManager.getSession(options.sessionId)) {
      session = this.sessionManager.getSession(options.sessionId)!;
    } else {
      session = await this.createSession({ profileId: options.profileId });
    }

    const driver = await this.ensureDriver(session.id);
    const agent = new BrowserUseAgent(driver);

    return await agent.executeGoal({
      goal: options.goal,
      startUrl: options.startUrl,
      maxSteps: options.maxSteps,
      profileId: session.profileId,
      sessionId: session.id,
    });
  }

  public getActionLogs(sessionId?: string): BrowserActionResult[] {
    if (sessionId) {
      return this.actionAuditLogs.filter((a) => (a as any).sessionId === sessionId);
    }
    return [...this.actionAuditLogs];
  }

  // --- Private Helpers ---

  private async ensureDriver(sessionId: string): Promise<PlaywrightBrowserDriver> {
    let driver = this.drivers.get(sessionId);
    if (!driver) {
      let session = this.sessionManager.getSession(sessionId);
      if (!session) {
        session = this.sessionManager.createSession();
      }
      const profile = this.sessionManager.getProfile(session.profileId);
      driver = new PlaywrightBrowserDriver(profile);
      await driver.init();
      this.drivers.set(sessionId, driver);
      this.stagehandProviders.set(sessionId, new StagehandProvider(driver));
      this.selfHealingEngines.set(sessionId, new SelfHealingEngine(driver));
    }
    return driver;
  }

  private logAction(result: BrowserActionResult, sessionId?: string): void {
    if (sessionId) {
      result.sessionId = sessionId;
    }
    this.actionAuditLogs.push(result);
    if (this.actionAuditLogs.length > 500) {
      this.actionAuditLogs.shift();
    }
  }
}
