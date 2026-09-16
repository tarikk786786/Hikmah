# Automated Backup & Disaster Recovery (PRD 10)

## Overview

The `BackupEngine` creates self-contained, cryptographically signed snapshots across Hikmah's core subsystems:
1. **Database Schema & Relational Data**: PostgreSQL migrations and table rows.
2. **Memory Fabric**: Unified canonical records from `memory_registry`.
3. **Workspace & Code Repositories**: Project trees and manifests.
4. **Storage Manifests**: State records from `storage_objects` and `storage_chunks`.

## Manifest Schema (`BackupManifest`)

```typescript
export interface BackupManifest {
  id: string;
  name: string;
  backupType: 'DATABASE' | 'GIT_REPO' | 'MEMORY' | 'STORAGE' | 'FULL';
  sizeBytes: number;
  sha256: string;
  itemCount: number;
  components: {
    name: string;
    path: string;
    sizeBytes: number;
    sha256: string;
  }[];
  isEncrypted: boolean;
  createdAt: string;
}
```

## Restoration & Verification Workflow
1. **Verification (`verifyBackup`)**:
   - Compares raw archive payload SHA-256 against manifest `sha256`.
   - Checks every internal component entry against its expected SHA-256 hash.
2. **Dry Run (`restoreBackup({ dryRun: true })`)**:
   - Performs full uncompress, decryption, and integrity audit without writing files to production directories.
3. **Execution (`restoreBackup({ dryRun: false })`)**:
   - Replays migrations, imports memory records, and restores files.
