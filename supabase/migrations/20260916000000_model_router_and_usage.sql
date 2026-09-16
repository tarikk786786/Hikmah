-- ============================================================================
-- HIKMAH OS: Migration 20260916000000
-- Universal AI Model Router, Provider Gateway, Usage Ledger & Prompt Versions
-- ============================================================================

-- 1. AI Providers
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('cloud', 'local', 'mock', 'custom')),
    tier TEXT DEFAULT 'free',
    is_enabled BOOLEAN DEFAULT TRUE,
    rate_limit_rpm INTEGER DEFAULT 60,
    rate_limit_tpm INTEGER DEFAULT 100000,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. AI Models
CREATE TABLE IF NOT EXISTS public.ai_models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CHAT', 'FAST', 'REASONING', 'CODING', 'VISION', 'EMBEDDING', 'AUDIO', 'LOCAL', 'FALLBACK')),
    role TEXT NOT NULL CHECK (role IN ('fast', 'reasoning', 'coding', 'vision', 'local', 'fallback')),
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    context_window INTEGER NOT NULL DEFAULT 128000,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    latency_class TEXT NOT NULL DEFAULT 'LOW' CHECK (latency_class IN ('ULTRA_LOW', 'LOW', 'MEDIUM', 'HIGH')),
    input_cost_per_million NUMERIC(10, 4) DEFAULT 0.0,
    output_cost_per_million NUMERIC(10, 4) DEFAULT 0.0,
    is_enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 50,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. AI Provider Health & Circuit Breaker Tracking
CREATE TABLE IF NOT EXISTS public.ai_provider_health (
    provider_id TEXT PRIMARY KEY REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'HEALTHY' CHECK (state IN ('HEALTHY', 'DEGRADED', 'FAILED', 'RECOVERING', 'DISABLED')),
    failure_count INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    cooldown_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. AI Usage Ledger (Token spend, latency, and costs)
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
    id TEXT PRIMARY KEY,
    user_id UUID,
    request_id TEXT,
    provider_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'ERROR', 'FALLBACK')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning fast usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_created_at ON public.ai_usage_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_user ON public.ai_usage_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_provider ON public.ai_usage_ledger(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_model ON public.ai_usage_ledger(model_id);

-- 5. Prompt Templates & Versioning
CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    current_version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL REFERENCES public.prompt_templates(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_template ON public.prompt_versions(template_id);

-- 6. Initial Seed Data
INSERT INTO public.ai_providers (id, name, type, tier, is_enabled) VALUES
    ('openai', 'OpenAI Cloud', 'cloud', 'standard', TRUE),
    ('anthropic', 'Anthropic Claude', 'cloud', 'standard', TRUE),
    ('gemini', 'Google Gemini AI', 'cloud', 'standard', TRUE),
    ('ollama', 'Ollama Local Runtime', 'local', 'free', TRUE),
    ('mock', 'Mock / Resilient Fallback', 'mock', 'free', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai_provider_health (provider_id, state) VALUES
    ('openai', 'HEALTHY'),
    ('anthropic', 'HEALTHY'),
    ('gemini', 'HEALTHY'),
    ('ollama', 'HEALTHY'),
    ('mock', 'HEALTHY')
ON CONFLICT (provider_id) DO NOTHING;

INSERT INTO public.ai_models (id, provider_id, name, type, role, capabilities, context_window, max_tokens, latency_class, input_cost_per_million, output_cost_per_million, priority) VALUES
    ('gpt-4o', 'openai', 'GPT-4o Omnimodel', 'CHAT', 'reasoning', '{"tools": true, "vision": true, "reasoning": true, "json_schema": true, "streaming": true, "embeddings": false, "audio": true}', 128000, 4096, 'LOW', 2.50, 10.00, 90),
    ('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'FAST', 'fast', '{"tools": true, "vision": true, "reasoning": false, "json_schema": true, "streaming": true, "embeddings": false, "audio": false}', 128000, 4096, 'ULTRA_LOW', 0.15, 0.60, 85),
    ('claude-3-7-sonnet', 'anthropic', 'Claude 3.7 Sonnet', 'REASONING', 'reasoning', '{"tools": true, "vision": true, "reasoning": true, "json_schema": true, "streaming": true, "embeddings": false, "audio": false}', 200000, 8192, 'LOW', 3.00, 15.00, 98),
    ('gemini-2.5-flash', 'gemini', 'Gemini 2.5 Flash', 'FAST', 'fast', '{"tools": true, "vision": true, "reasoning": true, "json_schema": true, "streaming": true, "embeddings": false, "audio": true}', 1048576, 8192, 'ULTRA_LOW', 0.15, 0.60, 92),
    ('llama3.3:8b', 'ollama', 'Llama 3.3 8B (Local)', 'LOCAL', 'local', '{"tools": true, "vision": false, "reasoning": false, "json_schema": true, "streaming": true, "embeddings": false, "audio": false}', 131072, 4096, 'LOW', 0.0, 0.0, 80),
    ('mock-chat-v1', 'mock', 'Mock Failover Chat', 'FALLBACK', 'fallback', '{"tools": true, "vision": true, "reasoning": true, "json_schema": true, "streaming": true, "embeddings": false, "audio": false}', 32768, 2048, 'ULTRA_LOW', 0.0, 0.0, 10)
ON CONFLICT (id) DO NOTHING;
