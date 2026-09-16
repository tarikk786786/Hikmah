-- ==============================================================================
-- Hikmah AI Operating System — Migration 02: Universal Capabilities & Task Graph
-- ==============================================================================

-- 1. Capabilities Table (Universal Capability Registry)
CREATE TABLE IF NOT EXISTS public.capabilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    provider TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'TOOL',
        'AGENT',
        'SKILL',
        'MODEL',
        'WORKFLOW',
        'MCP_SERVER',
        'STORAGE_PROVIDER',
        'VOICE_PROVIDER',
        'BROWSER_PROVIDER'
    )),
    input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    permissions TEXT[] DEFAULT '{}',
    risk_level TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    runtime TEXT NOT NULL DEFAULT 'VERCEL' CHECK (runtime IN ('VERCEL', 'SUPABASE_EDGE', 'RENDER', 'DOCKER', 'LOCAL', 'FUTURE_REMOTE')),
    supported_environments TEXT[] DEFAULT '{"node"}',
    required_secrets TEXT[] DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}',
    timeout INT NOT NULL DEFAULT 15000,
    retry_policy JSONB DEFAULT '{"maxRetries": 2, "backoffMs": 1000}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    health_status TEXT NOT NULL DEFAULT 'HEALTHY' CHECK (health_status IN ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'DISABLED', 'REQUIRES_CONFIGURATION')),
    cost_estimate JSONB,
    tags TEXT[] DEFAULT '{}',
    documentation_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Task Graphs (DAG Workflows)
CREATE TABLE IF NOT EXISTS public.task_graphs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'PLANNED' CHECK (state IN ('PLANNED', 'EXECUTING', 'COMPLETED', 'FAILED', 'HALTED')),
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Target Scopes & Authorization Records (Authorized Security Layer)
CREATE TABLE IF NOT EXISTS public.target_scopes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    environment TEXT NOT NULL CHECK (environment IN ('USER_OWNED', 'AUTHORIZED_LAB', 'CTF_CHALLENGE', 'BUG_BOUNTY_PROGRAM', 'INTERNAL_ASSESSMENT')),
    allowed_techniques TEXT[] NOT NULL DEFAULT '{}',
    disallowed_techniques TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authorization_records (
    id TEXT PRIMARY KEY,
    scope_id TEXT NOT NULL REFERENCES public.target_scopes(id) ON DELETE CASCADE,
    authorized_by TEXT NOT NULL,
    authorization_proof TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Immutable Security Audit Logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id TEXT PRIMARY KEY,
    target TEXT NOT NULL,
    action TEXT NOT NULL,
    authorization_id TEXT REFERENCES public.authorization_records(id) ON DELETE SET NULL,
    authorized BOOLEAN NOT NULL,
    operator_id TEXT NOT NULL,
    rationale TEXT NOT NULL,
    evidence_hash TEXT,
    payload_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_capabilities_type_cat ON public.capabilities(type, category);
CREATE INDEX IF NOT EXISTS idx_capabilities_health ON public.capabilities(health_status);
CREATE INDEX IF NOT EXISTS idx_task_graphs_state ON public.task_graphs(state);
CREATE INDEX IF NOT EXISTS idx_security_audit_target ON public.security_audit_logs(target);
