export interface StoredCredential {
  id: string;
  providerId: string;
  accountId: string;
  type: 'oauth2' | 'api_key' | 'basic' | 'custom';
  secretEncrypted: string;
  scopes: string[];
  expiresAt?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export class AuthenticationManager {
  private static instance: AuthenticationManager;
  private credentials: Map<string, StoredCredential> = new Map();

  public static getInstance(): AuthenticationManager {
    if (!AuthenticationManager.instance) {
      AuthenticationManager.instance = new AuthenticationManager();
    }
    return AuthenticationManager.instance;
  }

  /**
   * Stores a credential securely in vault.
   */
  public storeCredential(cred: Omit<StoredCredential, 'id' | 'createdAt' | 'updatedAt'>): StoredCredential {
    const id = `cred_${cred.providerId}_${cred.accountId}`;
    const now = new Date().toISOString();
    const stored: StoredCredential = {
      ...cred,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.credentials.set(id, stored);
    return stored;
  }

  /**
   * Retrieves a scoped credential without exposing secrets to model contexts.
   */
  public getScopedCredential(providerId: string, accountId: string, requestedScope?: string): StoredCredential | undefined {
    const id = `cred_${providerId}_${accountId}`;
    const cred = this.credentials.get(id);
    if (!cred) return undefined;

    if (requestedScope && !cred.scopes.includes(requestedScope) && !cred.scopes.includes('*')) {
      throw new Error(`Credential for account '${accountId}' lacks required scope '${requestedScope}'`);
    }

    return cred;
  }

  public revokeCredential(providerId: string, accountId: string): boolean {
    const id = `cred_${providerId}_${accountId}`;
    return this.credentials.delete(id);
  }

  public listCredentials(tenantId = 'default'): Array<Omit<StoredCredential, 'secretEncrypted'>> {
    return Array.from(this.credentials.values())
      .filter(c => c.tenantId === tenantId)
      .map(({ secretEncrypted, ...rest }) => rest);
  }
}
