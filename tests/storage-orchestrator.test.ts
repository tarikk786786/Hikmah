import { describe, it, expect, beforeEach } from 'vitest';
import { StorageOrchestrator } from '../storage/core/orchestrator.js';

describe('PRD 10: StorageOrchestrator Core Operations', () => {
  let orchestrator: StorageOrchestrator;

  beforeEach(() => {
    orchestrator = new StorageOrchestrator();
  });

  it('should put and get an object accurately', async () => {
    const key = `test_docs/note_${Date.now()}.txt`;
    const content = 'Hikmah Universal Storage Engine test payload';

    const putResult = await orchestrator.put({
      key,
      data: content,
      mimeType: 'text/plain',
      tier: 'NORMAL'
    });

    expect(putResult.key).toBe(key);
    expect(putResult.status).toBe('ACTIVE');
    expect(putResult.tier).toBe('NORMAL');
    expect(putResult.sizeBytes).toBe(Buffer.byteLength(content));

    const retrieved = await orchestrator.get(key);
    expect(retrieved.toString('utf-8')).toBe(content);
  });

  it('should list and search stored objects', async () => {
    const key1 = `search_test/alpha_${Date.now()}.json`;
    const key2 = `search_test/beta_${Date.now()}.md`;

    await orchestrator.put({ key: key1, data: '{"status":"ok"}', mimeType: 'application/json' });
    await orchestrator.put({ key: key2, data: '# Markdown header', mimeType: 'text/markdown' });

    const list = await orchestrator.list({ prefix: 'search_test/' });
    expect(list.length).toBeGreaterThanOrEqual(2);

    const searchRes = await orchestrator.search('alpha');
    expect(searchRes.some(o => o.key === key1)).toBe(true);
  });

  it('should copy and rename objects without corrupting data', async () => {
    const srcKey = `copy_test/source_${Date.now()}.txt`;
    const destKey = `copy_test/dest_${Date.now()}.txt`;
    const payload = 'Zero copy deduplication payload';

    await orchestrator.put({ key: srcKey, data: payload });

    const copied = await orchestrator.copy(srcKey, destKey);
    expect(copied.key).toBe(destKey);

    const retrievedCopy = await orchestrator.get(destKey);
    expect(retrievedCopy.toString('utf-8')).toBe(payload);

    const renamed = await orchestrator.rename(copied.id, 'renamed_file.txt');
    expect(renamed.name).toBe('renamed_file.txt');
  });

  it('should generate and revoke expiring shares', async () => {
    const key = `share_test/file_${Date.now()}.txt`;
    await orchestrator.put({ key, data: 'Shareable asset' });

    const share = await orchestrator.share(key, {
      accessLevel: 'DOWNLOAD',
      expiresInSeconds: 3600
    });

    expect(share.shareToken).toBeDefined();
    expect(share.accessLevel).toBe('DOWNLOAD');

    const revoked = await orchestrator.revokeShare(share.shareToken);
    expect(revoked).toBe(true);
  });

  it('should cryptographically verify object integrity', async () => {
    const key = `verify_test/file_${Date.now()}.txt`;
    await orchestrator.put({ key, data: 'Cryptographically verified payload' });

    const verification = await orchestrator.verify(key);
    expect(verification.valid).toBe(true);
    expect(verification.actualSha256).toBe(verification.expectedSha256);
  });

  it('should delete and purge objects correctly', async () => {
    const key = `delete_test/file_${Date.now()}.txt`;
    await orchestrator.put({ key, data: 'To be deleted' });

    expect(await orchestrator.exists(key)).toBe(true);

    const deleted = await orchestrator.delete(key, { purge: false });
    expect(deleted).toBe(true);
    expect(await orchestrator.exists(key)).toBe(false);
  });
});
