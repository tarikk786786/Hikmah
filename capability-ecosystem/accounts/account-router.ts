export interface AccountIdentity {
  accountId: string;
  providerType: string; // 'google' | 'github' | 'microsoft' | 'telegram' | etc.
  label: string; // 'Personal' | 'Work' | 'Bot'
  email?: string;
  isDefault: boolean;
  tenantId: string;
  metadata?: Record<string, any>;
}

export class AccountRouter {
  private static instance: AccountRouter;
  private accounts: Map<string, AccountIdentity[]> = new Map();

  constructor() {
    this.seedDefaultAccounts();
  }

  public static getInstance(): AccountRouter {
    if (!AccountRouter.instance) {
      AccountRouter.instance = new AccountRouter();
    }
    return AccountRouter.instance;
  }

  private seedDefaultAccounts(): void {
    // Seed Google accounts (Personal & Work)
    this.accounts.set('google', [
      {
        accountId: 'account-google-personal',
        providerType: 'google',
        label: 'Personal Gmail',
        email: 'user.personal@gmail.com',
        isDefault: true,
        tenantId: 'default',
      },
      {
        accountId: 'account-google-work',
        providerType: 'google',
        label: 'Work Workspace',
        email: 'user@enterprise.com',
        isDefault: false,
        tenantId: 'default',
      },
    ]);

    // Seed GitHub accounts (Personal & Org)
    this.accounts.set('github', [
      {
        accountId: 'account-github-personal',
        providerType: 'github',
        label: 'Personal GitHub',
        isDefault: true,
        tenantId: 'default',
      },
      {
        accountId: 'account-github-work',
        providerType: 'github',
        label: 'Work Org GitHub',
        isDefault: false,
        tenantId: 'default',
      },
    ]);
  }

  public registerAccount(account: AccountIdentity): void {
    const list = this.accounts.get(account.providerType) || [];
    list.push(account);
    this.accounts.set(account.providerType, list);
  }

  public resolveAccount(providerType: string, options?: { accountId?: string; hint?: string }): AccountIdentity {
    const list = this.accounts.get(providerType) || [];
    if (list.length === 0) {
      // Return default anonymous account
      return {
        accountId: `anon_${providerType}`,
        providerType,
        label: 'Anonymous',
        isDefault: true,
        tenantId: 'default',
      };
    }

    // 1. Explicit ID
    if (options?.accountId) {
      const found = list.find(a => a.accountId === options.accountId);
      if (found) return found;
    }

    // 2. Hint matching (e.g. 'work' or 'personal')
    if (options?.hint) {
      const h = options.hint.toLowerCase();
      const matched = list.find(a => a.label.toLowerCase().includes(h) || (a.email && a.email.toLowerCase().includes(h)));
      if (matched) return matched;
    }

    // 3. Default account
    const def = list.find(a => a.isDefault);
    return def || list[0];
  }

  public listAccounts(providerType?: string): AccountIdentity[] {
    if (providerType) {
      return this.accounts.get(providerType) || [];
    }
    return Array.from(this.accounts.values()).flat();
  }
}
