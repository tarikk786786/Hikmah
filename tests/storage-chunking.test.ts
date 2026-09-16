import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { StorageChunker } from '../storage/core/chunking/chunker.js';
import { StorageCrypto } from '../storage/core/encryption/crypto.js';
import { StorageOrchestrator } from '../storage/core/orchestrator.js';

describe('PRD 10: Large Object Chunking & Stream Reassembly', () => {
  it('StorageChunker should split and reassemble buffers with integrity verification', () => {
    // Generate 128KB of random binary data
    const rawData = crypto.randomBytes(128 * 1024);
    const expectedSha256 = StorageCrypto.sha256(rawData);

    // Split into 32KB chunks
    const chunks = StorageChunker.split(rawData, { chunkSize: 32 * 1024 });
    expect(chunks).toHaveLength(4);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].index).toBe(i);
      expect(chunks[i].sizeBytes).toBe(32 * 1024);
      expect(chunks[i].sha256).toBe(StorageCrypto.sha256(chunks[i].data));
    }

    const reassembled = StorageChunker.reassemble(chunks, expectedSha256);
    expect(reassembled.equals(rawData)).toBe(true);
  });

  it('StorageChunker should throw error when chunks are corrupt or out of order', () => {
    const rawData = Buffer.from('Testing chunk ordering integrity');
    const chunks = StorageChunker.split(rawData, { chunkSize: 8 });

    // Out-of-order chunks should reassemble properly because reassembler sorts them
    const swappedOrder = [chunks[1], chunks[0], ...chunks.slice(2)];
    const reassembled = StorageChunker.reassemble(swappedOrder);
    expect(reassembled.equals(rawData)).toBe(true);

    // Missing chunk should throw
    const missingChunks = [chunks[0], chunks[2]];
    expect(() => StorageChunker.reassemble(missingChunks)).toThrow(/Missing or out-of-order chunk/);

    // Corrupt data
    const corruptedData = [...chunks];
    corruptedData[0] = { ...corruptedData[0], data: Buffer.from('bad_data') };
    expect(() => StorageChunker.reassemble(corruptedData)).toThrow(/integrity failure/);
  });

  it('StorageOrchestrator should handle chunked objects through lifecycle', async () => {
    const orchestrator = new StorageOrchestrator();
    // 25MB buffer to trigger chunking threshold (default 10MB)
    const largeBuffer = Buffer.alloc(12 * 1024 * 1024, 0x4a); // 12 MB filled with 'J'
    const key = `large_media/sample_${Date.now()}.bin`;

    const stored = await orchestrator.put({
      key,
      data: largeBuffer,
      mimeType: 'application/octet-stream'
    });

    expect(stored.isChunked).toBe(true);
    expect(stored.chunkCount).toBeGreaterThanOrEqual(2);

    const retrieved = await orchestrator.get(stored.id);
    expect(retrieved.length).toBe(largeBuffer.length);
    expect(retrieved.equals(largeBuffer)).toBe(true);

    const verification = await orchestrator.verify(stored.id);
    expect(verification.valid).toBe(true);
    expect(verification.chunkIntegrity).toBe(true);
  });
});
