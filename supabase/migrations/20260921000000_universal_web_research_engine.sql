-- ============================================================================
-- HIKMAH UNIVERSAL WEB RESEARCH & DEEP RESEARCH ENGINE SCHEMA (PRD 11)
-- Multi-engine search, crawling, Trafilatura extraction, claim verification,
-- anti-hallucination citations, entities, timelines, and change monitoring.
-- ============================================================================

-- 1. Researches (Master Task Records)
CREATE TABLE IF NOT EXISTS researches (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('QUICK', 'STANDARD', 'DEEP', 'INVESTIGATION', 'MONITOR')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SEARCHING', 'FETCHING', 'EXTRACTING', 'VERIFYING', 'SYNTHESIZING', 'COMPLETED', 'FAILED')),
  budget JSONB NOT NULL DEFAULT '{"maxQueries": 5, "maxPages": 15, "maxBytes": 20971520, "maxRuntimeMs": 45000, "maxAiCalls": 5}'::jsonb,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  project_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_researches_user ON researches (user_id);
CREATE INDEX IF NOT EXISTS idx_researches_status ON researches (status);
CREATE INDEX IF NOT EXISTS idx_researches_mode ON researches (mode);

-- 2. Research Sources
CREATE TABLE IF NOT EXISTS research_sources (
  id TEXT PRIMARY KEY,
  research_id TEXT REFERENCES researches(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT,
  author TEXT,
  source_type TEXT DEFAULT 'GENERAL',
  authority INTEGER NOT NULL DEFAULT 5,
  classification TEXT NOT NULL DEFAULT 'UNVERIFIED',
  published_at TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  language TEXT DEFAULT 'en',
  content_hash TEXT NOT NULL,
  snippet TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_research_sources_research_id ON research_sources (research_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_url_hash ON research_sources (url_hash);

-- 3. Research Claims (Verified / Corroborated / Disputed Assertions)
CREATE TABLE IF NOT EXISTS research_claims (
  id TEXT PRIMARY KEY,
  research_id TEXT REFERENCES researches(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  normalized_claim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNCHECKED' CHECK (status IN ('UNCHECKED', 'SUPPORTED', 'CORROBORATED', 'CONTRADICTED', 'UNVERIFIED', 'OUTDATED')),
  confidence REAL NOT NULL DEFAULT 0.5,
  supporting_evidence_ids JSONB DEFAULT '[]'::jsonb,
  contradicting_evidence_ids JSONB DEFAULT '[]'::jsonb,
  source_ids JSONB DEFAULT '[]'::jsonb,
  limitations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_claims_research_id ON research_claims (research_id);
CREATE INDEX IF NOT EXISTS idx_research_claims_status ON research_claims (status);

-- 4. Research Evidence (Grounding Text Snippets)
CREATE TABLE IF NOT EXISTS research_evidence (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES research_claims(id) ON DELETE SET NULL,
  source_id TEXT REFERENCES research_sources(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  text TEXT NOT NULL,
  location TEXT,
  content_hash TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.9,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_evidence_source_id ON research_evidence (source_id);
CREATE INDEX IF NOT EXISTS idx_research_evidence_claim_id ON research_evidence (claim_id);

-- 5. Research Timelines (Chronological Event Lineage)
CREATE TABLE IF NOT EXISTS research_timelines (
  id TEXT PRIMARY KEY,
  research_id TEXT REFERENCES researches(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_ids JSONB DEFAULT '[]'::jsonb,
  confidence REAL NOT NULL DEFAULT 0.8
);

CREATE INDEX IF NOT EXISTS idx_research_timelines_research_id ON research_timelines (research_id);

-- 6. Research Entities (Extracted Named Entities & Graph Nodes)
CREATE TABLE IF NOT EXISTS research_entities (
  id TEXT PRIMARY KEY,
  research_id TEXT REFERENCES researches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  source_ids JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_research_entities_research_id ON research_entities (research_id);
CREATE INDEX IF NOT EXISTS idx_research_entities_name ON research_entities (name);

-- 7. Research Reports (Synthesized Knowledge Deliverables)
CREATE TABLE IF NOT EXISTS research_reports (
  id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL REFERENCES researches(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  mode TEXT NOT NULL,
  summary TEXT NOT NULL,
  methodology TEXT NOT NULL,
  conflicts JSONB DEFAULT '[]'::jsonb,
  limitations JSONB DEFAULT '[]'::jsonb,
  citations JSONB DEFAULT '[]'::jsonb,
  markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_research_id ON research_reports (research_id);

-- 8. Research Monitors (Scheduled URL & Topic Change Watchers)
CREATE TABLE IF NOT EXISTS research_monitors (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  query TEXT,
  target_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency_minutes INTEGER NOT NULL DEFAULT 60,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_snapshot_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_monitors_user ON research_monitors (user_id);
CREATE INDEX IF NOT EXISTS idx_research_monitors_active ON research_monitors (active);

-- 9. Research Monitor Diffs (Change History)
CREATE TABLE IF NOT EXISTS research_monitor_diffs (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL REFERENCES research_monitors(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_type TEXT NOT NULL CHECK (change_type IN ('NEW', 'CHANGED', 'REMOVED', 'UNCHANGED')),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  previous_hash TEXT,
  new_hash TEXT,
  diff_summary TEXT NOT NULL,
  added_content JSONB DEFAULT '[]'::jsonb,
  removed_content JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_research_monitor_diffs_monitor_id ON research_monitor_diffs (monitor_id);
