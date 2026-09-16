-- Step 25: Personal AI Operating System (PAIOS) Database Schema
-- Migration: 20261002000000_paios_core.sql

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS paio_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    role TEXT NOT NULL DEFAULT 'operator',
    is_default BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    context_budget_tokens INTEGER NOT NULL DEFAULT 128000,
    active_project_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_profiles_user ON paio_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_paio_profiles_slug ON paio_profiles(slug);

-- 2. Devices Table
CREATE TABLE IF NOT EXISTS paio_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT REFERENCES paio_profiles(id) ON DELETE SET NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'desktop',
    platform TEXT NOT NULL DEFAULT 'unknown',
    client_version TEXT NOT NULL DEFAULT '1.0.0',
    ip_address TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    telemetry JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_paio_devices_user ON paio_devices(user_id);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS paio_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    user_id TEXT NOT NULL,
    root_directory TEXT,
    git_repository TEXT,
    current_goal TEXT,
    active_agent_ids TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    pinned_files TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_projects_user ON paio_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_paio_projects_status ON paio_projects(status);

-- 4. Project Activity Table
CREATE TABLE IF NOT EXISTS paio_project_activity (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES paio_projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    actor TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_proj_act_pid ON paio_project_activity(project_id);

-- 5. Sessions Table
CREATE TABLE IF NOT EXISTS paio_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL REFERENCES paio_profiles(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES paio_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active',
    origin_device_id TEXT,
    current_device_id TEXT,
    active_agents TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_sessions_user ON paio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_paio_sessions_proj ON paio_sessions(project_id);

-- 6. Session Checkpoints Table
CREATE TABLE IF NOT EXISTS paio_session_checkpoints (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES paio_sessions(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    open_files TEXT[] NOT NULL DEFAULT '{}',
    active_agent_id TEXT,
    context_tokens_used INTEGER NOT NULL DEFAULT 0,
    serialized_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_checkpoints_sess ON paio_session_checkpoints(session_id);

-- 7. Personal Tasks Table
CREATE TABLE IF NOT EXISTS paio_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES paio_projects(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_agent_id TEXT,
    due_date TIMESTAMPTZ,
    subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_tasks_proj ON paio_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_paio_tasks_user ON paio_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_paio_tasks_status ON paio_tasks(status);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS paio_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    priority TEXT NOT NULL DEFAULT 'normal',
    channels TEXT[] NOT NULL DEFAULT '{"in_app"}',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_notif_user ON paio_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_paio_notif_read ON paio_notifications(read);

-- 9. Approvals Table
CREATE TABLE IF NOT EXISTS paio_approvals (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_paio_approvals_status ON paio_approvals(status);

-- 10. System Events Table
CREATE TABLE IF NOT EXISTS paio_system_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    actor TEXT,
    source TEXT NOT NULL,
    user_id TEXT,
    project_id TEXT,
    session_id TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    trace_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_events_type ON paio_system_events(type);
CREATE INDEX IF NOT EXISTS idx_paio_events_trace ON paio_system_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_paio_events_time ON paio_system_events(timestamp DESC);

-- 11. Decision Records Table (Explainability "Why?")
CREATE TABLE IF NOT EXISTS paio_decision_records (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    session_id TEXT,
    project_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paio_decisions_trace ON paio_decision_records(trace_id);
CREATE INDEX IF NOT EXISTS idx_paio_decisions_action ON paio_decision_records(action);

-- Enable RLS across all tables
ALTER TABLE paio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_session_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE paio_decision_records ENABLE ROW LEVEL SECURITY;

-- Fallback permissive policy for local development / service roles
CREATE POLICY "Full access for service role on paio_profiles" ON paio_profiles FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_devices" ON paio_devices FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_projects" ON paio_projects FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_project_activity" ON paio_project_activity FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_sessions" ON paio_sessions FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_session_checkpoints" ON paio_session_checkpoints FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_tasks" ON paio_tasks FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_notifications" ON paio_notifications FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_approvals" ON paio_approvals FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_system_events" ON paio_system_events FOR ALL USING (true);
CREATE POLICY "Full access for service role on paio_decision_records" ON paio_decision_records FOR ALL USING (true);
