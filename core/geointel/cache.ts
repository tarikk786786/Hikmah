import { CellLookupQuery, CellRecord } from './types.js';

interface CacheEntry {
  record: CellRecord;
  expiresAt: number;
}

export class CellLookupCache {
  private static instance: CellLookupCache;
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTtlMs: number = 30 * 24 * 60 * 60 * 1000; // 30 days for cellular infrastructure

  constructor(defaultTtlMs?: number) {
    if (defaultTtlMs) {
      this.defaultTtlMs = defaultTtlMs;
    }
  }

  public static getInstance(): CellLookupCache {
    if (!CellLookupCache.instance) {
      CellLookupCache.instance = new CellLookupCache();
    }
    return CellLookupCache.instance;
  }

  public generateKey(provider: string, radio: string, mcc: number, mnc: number, lac: number, cellId: number): string {
    const normRadio = radio.toUpperCase();
    return `${provider.toLowerCase()}:${normRadio}:${mcc}:${mnc}:${lac}:${cellId}`;
  }

  public get(query: CellLookupQuery, provider = 'opencellid'): CellRecord | null {
    const radio = query.radio || 'UNKNOWN';
    const key = this.generateKey(provider, radio, query.mcc, query.mnc, query.lac, query.cellId);
    
    let entry = this.cache.get(key);
    
    // If not found with specified radio, attempt wildcard search
    if (!entry && query.radio === undefined) {
      for (const [k, v] of this.cache.entries()) {
        const parts = k.split(':');
        // parts = [provider, radio, mcc, mnc, lac, cellId]
        if (
          parts[0] === provider.toLowerCase() &&
          parts[2] === String(query.mcc) &&
          parts[3] === String(query.mnc) &&
          parts[4] === String(query.lac) &&
          parts[5] === String(query.cellId)
        ) {
          entry = v;
          break;
        }
      }
    }

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry.record };
  }

  public set(record: CellRecord, ttlMs?: number): void {
    const key = this.generateKey(
      record.provider,
      record.radio,
      record.mcc,
      record.mnc,
      record.lac,
      record.cellId
    );

    this.cache.set(key, {
      record: { ...record },
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs)
    });
  }

  public size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
  }
}
