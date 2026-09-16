-- ============================================================================
-- HIKMAH MIGRATION: Multi-Engine Memory Router & Knowledge Fabric (PRD 08A)
-- Canonical Memory Registry, Provider Refs, Health Telemetry, and Relationships
-- ============================================================================

-- 1. Canonical Memory Registry
CREATE TABLE IF NOT EXISTS public.memory_registry (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    classification VARCHAR(32) NOT NULL,
    canonical_content TEXT NOT NULL,
    canonical_hash VARCHAR(64) NOT NULL,
    primary_provider VARCHAR(32) NOT NULL,
    authority VARCHAR(32) NOT NULL DEFAULT 'USER_EXPLICIT',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    importance DOUBLE PRECISION DEFAULT 5.0,
    confidence DOUBLE PRECISION DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_registry_user ON public.memory_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_registry_project ON public.memory_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_registry_hash ON public.memory_registry(canonical_hash);
CREATE INDEX IF NOT EXISTS idx_memory_registry_class ON public.memory_registry(classification);

-- 2. Memory Provider References
CREATE TABLE IF NOT EXISTS public.memory_provider_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id TEXT NOT NULL REFERENCES public.memory_registry(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_memory_id TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'SYNCED',
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_refs_mid ON public.memory_provider_refs(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_refs_provider ON public.memory_provider_refs(provider);

-- 3. Memory Provider Health Telemetry
CREATE TABLE IF NOT EXISTS public.memory_provider_health (
    provider VARCHAR(32) PRIMARY KEY,
    status VARCHAR(16) NOT NULL,
    latency_ms INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    error TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial Built-in Provider Health Status
INSERT INTO public.memory_provider_health (provider, status, latency_ms, record_count, last_checked_at)
VALUES 
    ('native-supabase', 'BUILT_IN', 1, 2, NOW()),
    ('mem0', 'HEALTHY', 3, 0, NOW()),
    ('graphiti', 'HEALTHY', 4, 0, NOW()),
    ('letta', 'HEALTHY', 3, 0, NOW()),
    ('cognee', 'HEALTHY', 5, 0, NOW()),
    ('langmem', 'HEALTHY', 2, 0, NOW()),
    ('supermemory', 'HEALTHY', 6, 0, NOW())
ON CONFLICT (provider) DO NOTHING;

-- 4. Memory Conflict Audit Log
CREATE TABLE IF NOT EXISTS public.memory_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    existing_memory_id TEXT,
    incoming_content TEXT NOT NULL,
    resolution VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Memory Relationships & Knowledge Edges
CREATE TABLE IF NOT EXISTS public.memory_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type VARCHAR(64) NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_rel_src ON public.memory_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_rel_tgt ON public.memory_relationships(target_id);

-- 6. Row Level Security Policies
ALTER TABLE public.memory_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_provider_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to memory_registry for demo"
    ON public.memory_registry FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert to memory_registry"
    ON public.memory_registry FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update to memory_registry"
    ON public.memory_registry FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to memory_provider_health"
    ON public.memory_provider_health FOR SELECT USING (true);
