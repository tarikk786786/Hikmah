import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserSessionManager } from '../browser/core/session-manager.js';

describe('PRD 12: Browser Session & Profile Manager', () => {
  let manager: BrowserSessionManager;

  beforeEach(() => {
    manager = new BrowserSessionManager();
  });

  it('should initialize with default profile', () => {
    const profiles = manager.listProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    const def = manager.getProfile('default');
    expect(def).toBeDefined();
    expect(def?.name).toBe('Default Profile');
  });

  it('should create custom profiles with cookies and proxy routing', () => {
    const profile = manager.createProfile({
      name: 'Tor Anonymous Profile',
      userAgent: 'Mozilla/5.0 TorBrowser/13.0',
      viewport: { width: 1920, height: 1080 },
      proxy: { server: 'socks5://127.0.0.1:9050' },
      cookies: [{ name: 'auth_token', value: 'secret123', domain: 'example.com', path: '/' }],
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('Tor Anonymous Profile');
    expect(profile.cookies.length).toBe(1);
    expect(profile.proxy?.server).toBe('socks5://127.0.0.1:9050');
  });

  it('should create and isolate sessions', () => {
    const session1 = manager.createSession();
    const session2 = manager.createSession();

    expect(session1.id).not.toBe(session2.id);
    expect(session1.status).toBe('idle');

    const activeList = manager.listSessions();
    expect(activeList.length).toBe(2);
  });

  it('should update session status and url', () => {
    const session = manager.createSession();
    manager.updateSession(session.id, {
      status: 'navigating',
      currentUrl: 'https://news.ycombinator.com',
      title: 'Hacker News',
    });

    const updated = manager.getSession(session.id);
    expect(updated?.status).toBe('navigating');
    expect(updated?.currentUrl).toBe('https://news.ycombinator.com');
    expect(updated?.title).toBe('Hacker News');
  });

  it('should close sessions and update active list', () => {
    const session = manager.createSession();
    expect(manager.listSessions().length).toBe(1);

    const closed = manager.closeSession(session.id);
    expect(closed).toBe(true);

    expect(manager.listSessions(false).length).toBe(0);
    expect(manager.listSessions(true).length).toBe(1);
  });

  it('should merge updated cookies into profile', () => {
    const profile = manager.createProfile({ name: 'Cookie Test Profile' });
    manager.updateProfileCookies(profile.id, [
      { name: 'session_id', value: 'sess_abc', domain: '.test.org', path: '/' },
    ]);

    const retrieved = manager.getProfile(profile.id);
    expect(retrieved?.cookies.find((c) => c.name === 'session_id')?.value).toBe('sess_abc');
  });
});
