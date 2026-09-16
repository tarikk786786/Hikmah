export type StorageTier = 'HOT' | 'NORMAL' | 'COLD' | 'ARCHIVE';

export type StorageClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';

export type StorageProviderType = 'local' | 'supabase' | 'telegram' | 's3' | 'memory';

export type StorageStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED' | 'PENDING_UPLOAD' | 'CORRUPTED';

export interface StorageFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  userId?: string;
  projectId?: string;
  createdAt: string;
}

export interface StorageChunk {
  id: string;
  objectId: string;
  chunkIndex: number;
  sizeBytes: number;
  sha256: string;
  providerRef: string;
  providerId: StorageProviderType | string;
  createdAt: string;
}

export interface StorageObject {
  id: string;
  key: string;
  name: string;
  folderId?: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  tier: StorageTier;
  classification: StorageClassification;
  isEncrypted: boolean;
  encryptionAlgo?: string;
  isChunked: boolean;
  chunkCount: number;
  primaryProvider: StorageProviderType | string;
  status: StorageStatus;
  userId: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface StorageShare {
  id: string;
  objectId: string;
  shareToken: string;
  accessLevel: 'READ' | 'DOWNLOAD';
  passwordHash?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

export type BackupType = 'DATABASE' | 'GIT_REPO' | 'MEMORY' | 'STORAGE' | 'FULL';

export interface BackupManifest {
  id: string;
  name: string;
  backupType: BackupType;
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

export interface PutObjectOptions {
  key: string;
  data: Buffer | Uint8Array | string;
  mimeType?: string;
  tier?: StorageTier;
  classification?: StorageClassification;
  encrypt?: boolean;
  folderId?: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  providerPreference?: StorageProviderType | string;
}

export interface ListObjectsFilter {
  folderId?: string;
  tier?: StorageTier;
  mimeType?: string;
  userId?: string;
  projectId?: string;
  status?: StorageStatus;
  includeDeleted?: boolean;
  prefix?: string;
}

export interface ShareOptions {
  accessLevel?: 'READ' | 'DOWNLOAD';
  expiresInSeconds?: number;
  password?: string;
  userId?: string;
}

export interface StorageIntegrityResult {
  valid: boolean;
  actualSha256: string;
  expectedSha256: string;
  chunkIntegrity: boolean;
  verifiedAt: string;
  details?: string;
}

export interface StorageEngine {
  put(options: PutObjectOptions): Promise<StorageObject>;
  get(keyOrId: string): Promise<Buffer>;
  delete(keyOrId: string, options?: { purge?: boolean }): Promise<boolean>;
  list(filter?: ListObjectsFilter): Promise<StorageObject[]>;
  exists(keyOrId: string): Promise<boolean>;
  copy(srcKeyOrId: string, destKey: string): Promise<StorageObject>;
  move(srcKeyOrId: string, destKey: string): Promise<StorageObject>;
  rename(keyOrId: string, newName: string): Promise<StorageObject>;
  search(query: string, filter?: ListObjectsFilter): Promise<StorageObject[]>;
  share(keyOrId: string, options?: ShareOptions): Promise<StorageShare>;
  revokeShare(shareTokenOrId: string): Promise<boolean>;
  metadata(keyOrId: string): Promise<StorageObject>;
  verify(keyOrId: string): Promise<StorageIntegrityResult>;
}
