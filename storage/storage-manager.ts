import * as fs from 'fs';
import * as path from 'path';
import { StorageOrchestrator } from './core/orchestrator.js';

export interface StorageFile {
  key: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  provider: 'supabase' | 'telegram' | 's3' | 'r2' | 'local';
  url?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface StorageProvider {
  id: string;
  name: string;
  upload(key: string, data: Buffer | Uint8Array | string, mimeType?: string): Promise<StorageFile>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  getPublicUrl?(key: string): string;
}

// 1. Local Filesystem Provider (Legacy compatibility adapter)
export class LocalStorageProvider implements StorageProvider {
  public id = 'local';
  public name = 'Local Sandboxed Storage';
  private baseDir: string;

  constructor(baseDir: string = './storage_data') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(key: string, data: Buffer | Uint8Array | string, mimeType: string = 'text/plain'): Promise<StorageFile> {
    const filePath = path.join(this.baseDir, key);
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }

    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);
    fs.writeFileSync(filePath, content);

    return {
      key,
      name: path.basename(key),
      sizeBytes: content.length,
      mimeType,
      provider: 'local',
      createdAt: new Date().toISOString()
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

// 2. Supabase Storage Provider Stub (Legacy compatibility adapter)
export class SupabaseStorageProvider implements StorageProvider {
  public id = 'supabase';
  public name = 'Supabase Storage Bucket';

  async upload(key: string, data: Buffer | Uint8Array | string, mimeType: string = 'text/plain'): Promise<StorageFile> {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.from(data).length;
    return {
      key,
      name: key,
      sizeBytes: size,
      mimeType,
      provider: 'supabase',
      url: `https://supabase-storage-placeholder.co/${key}`,
      createdAt: new Date().toISOString()
    };
  }

  async download(_key: string): Promise<Buffer> {
    return Buffer.from('Supabase stored content');
  }

  async delete(_key: string): Promise<boolean> {
    return true;
  }
}

// Universal Storage Manager (Maintains 100% backward compatibility while delegating to StorageOrchestrator)
export class StorageManager {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProviderId: string = 'local';
  private orchestrator: StorageOrchestrator;
  private static instance: StorageManager;

  constructor(orchestrator?: StorageOrchestrator) {
    this.orchestrator = orchestrator || StorageOrchestrator.getInstance();
    this.registerProvider(new LocalStorageProvider());
    this.registerProvider(new SupabaseStorageProvider());
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  public registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.id, provider);
  }

  public setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Storage provider [${id}] not registered`);
    }
    this.defaultProviderId = id;
  }

  public getProvider(id?: string): StorageProvider {
    const targetId = id || this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      return this.providers.get('local')!;
    }
    return provider;
  }

  public async uploadFile(
    key: string,
    data: Buffer | Uint8Array | string,
    options?: { providerId?: string; mimeType?: string }
  ): Promise<StorageFile> {
    const providerId = options?.providerId || this.defaultProviderId;
    if (providerId === 'local') {
      const obj = await this.orchestrator.put({
        key,
        data,
        mimeType: options?.mimeType,
        providerPreference: 'local'
      });
      return {
        key: obj.key,
        name: obj.name,
        sizeBytes: obj.sizeBytes,
        mimeType: obj.mimeType,
        provider: 'local',
        createdAt: obj.createdAt
      };
    }

    const provider = this.getProvider(providerId);
    return provider.upload(key, data, options?.mimeType);
  }

  public async getFile(key: string, providerId?: string): Promise<Buffer> {
    const targetProvider = providerId || this.defaultProviderId;
    if (targetProvider === 'local') {
      try {
        return await this.orchestrator.get(key);
      } catch {
        const provider = this.getProvider('local');
        return provider.download(key);
      }
    }
    const provider = this.getProvider(targetProvider);
    return provider.download(key);
  }

  public async deleteFile(key: string, providerId?: string): Promise<boolean> {
    const targetProvider = providerId || this.defaultProviderId;
    if (targetProvider === 'local') {
      return this.orchestrator.delete(key, { purge: true });
    }
    const provider = this.getProvider(targetProvider);
    return provider.delete(key);
  }
}
