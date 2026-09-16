import * as crypto from 'crypto';

export interface EncryptedPayload {
  ciphertext: Buffer;
  iv: string; // hex
  authTag: string; // hex
  algorithm: string;
}

export class StorageCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 12 bytes recommended for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // 16 bytes

  /**
   * Encrypts a plaintext buffer with AES-256-GCM using the provided 32-byte key.
   */
  public static encrypt(data: Buffer | Uint8Array | string, key: Buffer): EncryptedPayload {
    if (key.length !== 32) {
      throw new Error(`AES-256-GCM requires a 32-byte key, received ${key.length} bytes`);
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const iv = crypto.randomBytes(StorageCrypto.IV_LENGTH);

    const cipher = crypto.createCipheriv(StorageCrypto.ALGORITHM, key, iv, {
      authTagLength: StorageCrypto.AUTH_TAG_LENGTH
    });

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: StorageCrypto.ALGORITHM
    };
  }

  /**
   * Decrypts an AES-256-GCM ciphertext payload with authentication tag validation.
   */
  public static decrypt(payload: EncryptedPayload, key: Buffer): Buffer {
    if (key.length !== 32) {
      throw new Error(`AES-256-GCM requires a 32-byte key, received ${key.length} bytes`);
    }

    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');

    const decipher = crypto.createDecipheriv(StorageCrypto.ALGORITHM, key, iv, {
      authTagLength: StorageCrypto.AUTH_TAG_LENGTH
    });

    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
  }

  /**
   * Computes SHA-256 hex digest for arbitrary input.
   */
  public static sha256(data: Buffer | Uint8Array | string): string {
    const hash = crypto.createHash('sha256');
    if (Buffer.isBuffer(data)) {
      hash.update(data);
    } else {
      hash.update(Buffer.from(data));
    }
    return hash.digest('hex');
  }
}
