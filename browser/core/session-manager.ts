/**
 * Hikmah — PRD 12: Browser Intelligence Engine
 * Session & Profile Manager: Isolated Contexts, Cookie Persistence, Proxy Routing, and State Storage
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BrowserProfile,
  BrowserSession,
  BrowserCookie,
  BrowserType,
  SessionStatus,
} from './types.js';

export class BrowserSessionManager {
  private profiles = new Map<string, BrowserProfile>();
  private sessions = new Map<string, BrowserSession>();
  private readonly defaultTtlMs = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initDefaultProfile();
  }

  private initDefaultProfile(): void {
    const defaultProfile: BrowserProfile = {
      id: 'default',
      name: 'Default Profile',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 HikmahBrowser/1.0',
      viewport: {
        width: 1280,
        height: 800,
      },
      cookies: [],
      storageState: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(defaultProfile.id, defaultProfile);
  }

  // --- Profile Operations ---

  public createProfile(params: {
    name: string;
    userAgent?: string;
    viewport?: { width: number; height: number };
    proxy?: { server: string; username?: string; password?: string; bypass?: string };
    cookies?: BrowserCookie[];
    storageState?: Record<string, string>;
  }): BrowserProfile {
    const profile: BrowserProfile = {
      id: uuidv4(),
      name: params.name,
      userAgent:
        params.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 HikmahBrowser/1.0',
      viewport: params.viewport || { width: 1280, height: 800 },
      proxy: params.proxy,
      cookies: params.cookies || [],
      storageState: params.storageState || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  public getProfile(profileId: string): BrowserProfile | undefined {
    return this.profiles.get(profileId);
  }

  public listProfiles(): BrowserProfile[] {
    return Array.from(this.profiles.values());
  }

  public updateProfileCookies(profileId: string, cookies: BrowserCookie[]): void {
    const profile = this.profiles.get(profileId);
    if (!profile) return;

    // Merge cookies by name + domain
    const cookieMap = new Map<string, BrowserCookie>();
    for (const c of profile.cookies) {
      cookieMap.set(`${c.domain}:${c.name}`, c);
    }
    for (const c of cookies) {
      cookieMap.set(`${c.domain}:${c.name}`, c);
    }

    profile.cookies = Array.from(cookieMap.values());
    profile.updatedAt = new Date().toISOString();
  }

  // --- Session Operations ---

  public createSession(options?: {
    profileId?: string;
    browserType?: BrowserType;
    metadata?: Record<string, any>;
  }): BrowserSession {
    this.cleanupStaleSessions();

    const profileId = options?.profileId && this.profiles.has(options.profileId)
      ? options.profileId
      : 'default';

    const profile = this.profiles.get(profileId)!;
    const now = new Date().toISOString();

    const session: BrowserSession = {
      id: uuidv4(),
      profileId: profile.id,
      status: 'idle',
      currentUrl: 'about:blank',
      title: 'Blank Page',
      browserType: options?.browserType || 'chromium',
      createdAt: now,
      lastActiveAt: now,
      proxy: profile.proxy?.server,
      metadata: options?.metadata || {},
    };

    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(sessionId: string): BrowserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = new Date().toISOString();
    }
    return session;
  }

  public listSessions(includeClosed = false): BrowserSession[] {
    const list = Array.from(this.sessions.values());
    if (includeClosed) return list;
    return list.filter((s) => s.status !== 'closed');
  }

  public updateSession(
    sessionId: string,
    updates: Partial<Pick<BrowserSession, 'status' | 'currentUrl' | 'title' | 'metadata'>>
  ): BrowserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (updates.status) session.status = updates.status;
    if (updates.currentUrl) session.currentUrl = updates.currentUrl;
    if (updates.title) session.title = updates.title;
    if (updates.metadata) session.metadata = { ...session.metadata, ...updates.metadata };
    session.lastActiveAt = new Date().toISOString();

    return session;
  }

  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'closed';
    session.lastActiveAt = new Date().toISOString();
    return true;
  }

  public cleanupStaleSessions(maxAgeMs: number = this.defaultTtlMs): number {
    const cutoff = Date.now() - maxAgeMs;
    let closedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      const lastActive = new Date(session.lastActiveAt).getTime();
      if (session.status !== 'closed' && lastActive < cutoff) {
        session.status = 'closed';
        closedCount++;
      }
    }

    return closedCount;
  }
}
