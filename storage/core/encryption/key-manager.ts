import * as crypto from 'crypto';
import { StorageCrypto, EncryptedPayload } from './crypto.js';

export interface WrappedKeyRecord {
  objectId: string;
  wrappedKey: EncryptedPayload;
  createdAt: string;
}

export class KeyManager {
  private static instance: KeyManager;
  private masterKey: Buffer;
  private wrappedKeys: Map<string, WrappedKeyRecord> = new Map();

  constructor(masterSecret?: string) {
    const secret = masterSecret || process.env.STORAGE_MASTER_KEY || 'hikmah_default_secure_storage_master_seed_2026';
    // Derive a 32-byte master key using HKDF or SHA-256
    this.masterKey = crypto.createHash('sha256').update(secret).digest();
  }

  public static getInstance(masterSecret?: string): KeyManager {
    if (!KeyManager.instance) {
      KeyManager.instance = new KeyManager(masterSecret);
    }
    return KeyManager.instance;
  }

  /**
   * Generates a unique 32-byte DEK (Data Encryption Key) for an object,
   * encrypts it using the master key (Envelope Encryption), and stores the wrapped key.
   */
  public generateDataKey(objectId: string): Buffer {
    const rawDek = crypto.randomBytes(32);
    const wrapped = StorageCrypto.encrypt(rawDek, this.masterKey);

    this.wrappedKeys.set(objectId, {
      objectId,
      wrappedKey: wrapped,
      createdAt: new Date().toISOString()
    });

    return rawDek;
  }

  /**
   * Unwraps and returns the raw DEK for the specified object ID.
   */
  public getDataKey(objectId: string): Buffer {
    const record = this.wrappedKeys.get(objectId);
    if (!record) {
      throw new Error(`No encryption key found for object [${objectId}]`);
    }

    return StorageCrypto.decrypt(record.wrappedKey, this.masterKey);
  }

  /**
   * Checks if an object has a managed key.
   */
  public hasKey(objectId: string): boolean {
    return this.wrappedKeys.has(objectId);
  }

  /**
   * Removes a key when an object is permanently purged.
   */
  public deleteKey(objectId: string): boolean {
    return this.wrappedKeys.delete(objectId);
  }
}
