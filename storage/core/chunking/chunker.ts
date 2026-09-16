import { StorageCrypto } from '../encryption/crypto.js';

export interface ChunkPayload {
  index: number;
  data: Buffer;
  sizeBytes: number;
  sha256: string;
}

export interface ChunkingOptions {
  chunkSize?: number; // Size per chunk in bytes (default 5MB)
  chunkThreshold?: number; // Minimum file size to trigger chunking (default 10MB)
}

export class StorageChunker {
  public static readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
  public static readonly DEFAULT_CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10 MB

  /**
   * Determines if data requires chunking based on threshold.
   */
  public static shouldChunk(sizeBytes: number, options?: ChunkingOptions): boolean {
    const threshold = options?.chunkThreshold ?? StorageChunker.DEFAULT_CHUNK_THRESHOLD;
    return sizeBytes > threshold;
  }

  /**
   * Splits a buffer into sequentially indexed chunks.
   */
  public static split(data: Buffer | Uint8Array | string, options?: ChunkingOptions): ChunkPayload[] {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const chunkSize = options?.chunkSize ?? StorageChunker.DEFAULT_CHUNK_SIZE;

    if (chunkSize <= 0) {
      throw new Error('Chunk size must be greater than zero');
    }

    const chunks: ChunkPayload[] = [];
    let offset = 0;
    let index = 0;

    while (offset < buffer.length) {
      const end = Math.min(offset + chunkSize, buffer.length);
      const chunkData = buffer.subarray(offset, end);
      const sha256 = StorageCrypto.sha256(chunkData);

      chunks.push({
        index,
        data: chunkData,
        sizeBytes: chunkData.length,
        sha256
      });

      offset = end;
      index++;
    }

    return chunks;
  }

  /**
   * Reassembles chunks into a single unified buffer after validating order and chunk integrity.
   */
  public static reassemble(chunks: ChunkPayload[], expectedTotalSha256?: string): Buffer {
    if (!chunks || chunks.length === 0) {
      return Buffer.alloc(0);
    }

    // Sort by chunk index to guarantee sequence
    const sorted = [...chunks].sort((a, b) => a.index - b.index);

    // Verify indexing sequence has no missing chunks
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].index !== i) {
        throw new Error(`Missing or out-of-order chunk at index ${i}`);
      }

      // Verify individual chunk hash
      const actualHash = StorageCrypto.sha256(sorted[i].data);
      if (actualHash !== sorted[i].sha256) {
        throw new Error(`Chunk ${i} integrity failure: hash mismatch`);
      }
    }

    const combined = Buffer.concat(sorted.map(c => c.data));

    if (expectedTotalSha256) {
      const actualTotal = StorageCrypto.sha256(combined);
      if (actualTotal !== expectedTotalSha256) {
        throw new Error(`Reassembled data integrity mismatch: expected ${expectedTotalSha256}, got ${actualTotal}`);
      }
    }

    return combined;
  }
}
