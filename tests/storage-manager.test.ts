import { describe, it, expect } from 'vitest';
import { StorageManager } from '../storage/storage-manager.js';

describe('StorageManager', () => {
  const manager = StorageManager.getInstance();

  it('should upload, retrieve, and delete files using local sandboxed provider', async () => {
    const testKey = `test_file_${Date.now()}.txt`;
    const payload = 'Hikmah Universal Capability Engine persistent storage test';

    const uploaded = await manager.uploadFile(testKey, payload, { mimeType: 'text/plain' });
    expect(uploaded.key).toBe(testKey);
    expect(uploaded.provider).toBe('local');

    const retrieved = await manager.getFile(testKey);
    expect(retrieved.toString('utf-8')).toBe(payload);

    const deleted = await manager.deleteFile(testKey);
    expect(deleted).toBe(true);
  });
});
