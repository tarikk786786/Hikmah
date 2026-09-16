-- ============================================================================
-- HIKMAH BROWSER INTELLIGENCE ENGINE SCHEMA (PRD 12)
-- Deterministic Playwright driver, Stagehand semantic layer, BrowserUseAgent,
-- session & profile isolation, self-healing selectors, and artifact storage.
-- ============================================================================

-- 1. Browser Profiles (Named profiles with cookie jars, storage states, and proxy)
CREATE TABLE IF NOT EXISTS browser_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  user_agent TEXT,
  viewport JSONB NOT NULL DEFAULT '{"width": 1280, "height": 800}'::jsonb,
  proxy JSONB,
  cookies JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_profiles_user ON browser_profiles (user_id);

-- 2. Browser Sessions (Active & historical browser contexts)
CREATE TABLE IF NOT EXISTS browser_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES browser_profiles(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  browser_type TEXT NOT NULL DEFAULT 'chromium' CHECK (browser_type IN ('chromium', 'firefox', 'webkit')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'navigating', 'closed', 'error')),
  current_url TEXT NOT NULL DEFAULT 'about:blank',
  title TEXT NOT NULL DEFAULT 'Blank Page',
  proxy TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_user ON browser_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_status ON browser_sessions (status);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_profile ON browser_sessions (profile_id);

-- 3. Browser Tasks (Autonomous BrowserUseAgent Goals)
CREATE TABLE IF NOT EXISTS browser_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES browser_sessions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  goal TEXT NOT NULL,
  start_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  max_steps INTEGER NOT NULL DEFAULT 10,
  steps_completed INTEGER NOT NULL DEFAULT 0,
  final_answer JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_browser_tasks_user ON browser_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_browser_tasks_status ON browser_tasks (status);

-- 4. Browser Actions (Audit Log of Interactions & Self-Healing Events)
CREATE TABLE IF NOT EXISTS browser_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES browser_sessions(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES browser_tasks(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  selector TEXT,
  healed_selector TEXT,
  params JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_actions_session ON browser_actions (session_id);
CREATE INDEX IF NOT EXISTS idx_browser_actions_type ON browser_actions (action_type);

-- 5. Browser Network Logs (Captured HTTP traffic, requests & responses)
CREATE TABLE IF NOT EXISTS browser_network_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES browser_sessions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER,
  resource_type TEXT NOT NULL DEFAULT 'document',
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  headers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_network_logs_session ON browser_network_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_browser_network_logs_url ON browser_network_logs (url);

-- 6. Browser Artifacts (Screenshots, Videos, HAR traces linked to storage)
CREATE TABLE IF NOT EXISTS browser_artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES browser_sessions(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES browser_tasks(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('SCREENSHOT', 'VIDEO', 'HAR', 'DOM_SNAPSHOT', 'A11Y_TREE')),
  storage_object_id TEXT REFERENCES storage_objects(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_artifacts_session ON browser_artifacts (session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE browser_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_network_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY browser_profiles_user_policy ON browser_profiles
  FOR ALL USING (auth.uid()::text = user_id OR user_id = 'usr_default');

CREATE POLICY browser_sessions_user_policy ON browser_sessions
  FOR ALL USING (auth.uid()::text = user_id OR user_id = 'usr_default');

CREATE POLICY browser_tasks_user_policy ON browser_tasks
  FOR ALL USING (auth.uid()::text = user_id OR user_id = 'usr_default');

CREATE POLICY browser_actions_user_policy ON browser_actions
  FOR ALL USING (true);

CREATE POLICY browser_network_logs_user_policy ON browser_network_logs
  FOR ALL USING (true);

CREATE POLICY browser_artifacts_user_policy ON browser_artifacts
  FOR ALL USING (true);
