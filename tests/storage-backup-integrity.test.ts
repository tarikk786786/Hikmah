import { describe, it, expect } from 'vitest';
import { BackupEngine } from '../storage/core/backup/backup-engine.js';

describe('PRD 10: Backup Engine & Disaster Recovery', () => {
  it('should create, verify, and restore backups with cryptographic integrity', async () => {
    const backupEngine = new BackupEngine();

    const manifest = await backupEngine.createBackup({
      type: 'DATABASE',
      name: 'Test_Snapshot_01',
      components: [
        {
          name: 'users_table.sql',
          path: 'schema/users.sql',
          data: 'CREATE TABLE users (id TEXT PRIMARY KEY);'
        },
        {
          name: 'memories_table.sql',
          path: 'schema/memories.sql',
          data: 'CREATE TABLE memories (id TEXT PRIMARY KEY, content TEXT);'
        }
      ],
      encrypt: true
    });

    expect(manifest.id).toBeDefined();
    expect(manifest.itemCount).toBe(2);
    expect(manifest.isEncrypted).toBe(true);
    expect(manifest.sha256).toBeDefined();

    // Verify
    const verification = backupEngine.verifyBackup(manifest.id);
    expect(verification.valid).toBe(true);

    // Dry Run Restore
    const dryRunRes = await backupEngine.restoreBackup(manifest.id, { dryRun: true });
    expect(dryRunRes.success).toBe(true);
    expect(dryRunRes.dryRun).toBe(true);
    expect(dryRunRes.restoredItems).toBe(2);
    expect(dryRunRes.verifiedSha256).toBe(true);

    // Live Restore
    const liveRes = await backupEngine.restoreBackup(manifest.id, { dryRun: false });
    expect(liveRes.success).toBe(true);
    expect(liveRes.dryRun).toBe(false);
    expect(liveRes.restoredItems).toBe(2);
  });

  it('should list and retrieve backup manifests', async () => {
    const backupEngine = new BackupEngine();
    await backupEngine.createBackup({ type: 'MEMORY', name: 'Memory_Fabric_Export' });
    await backupEngine.createBackup({ type: 'GIT_REPO', name: 'Git_Snapshot' });

    const list = backupEngine.listBackups();
    expect(list.length).toBeGreaterThanOrEqual(2);

    const first = list[0];
    const retrieved = backupEngine.getBackup(first.id);
    expect(retrieved?.id).toBe(first.id);
  });
});
