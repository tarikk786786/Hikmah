/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Domain Types, Interfaces, and Data Contracts
 */

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface BrowserProfile {
  id: string;
  name: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  proxy?: {
    server: string;
    username?: string;
    password?: string;
    bypass?: string;
  };
  cookies: BrowserCookie[];
  storageState?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'idle' | 'busy' | 'navigating' | 'closed' | 'error';

export interface BrowserSession {
  id: string;
  profileId: string;
  status: SessionStatus;
  currentUrl: string;
  title: string;
  browserType: BrowserType;
  createdAt: string;
  lastActiveAt: string;
  activeTabId?: string;
  proxy?: string;
  metadata?: Record<string, any>;
}

export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill_form'
  | 'select'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'snapshot_dom'
  | 'extract_accessibility'
  | 'act_semantic'
  | 'extract_semantic'
  | 'observe'
  | 'evaluate'
  | 'go_back'
  | 'go_forward'
  | 'reload';

export interface BrowserAction {
  id: string;
  sessionId: string;
  type: BrowserActionType;
  params: Record<string, any>;
  timestamp: string;
}

export interface BrowserActionResult {
  success: boolean;
  actionId: string;
  type: BrowserActionType;
  sessionId?: string;
  data?: any;
  error?: string;
  durationMs: number;
  screenshot?: string; // base64 data URI or storage key
  healedSelector?: string;
}

export interface InteractiveElement {
  selector: string;
  tag: string;
  text: string;
  role?: string;
  type?: string;
  href?: string;
  name?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  isVisible: boolean;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DOMSnapshot {
  url: string;
  title: string;
  html: string;
  cleanedText: string;
  nodesCount: number;
  interactiveElements: InteractiveElement[];
}

export interface AccessibilityNode {
  role: string;
  name?: string;
  value?: string;
  description?: string;
  focused?: boolean;
  disabled?: boolean;
  selector?: string;
  children?: AccessibilityNode[];
}

export interface NetworkResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  mimeType: string;
  sizeBytes: number;
}

export interface NetworkRequest {
  id: string;
  sessionId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  resourceType: string;
  timestamp: string;
  response?: NetworkResponse;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  quality?: number;
  type?: 'png' | 'jpeg' | 'webp';
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selector?: string;
}

export type SelectorHealStrategy =
  | 'exact_css'
  | 'a11y_role_name'
  | 'semantic_text'
  | 'attribute_fuzzy'
  | 'llm_vision';

export interface SelfHealingSelector {
  originalSelector: string;
  targetRole?: string;
  targetText?: string;
  targetAriaLabel?: string;
  healedSelector?: string;
  confidence: number;
  strategyUsed?: SelectorHealStrategy;
}

export interface BrowserWorkerConfig {
  maxConcurrentSessions: number;
  defaultTimeoutMs: number;
  headless: boolean;
  browserType: BrowserType;
  userAgent?: string;
  downloadDir?: string;
  enableSelfHealing: boolean;
}

export interface SemanticActOptions {
  instruction: string;
  variables?: Record<string, any>;
  timeoutMs?: number;
}

export interface SemanticExtractOptions {
  schema: Record<string, any> | string;
  instruction?: string;
}

export interface SemanticObserveSuggestion {
  description: string;
  action: BrowserActionType;
  selector?: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export interface SemanticObserveResult {
  suggestions: SemanticObserveSuggestion[];
  pageContext: string;
}

export interface AgentStepRecord {
  stepNumber: number;
  thought: string;
  action: BrowserAction;
  result: BrowserActionResult;
}

export interface BrowserAgentGoal {
  id: string;
  goal: string;
  startUrl?: string;
  maxSteps: number;
  profileId?: string;
  sessionId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  steps: AgentStepRecord[];
  finalAnswer?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BrowserDriver {
  navigate(url: string, options?: { timeoutMs?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<{ url: string; title: string; status: number }>;
  click(selector: string, options?: { timeoutMs?: number; clickCount?: number }): Promise<void>;
  type(selector: string, text: string, options?: { delayMs?: number; clearFirst?: boolean }): Promise<void>;
  fillForm(fields: Record<string, string>): Promise<void>;
  select(selector: string, value: string): Promise<void>;
  scroll(options: { deltaX?: number; deltaY?: number; selector?: string }): Promise<void>;
  waitFor(selectorOrTimeout: string | number, options?: { state?: 'attached' | 'visible' | 'hidden'; timeoutMs?: number }): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  snapshotDOM(): Promise<DOMSnapshot>;
  extractAccessibilityTree(): Promise<AccessibilityNode>;
  evaluate<T = any>(script: string, arg?: any): Promise<T>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  getCookies(): Promise<BrowserCookie[]>;
  setCookies(cookies: BrowserCookie[]): Promise<void>;
  close(): Promise<void>;
  getCurrentUrl(): string;
  getTitle(): string;
}
