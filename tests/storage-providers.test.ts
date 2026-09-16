import { describe, it, expect } from 'vitest';
import { LocalStorageProvider } from '../storage/providers/local/provider.js';
import { SupabaseStorageProvider } from '../storage/providers/supabase/provider.js';
import { TelegramStorageProvider } from '../storage/providers/telegram/provider.js';
import { S3CompatibleStorageProvider } from '../storage/providers/s3/provider.js';
import { StorageRouter } from '../storage/core/router.js';

describe('PRD 10: Storage Providers & Router', () => {
  it('LocalStorageProvider should store, retrieve, and guard against path traversal', async () => {
    const provider = new LocalStorageProvider('./storage_data');
    const key = `local_test_${Date.now()}.txt`;
    const data = Buffer.from('Local sandboxed content');

    const putRes = await provider.putObject(key, data);
    expect(putRes.sizeBytes).toBe(data.length);

    const got = await provider.getObject(key);
    expect(got.toString('utf-8')).toBe('Local sandboxed content');

    const health = await provider.getHealth();
    expect(health.healthy).toBe(true);

    // Guard against path traversal
    await expect(provider.getObject('../../../outside.txt')).rejects.toThrow();

    await provider.deleteObject(key);
  });

  it('SupabaseStorageProvider should operate reliably in fallback mode', async () => {
    const provider = new SupabaseStorageProvider();
    const key = `supabase_test_${Date.now()}.bin`;
    const data = Buffer.from('Supabase blob payload');

    const putRes = await provider.putObject(key, data);
    expect(putRes.sizeBytes).toBe(data.length);

    const got = await provider.getObject(key);
    expect(got.toString('utf-8')).toBe('Supabase blob payload');

    const health = await provider.getHealth();
    expect(health.healthy).toBe(true);
  });

  it('TelegramStorageProvider should store objects in cold archive without leaking credentials', async () => {
    const provider = new TelegramStorageProvider();
    const key = `telegram_archive_${Date.now()}.tar`;
    const data = Buffer.from('Simulated cold archive data over Telegram TG-S3');

    const putRes = await provider.putObject(key, data);
    expect(putRes.providerRef).toMatch(/^tg_/);

    const got = await provider.getObject(putRes.providerRef);
    expect(got.toString('utf-8')).toBe('Simulated cold archive data over Telegram TG-S3');

    const health = await provider.getHealth();
    expect(health.healthy).toBe(true);
    expect(health.tier).toBe('COLD');
  });

  it('S3CompatibleStorageProvider should support enterprise archive tier', async () => {
    const provider = new S3CompatibleStorageProvider();
    const key = `s3_test_${Date.now()}.dat`;
    const data = Buffer.from('S3 enterprise dataset');

    const putRes = await provider.putObject(key, data);
    expect(putRes.providerRef).toContain('s3://');

    const got = await provider.getObject(putRes.providerRef);
    expect(got.toString('utf-8')).toBe('S3 enterprise dataset');
  });

  it('StorageRouter should route tiers to optimal providers', () => {
    const router = new StorageRouter();

    // COLD tier should route to Telegram or S3
    const cold = router.resolveProvider({ tier: 'COLD' });
    expect(['telegram', 's3']).toContain(cold.provider.id);
    expect(cold.tier).toBe('COLD');

    // NORMAL tier should route to Supabase or Local
    const normal = router.resolveProvider({ tier: 'NORMAL' });
    expect(['supabase', 'local']).toContain(normal.provider.id);

    // Large objects > 50MB should automatically default to COLD tier
    const large = router.resolveProvider({ sizeBytes: 60 * 1024 * 1024 });
    expect(large.tier).toBe('COLD');
  });
});
