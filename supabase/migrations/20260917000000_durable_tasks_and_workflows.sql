-- ============================================================================
-- HIKMAH OS: Migration 20260917000000
-- Durable Tasks, Checkpoints, Worker Leases, Approvals & Workflows
-- ============================================================================

-- 1. Tasks Table (Persistent State of Truth)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID,
    project_id TEXT,
    parent_task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
    workflow_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (
        status IN (
            'CREATED', 'QUEUED', 'RUNNING', 'WAITING', 'PAUSED',
            'WAITING_APPROVAL', 'RETRYING', 'PARTIAL', 'SUCCEEDED',
            'FAILED', 'CANCELLED', 'EXPIRED', 'BLOCKED'
        )
    ),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND')),
    risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'NONE' CHECK (approval_status IN ('NONE', 'PENDING', 'APPROVED', 'DENIED')),
    approval_id TEXT,
    assigned_worker TEXT,
    assigned_runtime TEXT DEFAULT 'RENDER',
    current_step TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    backoff_strategy TEXT DEFAULT 'EXPONENTIAL' CHECK (backoff_strategy IN ('FIXED', 'LINEAR', 'EXPONENTIAL')),
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    deadline TIMESTAMPTZ
);

-- Fast Indexing for Task Queries & Worker Polling
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);

-- 2. Task Checkpoints (Durable Step Recovery)
CREATE TABLE IF NOT EXISTS public.task_checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    progress INTEGER NOT NULL DEFAULT 0,
    partial_result JSONB,
    cursor TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_checkpoints_task_id ON public.task_checkpoints(task_id, created_at DESC);

-- 3. Worker Leases (Mutual Exclusion & Crash Recovery)
CREATE TABLE IF NOT EXISTS public.worker_leases (
    task_id TEXT PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL,
    worker_type TEXT NOT NULL,
    lease_acquired_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    lease_expires_at TIMESTAMPTZ NOT NULL,
    heartbeat_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_worker_leases_expires ON public.worker_leases(lease_expires_at);

-- 4. Workflows & Workflow Runs
CREATE TABLE IF NOT EXISTS public.workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED')),
    step_tasks JSONB DEFAULT '{}'::jsonb,
    step_states JSONB DEFAULT '{}'::jsonb,
    progress INTEGER DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_user ON public.workflow_runs(user_id, started_at DESC);

-- 5. Task Approvals (Human-In-The-Loop)
CREATE TABLE IF NOT EXISTS public.task_approvals (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    risk_level TEXT NOT NULL,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
    decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_approvals_task ON public.task_approvals(task_id);
