import { StorageTier, StorageProviderType } from './types.js';
import { StorageBackendProvider, ProviderHealth } from '../providers/base.js';
import { LocalStorageProvider } from '../providers/local/provider.js';
import { SupabaseStorageProvider } from '../providers/supabase/provider.js';
import { TelegramStorageProvider } from '../providers/telegram/provider.js';
import { S3CompatibleStorageProvider } from '../providers/s3/provider.js';

export interface RouteResolutionOptions {
  tier?: StorageTier;
  sizeBytes?: number;
  preference?: StorageProviderType | string;
}

export class StorageRouter {
  private static instance: StorageRouter;
  private providers: Map<string, StorageBackendProvider> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider(new LocalStorageProvider());
    this.registerProvider(new SupabaseStorageProvider());
    this.registerProvider(new TelegramStorageProvider());
    this.registerProvider(new S3CompatibleStorageProvider());
  }

  public static getInstance(): StorageRouter {
    if (!StorageRouter.instance) {
      StorageRouter.instance = new StorageRouter();
    }
    return StorageRouter.instance;
  }

  public registerProvider(provider: StorageBackendProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): StorageBackendProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): StorageBackendProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolves the target storage provider and storage tier.
   */
  public resolveProvider(options: RouteResolutionOptions): {
    provider: StorageBackendProvider;
    tier: StorageTier;
  } {
    // 1. If explicit provider preference is provided and exists
    if (options.preference && this.providers.has(options.preference)) {
      const p = this.providers.get(options.preference)!;
      return {
        provider: p,
        tier: options.tier || p.tier
      };
    }

    // 2. If tier is specified
    const targetTier: StorageTier = options.tier || (
      options.sizeBytes && options.sizeBytes > 50 * 1024 * 1024 ? 'COLD' : 'NORMAL'
    );

    if (targetTier === 'COLD' || targetTier === 'ARCHIVE') {
      // Prioritize Telegram cold storage or S3
      const tg = this.providers.get('telegram');
      if (tg) return { provider: tg, tier: targetTier };

      const s3 = this.providers.get('s3');
      if (s3) return { provider: s3, tier: targetTier };
    }

    // NORMAL / HOT Tier: Prioritize Supabase, then Local
    const supabase = this.providers.get('supabase');
    if (supabase) return { provider: supabase, tier: targetTier };

    const local = this.providers.get('local');
    if (local) return { provider: local, tier: targetTier };

    // Fallback to first available provider
    const fallback = Array.from(this.providers.values())[0];
    if (!fallback) {
      throw new Error('No storage providers registered in StorageRouter');
    }

    return { provider: fallback, tier: targetTier };
  }

  /**
   * Aggregates health status from all registered providers.
   */
  public async getHealthReport(): Promise<ProviderHealth[]> {
    const healthPromises = Array.from(this.providers.values()).map(p => p.getHealth());
    return Promise.all(healthPromises);
  }
}
