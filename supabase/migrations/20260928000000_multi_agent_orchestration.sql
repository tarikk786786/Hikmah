-- ============================================================================
-- HIKMAH MULTI-AGENT ORCHESTRATION ENGINE SCHEMA (STEP 20 / PRD 20)
-- Canonical Multi-Agent Orchestration layer: DAG workflows, distributed leases,
-- cross-agent handoffs, typed artifact bus, verification, critic, and evaluations.
-- ============================================================================

-- 1. Agent Definitions (Registered specialized agents)
CREATE TABLE IF NOT EXISTS orchestration_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_tier TEXT NOT NULL DEFAULT 'BALANCED',
  system_prompt TEXT,
  max_turns INTEGER NOT NULL DEFAULT 20,
  timeout_ms INTEGER NOT NULL DEFAULT 60000,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestration_agents_role ON orchestration_agents (role);

-- 2. Workflow Definitions (Templates and reusable DAG structures)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  dag_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_priority TEXT NOT NULL DEFAULT 'NORMAL',
  timeout_ms INTEGER NOT NULL DEFAULT 300000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Workflow Runs (Active and historical orchestration execution instances)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_definition_id TEXT REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PLANNING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND')),
  user_id TEXT NOT NULL DEFAULT 'usr_default',
  session_id TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  budget_limit_usd NUMERIC(10, 4) DEFAULT 1.0000,
  cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  token_budget INTEGER DEFAULT 100000,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  current_step INTEGER NOT NULL DEFAULT 0,
  max_steps INTEGER NOT NULL DEFAULT 50,
  final_result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON workflow_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs (status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_priority ON workflow_runs (priority);

-- 4. Workflow Tasks (Individual DAG nodes / sub-tasks)
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_agent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'RUNNING', 'BLOCKED', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'SKIPPED')),
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_run ON workflow_tasks (workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks (status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_agent ON workflow_tasks (assigned_agent);

-- 5. Distributed Agent Resource Leases
CREATE TABLE IF NOT EXISTS agent_leases (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('REPOSITORY', 'FILE_PATH', 'BROWSER_PROFILE', 'DEPLOYMENT_TARGET', 'API_ENDPOINT', 'CUSTOM')),
  holder_agent_id TEXT NOT NULL,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  lease_type TEXT NOT NULL DEFAULT 'EXCLUSIVE' CHECK (lease_type IN ('EXCLUSIVE', 'SHARED')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'EXPIRED')),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_agent_leases_resource ON agent_leases (resource_id);
CREATE INDEX IF NOT EXISTS idx_agent_leases_run ON agent_leases (workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_leases_status ON agent_leases (status);

-- 6. Typed Artifact Bus (backed by StorageManager)
CREATE TABLE IF NOT EXISTS orchestration_artifacts (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  producer_agent TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('RESEARCH_REPORT', 'CODE_DIFF', 'TEST_RESULTS', 'SCAN_REPORT', 'PROVENANCE_RECORD', 'BROWSER_CAPTURE', 'GENERIC_JSON')),
  storage_key TEXT,
  storage_url TEXT,
  checksum_sha256 TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orch_artifacts_run ON orchestration_artifacts (workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_orch_artifacts_task ON orchestration_artifacts (task_id);
CREATE INDEX IF NOT EXISTS idx_orch_artifacts_type ON orchestration_artifacts (type);

-- 7. Inter-Agent Handoff Contracts
CREATE TABLE IF NOT EXISTS agent_handoffs (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  summary TEXT NOT NULL,
  artifact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT true,
  handoff_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_run ON agent_handoffs (workflow_run_id);

-- 8. Human-in-the-Loop Approvals
CREATE TABLE IF NOT EXISTS orchestration_approvals (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  proposed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT')),
  decision TEXT CHECK (decision IN ('APPROVED', 'REJECTED')),
  reviewer_id TEXT,
  comment TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orch_approvals_run ON orchestration_approvals (workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_orch_approvals_task ON orchestration_approvals (task_id);
CREATE INDEX IF NOT EXISTS idx_orch_approvals_status ON orchestration_approvals (status);

-- 9. Critic Reviews & Synthesis Records
CREATE TABLE IF NOT EXISTS critic_reviews (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('PASS', 'REVISE', 'FAIL')),
  score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  critique TEXT NOT NULL,
  hallucinations_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_critic_reviews_run ON critic_reviews (workflow_run_id);

-- 10. Post-Run Evaluations
CREATE TABLE IF NOT EXISTS orchestration_evaluations (
  id TEXT PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  completion_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  latency_ms BIGINT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  tool_accuracy_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  hallucination_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  policy_adherence_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  overall_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  agent_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orch_evals_run ON orchestration_evaluations (workflow_run_id);

-- 11. Workflow Replay Event Log
CREATE TABLE IF NOT EXISTS workflow_replay_events (
  id BIGSERIAL PRIMARY KEY,
  workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  agent_role TEXT,
  task_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orch_replay_run ON workflow_replay_events (workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_orch_replay_type ON workflow_replay_events (event_type);

-- ============================================================================
-- RLS POLICIES (Row-Level Security)
-- ============================================================================
ALTER TABLE orchestration_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE critic_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_replay_events ENABLE ROW LEVEL SECURITY;

-- Allow read/write for service role and default user
CREATE POLICY "Allow all operations for authenticated users on orchestration_agents" ON orchestration_agents FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on workflow_definitions" ON workflow_definitions FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on workflow_runs" ON workflow_runs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on workflow_tasks" ON workflow_tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on agent_leases" ON agent_leases FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on orchestration_artifacts" ON orchestration_artifacts FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on agent_handoffs" ON agent_handoffs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on orchestration_approvals" ON orchestration_approvals FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on critic_reviews" ON critic_reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on orchestration_evaluations" ON orchestration_evaluations FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users on workflow_replay_events" ON workflow_replay_events FOR ALL USING (true);
