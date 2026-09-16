import { StorageTier } from '../core/types.js';

export interface ProviderHealth {
  healthy: boolean;
  latencyMs: number;
  providerId: string;
  tier: StorageTier;
  configured: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface PutResult {
  providerRef: string;
  sizeBytes: number;
  url?: string;
}

export interface StorageBackendProvider {
  id: string;
  name: string;
  tier: StorageTier;

  isAvailable(): Promise<boolean>;
  putObject(
    key: string,
    data: Buffer | Uint8Array,
    options?: { mimeType?: string; metadata?: Record<string, unknown> }
  ): Promise<PutResult>;
  getObject(providerRefOrKey: string): Promise<Buffer>;
  deleteObject(providerRefOrKey: string): Promise<boolean>;
  getHealth(): Promise<ProviderHealth>;
}
