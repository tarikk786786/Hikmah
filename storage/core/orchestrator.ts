import * as path from 'path';
import {
  StorageEngine,
  StorageObject,
  StorageChunk,
  StorageShare,
  PutObjectOptions,
  ListObjectsFilter,
  ShareOptions,
  StorageIntegrityResult
} from './types.js';
import { StorageCrypto } from './encryption/crypto.js';
import { KeyManager } from './encryption/key-manager.js';
import { StorageChunker, ChunkPayload } from './chunking/chunker.js';
import { StorageRouter } from './router.js';

export class StorageOrchestrator implements StorageEngine {
  private static instance: StorageOrchestrator;
  private router: StorageRouter;
  private keyManager: KeyManager;

  // Metadata stores (can be backed by Supabase DB or in-memory)
  private objects: Map<string, StorageObject> = new Map();
  private chunks: Map<string, StorageChunk[]> = new Map();
  private shares: Map<string, StorageShare> = new Map();

  // HOT tier in-memory cache
  private hotCache: Map<string, { buffer: Buffer; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(router?: StorageRouter, keyManager?: KeyManager) {
    this.router = router || StorageRouter.getInstance();
    this.keyManager = keyManager || KeyManager.getInstance();
  }

  public static getInstance(router?: StorageRouter, keyManager?: KeyManager): StorageOrchestrator {
    if (!StorageOrchestrator.instance) {
      StorageOrchestrator.instance = new StorageOrchestrator(router, keyManager);
    }
    return StorageOrchestrator.instance;
  }

  private findObject(keyOrId: string): StorageObject | undefined {
    // 1. Match by ID
    const byId = this.objects.get(keyOrId);
    if (byId) return byId;

    // 2. Match by Key
    for (const obj of this.objects.values()) {
      if (obj.key === keyOrId && obj.status !== 'DELETED') {
        return obj;
      }
    }
    return undefined;
  }

  public async putObject(options: PutObjectOptions): Promise<StorageObject> {
    return this.put(options);
  }

  public async put(options: PutObjectOptions): Promise<StorageObject> {
    const rawBuffer = Buffer.isBuffer(options.data) ? options.data : Buffer.from(options.data);
    const plainSha256 = StorageCrypto.sha256(rawBuffer);
    const id = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const name = path.basename(options.key);
    const classification = options.classification || 'INTERNAL';
    const shouldEncrypt = Boolean(
      options.encrypt || classification === 'CONFIDENTIAL' || classification === 'SECRET'
    );

    // 1. Deduplication Check: Check if identical payload already exists in active store
    let existingObj: StorageObject | undefined;
    for (const obj of this.objects.values()) {
      if (obj.sha256 === plainSha256 && obj.status === 'ACTIVE' && obj.isEncrypted === shouldEncrypt) {
        existingObj = obj;
        break;
      }
    }

    if (existingObj) {
      // Deduplicated: create new object metadata pointing to existing provider reference
      const deduplicatedObj: StorageObject = {
        id,
        key: options.key,
        name,
        folderId: options.folderId,
        sizeBytes: rawBuffer.length,
        mimeType: options.mimeType || 'application/octet-stream',
        sha256: plainSha256,
        tier: existingObj.tier,
        classification,
        isEncrypted: existingObj.isEncrypted,
        encryptionAlgo: existingObj.encryptionAlgo,
        isChunked: existingObj.isChunked,
        chunkCount: existingObj.chunkCount,
        primaryProvider: existingObj.primaryProvider,
        status: 'ACTIVE',
        userId: options.userId || 'usr_default',
        projectId: options.projectId,
        metadata: {
          ...options.metadata,
          deduplicatedFrom: existingObj.id,
          deduplicatedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.objects.set(id, deduplicatedObj);
      if (existingObj.isChunked) {
        this.chunks.set(id, this.chunks.get(existingObj.id) || []);
      }
      this.hotCache.set(id, { buffer: rawBuffer, cachedAt: Date.now() });
      return deduplicatedObj;
    }

    // 2. Resolve Provider & Tier
    const { provider, tier } = this.router.resolveProvider({
      tier: options.tier,
      sizeBytes: rawBuffer.length,
      preference: options.providerPreference
    });

    // 3. Encrypt if requested or sensitive
    let dataToStore: Buffer = rawBuffer;
    let encryptionAlgo: string | undefined;

    if (shouldEncrypt) {
      const dek = this.keyManager.generateDataKey(id);
      const encrypted = StorageCrypto.encrypt(rawBuffer, dek);
      encryptionAlgo = encrypted.algorithm;
      // Serialize encrypted container as JSON buffer
      dataToStore = Buffer.from(JSON.stringify(encrypted), 'utf-8');
    }

    // 4. Chunking Evaluation (e.g. > 10MB or Telegram cold store > 15MB)
    const isChunked = StorageChunker.shouldChunk(dataToStore.length, {
      chunkThreshold: provider.id === 'telegram' ? 15 * 1024 * 1024 : StorageChunker.DEFAULT_CHUNK_THRESHOLD
    });

    let chunkCount = 1;

    if (isChunked) {
      const chunkPayloads = StorageChunker.split(dataToStore, {
        chunkSize: provider.id === 'telegram' ? 15 * 1024 * 1024 : StorageChunker.DEFAULT_CHUNK_SIZE
      });
      chunkCount = chunkPayloads.length;

      const chunkRecords: StorageChunk[] = [];
      for (const cp of chunkPayloads) {
        const chunkKey = `${options.key}.part${cp.index}`;
        const putResult = await provider.putObject(chunkKey, cp.data, {
          mimeType: options.mimeType,
          metadata: { objectId: id, chunkIndex: cp.index }
        });

        chunkRecords.push({
          id: `chk_${id}_${cp.index}`,
          objectId: id,
          chunkIndex: cp.index,
          sizeBytes: cp.sizeBytes,
          sha256: cp.sha256,
          providerRef: putResult.providerRef,
          providerId: provider.id,
          createdAt: new Date().toISOString()
        });
      }

      this.chunks.set(id, chunkRecords);
    } else {
      await provider.putObject(options.key, dataToStore, {
        mimeType: options.mimeType,
        metadata: { objectId: id, ...options.metadata }
      });
    }

    // 5. Build Canonical Metadata Record
    const storageObj: StorageObject = {
      id,
      key: options.key,
      name,
      folderId: options.folderId,
      sizeBytes: rawBuffer.length,
      mimeType: options.mimeType || 'application/octet-stream',
      sha256: plainSha256,
      tier,
      classification,
      isEncrypted: shouldEncrypt,
      encryptionAlgo,
      isChunked,
      chunkCount,
      primaryProvider: provider.id,
      status: 'ACTIVE',
      userId: options.userId || 'usr_default',
      projectId: options.projectId,
      metadata: options.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.objects.set(id, storageObj);

    // 6. Cache in HOT tier
    this.hotCache.set(id, { buffer: rawBuffer, cachedAt: Date.now() });

    return storageObj;
  }

  public async get(keyOrId: string): Promise<Buffer> {
    const obj = this.findObject(keyOrId);
    if (!obj || obj.status === 'DELETED') {
      throw new Error(`Storage object not found: ${keyOrId}`);
    }

    // Check HOT cache
    const cached = this.hotCache.get(obj.id);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.buffer;
    }

    const provider = this.router.getProvider(String(obj.primaryProvider));
    if (!provider) {
      throw new Error(`Storage provider [${obj.primaryProvider}] not available for object [${obj.id}]`);
    }

    let storedBytes: Buffer;

    if (obj.isChunked) {
      const chunkRecords = this.chunks.get(obj.id);
      if (!chunkRecords || chunkRecords.length === 0) {
        throw new Error(`Chunk records missing for chunked object [${obj.id}]`);
      }

      const retrievedChunks: ChunkPayload[] = [];
      for (const rec of chunkRecords) {
        const chunkData = await provider.getObject(rec.providerRef);
        retrievedChunks.push({
          index: rec.chunkIndex,
          data: chunkData,
          sizeBytes: chunkData.length,
          sha256: rec.sha256
        });
      }

      storedBytes = StorageChunker.reassemble(retrievedChunks);
    } else {
      storedBytes = await provider.getObject(obj.key);
    }

    // Decrypt if encrypted
    let finalBuffer: Buffer;
    if (obj.isEncrypted) {
      const dek = this.keyManager.getDataKey(obj.id);
      const encryptedPayload = JSON.parse(storedBytes.toString('utf-8'));
      encryptedPayload.ciphertext = Buffer.from(encryptedPayload.ciphertext);
      finalBuffer = StorageCrypto.decrypt(encryptedPayload, dek);
    } else {
      finalBuffer = storedBytes;
    }

    // Integrity Check
    const actualSha256 = StorageCrypto.sha256(finalBuffer);
    if (actualSha256 !== obj.sha256) {
      throw new Error(`Integrity verification failed for [${obj.key}]: hash mismatch`);
    }

    // Update HOT cache
    this.hotCache.set(obj.id, { buffer: finalBuffer, cachedAt: Date.now() });

    return finalBuffer;
  }

  public async delete(keyOrId: string, options?: { purge?: boolean }): Promise<boolean> {
    const obj = this.findObject(keyOrId);
    if (!obj) return false;

    this.hotCache.delete(obj.id);

    if (options?.purge) {
      const provider = this.router.getProvider(String(obj.primaryProvider));
      if (provider) {
        if (obj.isChunked) {
          const chunkRecords = this.chunks.get(obj.id) || [];
          for (const chk of chunkRecords) {
            await provider.deleteObject(chk.providerRef);
          }
        } else {
          await provider.deleteObject(obj.key);
        }
      }
      this.keyManager.deleteKey(obj.id);
      this.chunks.delete(obj.id);
      return this.objects.delete(obj.id);
    } else {
      // Soft delete
      obj.status = 'DELETED';
      obj.deletedAt = new Date().toISOString();
      obj.updatedAt = new Date().toISOString();
      return true;
    }
  }

  public async list(filter?: ListObjectsFilter): Promise<StorageObject[]> {
    let result = Array.from(this.objects.values());

    if (!filter?.includeDeleted) {
      result = result.filter(o => o.status !== 'DELETED');
    }

    if (filter?.folderId) {
      result = result.filter(o => o.folderId === filter.folderId);
    }

    if (filter?.tier) {
      result = result.filter(o => o.tier === filter.tier);
    }

    if (filter?.mimeType) {
      result = result.filter(o => o.mimeType.includes(filter.mimeType!));
    }

    if (filter?.userId) {
      result = result.filter(o => o.userId === filter.userId);
    }

    if (filter?.projectId) {
      result = result.filter(o => o.projectId === filter.projectId);
    }

    if (filter?.status) {
      result = result.filter(o => o.status === filter.status);
    }

    if (filter?.prefix) {
      result = result.filter(o => o.key.startsWith(filter.prefix!));
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async exists(keyOrId: string): Promise<boolean> {
    const obj = this.findObject(keyOrId);
    return Boolean(obj && obj.status !== 'DELETED');
  }

  public async copy(srcKeyOrId: string, destKey: string): Promise<StorageObject> {
    const src = this.findObject(srcKeyOrId);
    if (!src || src.status === 'DELETED') {
      throw new Error(`Source object [${srcKeyOrId}] not found`);
    }

    const data = await this.get(src.id);
    return this.put({
      key: destKey,
      data,
      mimeType: src.mimeType,
      tier: src.tier,
      classification: src.classification,
      encrypt: src.isEncrypted,
      userId: src.userId,
      projectId: src.projectId,
      metadata: { ...src.metadata, copiedFrom: src.id }
    });
  }

  public async move(srcKeyOrId: string, destKey: string): Promise<StorageObject> {
    const copied = await this.copy(srcKeyOrId, destKey);
    await this.delete(srcKeyOrId, { purge: false });
    return copied;
  }

  public async rename(keyOrId: string, newName: string): Promise<StorageObject> {
    const obj = this.findObject(keyOrId);
    if (!obj || obj.status === 'DELETED') {
      throw new Error(`Object [${keyOrId}] not found`);
    }

    obj.name = newName;
    const dir = path.dirname(obj.key);
    obj.key = dir === '.' ? newName : `${dir}/${newName}`;
    obj.updatedAt = new Date().toISOString();
    return obj;
  }

  public async search(query: string, filter?: ListObjectsFilter): Promise<StorageObject[]> {
    const baseList = await this.list(filter);
    const q = query.toLowerCase();

    return baseList.filter(o => {
      const matchName = o.name.toLowerCase().includes(q);
      const matchKey = o.key.toLowerCase().includes(q);
      const matchMime = o.mimeType.toLowerCase().includes(q);
      const matchMeta = o.metadata ? JSON.stringify(o.metadata).toLowerCase().includes(q) : false;
      return matchName || matchKey || matchMime || matchMeta;
    });
  }

  public async share(keyOrId: string, options?: ShareOptions): Promise<StorageShare> {
    const obj = this.findObject(keyOrId);
    if (!obj || obj.status === 'DELETED') {
      throw new Error(`Cannot share non-existent object [${keyOrId}]`);
    }

    const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const shareToken = `stk_${StorageCrypto.sha256(shareId + obj.id).substring(0, 32)}`;

    let expiresAt: string | undefined;
    if (options?.expiresInSeconds) {
      expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000).toISOString();
    }

    const share: StorageShare = {
      id: shareId,
      objectId: obj.id,
      shareToken,
      accessLevel: options?.accessLevel || 'READ',
      passwordHash: options?.password ? StorageCrypto.sha256(options.password) : undefined,
      expiresAt,
      createdBy: options?.userId || 'usr_default',
      createdAt: new Date().toISOString()
    };

    this.shares.set(shareToken, share);
    return share;
  }

  public async revokeShare(shareTokenOrId: string): Promise<boolean> {
    // Check by token
    if (this.shares.has(shareTokenOrId)) {
      return this.shares.delete(shareTokenOrId);
    }

    // Check by ID
    for (const [token, share] of this.shares.entries()) {
      if (share.id === shareTokenOrId) {
        return this.shares.delete(token);
      }
    }
    return false;
  }

  public async metadata(keyOrId: string): Promise<StorageObject> {
    const obj = this.findObject(keyOrId);
    if (!obj) {
      throw new Error(`Object [${keyOrId}] not found`);
    }
    return obj;
  }

  public async verify(keyOrId: string): Promise<StorageIntegrityResult> {
    const obj = this.findObject(keyOrId);
    if (!obj) {
      return {
        valid: false,
        actualSha256: '',
        expectedSha256: '',
        chunkIntegrity: false,
        verifiedAt: new Date().toISOString(),
        details: 'Object does not exist'
      };
    }

    try {
      const data = await this.get(obj.id);
      const actualSha256 = StorageCrypto.sha256(data);
      const valid = actualSha256 === obj.sha256;

      let chunkIntegrity = true;
      if (obj.isChunked) {
        const chks = this.chunks.get(obj.id) || [];
        chunkIntegrity = chks.length === obj.chunkCount;
      }

      return {
        valid,
        actualSha256,
        expectedSha256: obj.sha256,
        chunkIntegrity,
        verifiedAt: new Date().toISOString(),
        details: valid ? 'Checksum matches canonical metadata' : 'Checksum mismatch'
      };
    } catch (err) {
      return {
        valid: false,
        actualSha256: '',
        expectedSha256: obj.sha256,
        chunkIntegrity: false,
        verifiedAt: new Date().toISOString(),
        details: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
