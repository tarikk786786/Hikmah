# Envelope Encryption & Large Object Chunking (PRD 10)

## 1. Cryptographic Standard: AES-256-GCM

All confidential and secret storage objects are protected using authenticated symmetric encryption:
- **Cipher**: `aes-256-gcm`
- **IV Length**: 12 bytes (96-bit random nonce per encryption)
- **Tag Length**: 16 bytes (128-bit authentication tag)
- **Envelope Encryption**:
  - `STORAGE_MASTER_KEY` serves as the Key Encryption Key (KEK).
  - Every encrypted object receives a dedicated 32-byte Data Encryption Key (DEK) generated via `crypto.randomBytes(32)`.
  - The DEK is wrapped using the KEK and stored securely in `KeyManager`.
  - Raw DEKs are held in volatile memory only during active read/write operations and are never written to disk or sent to external storage providers.

## 2. Chunking & Streaming Reassembly

For objects exceeding the chunking threshold (default 10MB, or 15MB for Telegram):
1. **Splitting (`StorageChunker.split`)**:
   - Sequential slices of size `chunkSize` (default 5MB).
   - Indexed from `0` to `N - 1`.
   - Each chunk has an independent SHA-256 digest recorded in `storage_chunks`.
2. **Reassembly (`StorageChunker.reassemble`)**:
   - Retries and downloads all parts in parallel or sequential streams.
   - Verifies the chunk index order to detect missing blocks.
   - Validates each chunk's individual SHA-256 checksum.
   - Combines buffers and verifies total reconstructed payload hash against the canonical object's SHA-256.
