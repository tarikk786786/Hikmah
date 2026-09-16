import { AuthenticationManager } from '../auth/authentication-manager.js';

export interface OAuthConnection {
  providerId: string;
  accountId: string;
  connected: boolean;
  scopes: string[];
  expiresAt?: string;
  accountEmail?: string;
}

export class OAuthManager {
  private static instance: OAuthManager;
  private authManager: AuthenticationManager;
  private activeConnections: Map<string, OAuthConnection> = new Map();

  constructor() {
    this.authManager = AuthenticationManager.getInstance();
    this.seedDefaultConnections();
  }

  public static getInstance(): OAuthManager {
    if (!OAuthManager.instance) {
      OAuthManager.instance = new OAuthManager();
    }
    return OAuthManager.instance;
  }

  private seedDefaultConnections(): void {
    // Seed sample connected accounts for Google and GitHub
    this.activeConnections.set('google:primary', {
      providerId: 'gmail-provider',
      accountId: 'account-google-primary',
      connected: true,
      scopes: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/calendar'],
      accountEmail: 'user@company.com',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    this.activeConnections.set('github:primary', {
      providerId: 'github-provider',
      accountId: 'account-github-work',
      connected: true,
      scopes: ['repo', 'read:org'],
      accountEmail: 'developer@work.org',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  }

  public getAuthorizationUrl(provider: string, scopes: string[], redirectUri: string): { authUrl: string; state: string } {
    const state = `st_${Math.random().toString(36).substring(2, 10)}`;
    const authUrl = `https://auth.hikmah.os/oauth/authorize?provider=${provider}&scopes=${encodeURIComponent(scopes.join(' '))}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    return { authUrl, state };
  }

  public async handleCallback(providerId: string, accountId: string, code: string, scopes: string[]): Promise<OAuthConnection> {
    const conn: OAuthConnection = {
      providerId,
      accountId,
      connected: true,
      scopes,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    this.activeConnections.set(`${providerId}:${accountId}`, conn);
    this.authManager.storeCredential({
      providerId,
      accountId,
      type: 'oauth2',
      secretEncrypted: `enc_token_${code}_${Date.now()}`,
      scopes,
      expiresAt: conn.expiresAt,
      tenantId: 'default',
    });

    return conn;
  }

  public getConnectionStatus(providerId: string, accountId: string): OAuthConnection {
    const conn = this.activeConnections.get(`${providerId}:${accountId}`);
    if (!conn) {
      return {
        providerId,
        accountId,
        connected: false,
        scopes: [],
      };
    }
    return conn;
  }

  public revokeConnection(providerId: string, accountId: string): boolean {
    this.authManager.revokeCredential(providerId, accountId);
    return this.activeConnections.delete(`${providerId}:${accountId}`);
  }

  public listConnections(): OAuthConnection[] {
    return Array.from(this.activeConnections.values());
  }
}
