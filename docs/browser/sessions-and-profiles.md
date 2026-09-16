# Browser Sessions & Profiles Reference

## 1. Profiles vs Sessions
- **Profile (`BrowserProfile`)**: Represents persistent browser state. Holds cookies across runs, proxy settings, user-agent overrides, and viewport dimensions.
- **Session (`BrowserSession`)**: Represents an active or historical running browser tab/context created from a profile.

---

## 2. Profile Creation & Configuration

```typescript
const profile = orchestrator.createProfile({
  name: 'Research Profile',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HikmahBrowser/1.0',
  viewport: { width: 1920, height: 1080 },
  proxy: {
    server: 'http://corporate-proxy.corp:8080',
    username: 'hikmah_bot',
    password: 'secret_password',
  },
});
```

---

## 3. Session Lifecycle
1. **Creation**: `createSession({ profileId })` initializes a new session and driver context.
2. **State Updates**: Current URL, page title, and status (`idle`, `navigating`, `busy`, `error`) are updated automatically.
3. **Closing & Cookie Flush**: `closeSession(sessionId)` flushes all session cookies back to the profile's cookie store and tears down the browser context.
4. **Stale Session Reaper**: Sessions idle past TTL (default 30 minutes) are automatically marked as closed to conserve system resources.
