import * as fs from 'fs';
import * as path from 'path';
import { StorageBackendProvider, ProviderHealth, PutResult } from '../base.js';
import { StorageTier } from '../../core/types.js';

export class LocalStorageProvider implements StorageBackendProvider {
  public id = 'local';
  public name = 'Local Sandboxed Storage';
  public tier: StorageTier = 'NORMAL';
  private baseDir: string;

  constructor(baseDir: string = './storage_data') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    // Prevent path traversal
    const safeKey = key.replace(/^(\.\.[\/\\])+/, '');
    const resolved = path.resolve(this.baseDir, safeKey);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Path traversal attempt detected for key: ${key}`);
    }
    return resolved;
  }

  async isAvailable(): Promise<boolean> {
    try {
      return fs.existsSync(this.baseDir);
    } catch {
      return false;
    }
  }

  async putObject(
    key: string,
    data: Buffer | Uint8Array,
    _options?: { mimeType?: string; metadata?: Record<string, unknown> }
  ): Promise<PutResult> {
    const filePath = this.resolveSafePath(key);
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    fs.writeFileSync(filePath, buffer);

    return {
      providerRef: key,
      sizeBytes: buffer.length,
      url: `file://${filePath.replace(/\\/g, '/')}`
    };
  }

  async getObject(providerRefOrKey: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(providerRefOrKey);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found in local storage: ${providerRefOrKey}`);
    }
    return fs.readFileSync(filePath);
  }

  async deleteObject(providerRefOrKey: string): Promise<boolean> {
    const filePath = this.resolveSafePath(providerRefOrKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async getHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const testFile = path.join(this.baseDir, '.health_check');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);

      return {
        healthy: true,
        latencyMs: Date.now() - start,
        providerId: this.id,
        tier: this.tier,
        configured: true,
        message: 'Local sandboxed filesystem ready and writable',
        details: { baseDir: this.baseDir }
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        providerId: this.id,
        tier: this.tier,
        configured: false,
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
