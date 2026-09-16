import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { StorageCrypto } from '../storage/core/encryption/crypto.js';
import { KeyManager } from '../storage/core/encryption/key-manager.js';
import { StorageOrchestrator } from '../storage/core/orchestrator.js';

describe('PRD 10: Deduplication & AES-256-GCM Envelope Encryption', () => {
  it('StorageCrypto should encrypt, authenticate, and decrypt with AES-256-GCM', () => {
    const key = crypto.randomBytes(32);
    const plaintext = 'Top Secret Hikmah Core Strategic Plan';

    const encrypted = StorageCrypto.encrypt(plaintext, key);
    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(encrypted.iv).toHaveLength(24); // 12 bytes hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes hex
    expect(encrypted.ciphertext.toString('utf-8')).not.toBe(plaintext);

    const decrypted = StorageCrypto.decrypt(encrypted, key);
    expect(decrypted.toString('utf-8')).toBe(plaintext);

    // Tampering test
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from('tampered_ciphertext')
    };
    expect(() => StorageCrypto.decrypt(tampered, key)).toThrow();
  });

  it('KeyManager should manage envelope encryption and per-object DEKs', () => {
    const keyManager = new KeyManager('custom_master_key_for_testing_123');
    const objectId = 'obj_secret_test_99';

    const rawDek = keyManager.generateDataKey(objectId);
    expect(rawDek).toHaveLength(32);
    expect(keyManager.hasKey(objectId)).toBe(true);

    const retrievedDek = keyManager.getDataKey(objectId);
    expect(retrievedDek.equals(rawDek)).toBe(true);

    keyManager.deleteKey(objectId);
    expect(keyManager.hasKey(objectId)).toBe(false);
    expect(() => keyManager.getDataKey(objectId)).toThrow();
  });

  it('StorageOrchestrator should deduplicate identical objects via SHA-256', async () => {
    const orchestrator = new StorageOrchestrator();
    const identicalData = 'Identical shared codebase archive';

    const first = await orchestrator.put({
      key: 'projects/repo1/file.txt',
      data: identicalData
    });

    const second = await orchestrator.put({
      key: 'projects/repo2/file.txt',
      data: identicalData
    });

    expect(first.id).not.toBe(second.id);
    expect(first.sha256).toBe(second.sha256);
    expect(second.metadata?.deduplicatedFrom).toBe(first.id);

    // Both should retrieve identical payload
    const data1 = await orchestrator.get(first.id);
    const data2 = await orchestrator.get(second.id);
    expect(data1.toString('utf-8')).toBe(identicalData);
    expect(data2.toString('utf-8')).toBe(identicalData);
  });

  it('StorageOrchestrator should transparently encrypt and decrypt confidential objects', async () => {
    const orchestrator = new StorageOrchestrator();
    const secretContent = 'Personal Private Vault Content with High Sensitivity';
    const key = 'vault/private_keys.pem';

    const stored = await orchestrator.put({
      key,
      data: secretContent,
      classification: 'CONFIDENTIAL',
      encrypt: true
    });

    expect(stored.isEncrypted).toBe(true);
    expect(stored.encryptionAlgo).toBe('aes-256-gcm');

    const retrieved = await orchestrator.get(stored.id);
    expect(retrieved.toString('utf-8')).toBe(secretContent);
  });
});
