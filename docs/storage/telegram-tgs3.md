# Telegram TG-S3 & MTProto Cold Storage Specification

## Overview
Hikmah uses Telegram as a **provider-backed scalable cold storage and archive medium**.

> [!IMPORTANT]
> **Strict Security Isolation**:
> - Telegram credentials (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_STORAGE_CHAT_ID`) are completely isolated within `TelegramStorageProvider`.
> - The AI models, user chat interface, and MCP tools never receive or output Telegram channel IDs or Bot tokens.
> - Private and confidential files are **always encrypted with AES-256-GCM** before chunking and uploading to Telegram. Telegram servers only store opaque binary ciphertexts.

## Protocol Abstraction
1. **TG-S3 Interface**:
   - Telegram Bot API `sendDocument` and `getFile` are abstracted as standard S3 PutObject and GetObject operations.
   - Files are addressed via Hikmah canonical keys (e.g. `archives/backup.tar.gz`), mapped internally to Telegram `file_id` strings.
2. **Chunking for Telegram Limits**:
   - Telegram Bot API imposes a 20MB file upload limit.
   - Any object exceeding 15MB is split into sequential chunks (`.part0`, `.part1`, ...).
   - Each chunk receives its own Telegram `file_id` and SHA-256 integrity record in `storage_chunks`.
3. **Simulated Sandbox Mode**:
   - In development, testing, or offline environments without Telegram credentials, `TelegramStorageProvider` seamlessly operates in simulated mode.
   - Generates deterministic simulated `tg_doc_...` identifiers and preserves full cold storage semantics without external network calls.
