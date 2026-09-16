import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';

export type SessionState = 'active' | 'paused' | 'checkpointed' | 'closed';

export interface SessionCheckpoint {
  id: string;
  sessionId: string;
  stepIndex: number;
  summary: string;
  openFiles: string[];
  activeAgentId?: string;
  contextTokensUsed: number;
  serializedState: Record<string, unknown>;
  createdAt: string;
}

export interface PAIOSSession {
  id: string;
  userId: string;
  profileId: string;
  projectId?: string;
  title: string;
  state: SessionState;
  originDeviceId?: string;
  currentDeviceId?: string;
  activeAgents: string[];
  checkpoints: SessionCheckpoint[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, PAIOSSession> = new Map();
  private activeSessionId: string | null = null;
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedInitialSession();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private seedInitialSession(): void {
    const defaultSession: PAIOSSession = {
      id: 'sess_initial_master',
      userId: 'user_master_owner',
      profileId: 'prof_default_owner',
      projectId: 'proj_hikmah_core',
      title: 'Master PAIOS Executive Session',
      state: 'active',
      originDeviceId: 'dev_local_desktop',
      currentDeviceId: 'dev_local_desktop',
      activeAgents: ['orchestrator-supervisor'],
      checkpoints: [],
      metadata: { autoSaved: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(defaultSession.id, defaultSession);
    this.activeSessionId = defaultSession.id;
  }

  public createSession(params: {
    userId: string;
    profileId: string;
    title?: string;
    projectId?: string;
    deviceId?: string;
  }): PAIOSSession {
    const id = `sess_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const session: PAIOSSession = {
      id,
      userId: params.userId,
      profileId: params.profileId,
      projectId: params.projectId,
      title: params.title || `Session ${new Date().toLocaleTimeString()}`,
      state: 'active',
      originDeviceId: params.deviceId,
      currentDeviceId: params.deviceId,
      activeAgents: [],
      checkpoints: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(id, session);
    this.activeSessionId = id;

    this.bus.emit({
      type: 'session.created',
      source: 'SessionManager',
      userId: params.userId,
      sessionId: id,
      projectId: params.projectId,
      data: { title: session.title },
    });

    return session;
  }

  public getSession(id: string): PAIOSSession | undefined {
    return this.sessions.get(id);
  }

  public getActiveSession(): PAIOSSession | undefined {
    if (this.activeSessionId && this.sessions.has(this.activeSessionId)) {
      return this.sessions.get(this.activeSessionId);
    }
    const first = Array.from(this.sessions.values())[0];
    if (first) {
      this.activeSessionId = first.id;
      return first;
    }
    return undefined;
  }

  public checkpointSession(sessionId: string, params: {
    summary: string;
    stepIndex: number;
    openFiles?: string[];
    activeAgentId?: string;
    contextTokensUsed?: number;
    stateData?: Record<string, unknown>;
  }): SessionCheckpoint {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }

    const checkpoint: SessionCheckpoint = {
      id: `chk_${crypto.randomBytes(6).toString('hex')}`,
      sessionId,
      stepIndex: params.stepIndex,
      summary: params.summary,
      openFiles: params.openFiles || [],
      activeAgentId: params.activeAgentId,
      contextTokensUsed: params.contextTokensUsed || 0,
      serializedState: params.stateData || {},
      createdAt: new Date().toISOString(),
    };

    session.checkpoints.push(checkpoint);
    session.state = 'checkpointed';
    session.updatedAt = checkpoint.createdAt;

    this.bus.emit({
      type: 'session.checkpointed',
      source: 'SessionManager',
      sessionId,
      userId: session.userId,
      data: { checkpointId: checkpoint.id, summary: checkpoint.summary },
    });

    return checkpoint;
  }

  public pauseSession(sessionId: string, reason?: string): PAIOSSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }
    session.state = 'paused';
    session.updatedAt = new Date().toISOString();

    this.bus.emit({
      type: 'session.paused',
      source: 'SessionManager',
      sessionId,
      data: { reason: reason || 'User pause' },
    });

    return session;
  }

  public resumeSession(sessionId: string, targetDeviceId?: string): PAIOSSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    const prevDevice = session.currentDeviceId;
    session.state = 'active';
    if (targetDeviceId) {
      session.currentDeviceId = targetDeviceId;
    }
    session.updatedAt = new Date().toISOString();
    this.activeSessionId = session.id;

    this.bus.emit({
      type: 'session.resumed',
      source: 'SessionManager',
      sessionId,
      data: {
        fromDevice: prevDevice,
        toDevice: session.currentDeviceId,
        checkpointsAvailable: session.checkpoints.length,
      },
    });

    return session;
  }

  public listSessions(userId?: string): PAIOSSession[] {
    const list = Array.from(this.sessions.values());
    return userId ? list.filter(s => s.userId === userId) : list;
  }
}
