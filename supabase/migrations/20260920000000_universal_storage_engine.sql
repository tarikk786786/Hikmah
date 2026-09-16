-- ============================================================================
-- HIKMAH UNIVERSAL STORAGE ENGINE SCHEMA (PRD 10)
-- Multi-tier storage orchestration, TG-S3/MTProto cold storage, deduplication,
-- chunking, envelope encryption, and backup manifests.
-- ============================================================================

-- 1. Storage Folders
CREATE TABLE IF NOT EXISTS storage_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  project_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Storage Objects (Canonical Metadata Registry)
CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  folder_id UUID REFERENCES storage_folders(id) ON DELETE SET NULL,
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sha256 TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('HOT', 'NORMAL', 'COLD', 'ARCHIVE')),
  classification TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET')),
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  encryption_algo TEXT,
  is_chunked BOOLEAN NOT NULL DEFAULT FALSE,
  chunk_count INTEGER NOT NULL DEFAULT 1,
  primary_provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED', 'PENDING_UPLOAD', 'CORRUPTED')),
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  project_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for lightning fast lookups & deduplication checks
CREATE INDEX IF NOT EXISTS idx_storage_objects_sha256 ON storage_objects (sha256);
CREATE INDEX IF NOT EXISTS idx_storage_objects_key ON storage_objects (key);
CREATE INDEX IF NOT EXISTS idx_storage_objects_tier ON storage_objects (tier);
CREATE INDEX IF NOT EXISTS idx_storage_objects_user ON storage_objects (user_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_status ON storage_objects (status);

-- 3. Storage Chunks (Large Object Chunk Parts)
CREATE TABLE IF NOT EXISTS storage_chunks (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES storage_objects(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (object_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_storage_chunks_object ON storage_chunks (object_id);

-- 4. Storage Shares (Expiring Public / Authenticated Share Links)
CREATE TABLE IF NOT EXISTS storage_shares (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES storage_objects(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL CHECK (access_level IN ('READ', 'DOWNLOAD')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'usr_default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_shares_token ON storage_shares (share_token);

-- 5. Storage Backups (Automated Snapshot & Recovery Manifests)
CREATE TABLE IF NOT EXISTS storage_backups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('DATABASE', 'GIT_REPO', 'MEMORY', 'STORAGE', 'FULL')),
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Storage Provider Health & Telemetry
CREATE TABLE IF NOT EXISTS storage_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  healthy BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  configured BOOLEAN NOT NULL,
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_provider_health_checked ON storage_provider_health (provider_id, checked_at DESC);
