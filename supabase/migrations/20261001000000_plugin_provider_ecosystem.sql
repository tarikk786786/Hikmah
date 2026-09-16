-- HIKMAH AI Operating System - Step 24: Plugin & Provider Ecosystem Migration
-- Canonical Schema for Plugins, Providers, Accounts, OAuth, Quotas, Webhooks, and Events

-- 1. Plugins Table
CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'integration',
    publisher_name TEXT NOT NULL,
    publisher_verified BOOLEAN DEFAULT false,
    license TEXT DEFAULT 'MIT',
    certification_status TEXT DEFAULT 'UNVERIFIED',
    is_installed BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    installed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Provider Definitions
CREATE TABLE IF NOT EXISTS provider_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Provider Health Records
CREATE TABLE IF NOT EXISTS provider_health (
    provider_id TEXT PRIMARY KEY REFERENCES provider_definitions(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    latency_ms INT DEFAULT 0,
    consecutive_failures INT DEFAULT 0,
    circuit_state TEXT DEFAULT 'CLOSED',
    last_checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Provider Quotas
CREATE TABLE IF NOT EXISTS provider_quotas (
    provider_id TEXT PRIMARY KEY REFERENCES provider_definitions(id) ON DELETE CASCADE,
    requests_minute INT DEFAULT 0,
    requests_today INT DEFAULT 0,
    max_requests_minute INT,
    max_requests_today INT,
    reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Account Identities
CREATE TABLE IF NOT EXISTS account_identities (
    account_id TEXT PRIMARY KEY,
    provider_type TEXT NOT NULL,
    label TEXT NOT NULL,
    email TEXT,
    is_default BOOLEAN DEFAULT false,
    tenant_id TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OAuth Connections
CREATE TABLE IF NOT EXISTS oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    connected BOOLEAN DEFAULT true,
    scopes TEXT[] DEFAULT '{}',
    account_email TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, account_id)
);

-- 7. Integration Events
CREATE TABLE IF NOT EXISTS integration_events (
    event_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    provider TEXT NOT NULL,
    actor JSONB DEFAULT '{}',
    resource JSONB DEFAULT '{}',
    payload JSONB DEFAULT '{}',
    trace_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    secret TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Plugin Audit Events
CREATE TABLE IF NOT EXISTS plugin_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plugin_id TEXT,
    provider_id TEXT,
    operation TEXT NOT NULL,
    tier TEXT DEFAULT 'P2',
    account_id TEXT,
    permitted BOOLEAN NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_plugins_type ON plugins(type);
CREATE INDEX IF NOT EXISTS idx_provider_cat ON provider_definitions(category);
CREATE INDEX IF NOT EXISTS idx_account_prov ON account_identities(provider_type);
CREATE INDEX IF NOT EXISTS idx_events_type ON integration_events(type);
CREATE INDEX IF NOT EXISTS idx_audit_op ON plugin_audit_events(operation);

-- Enable RLS
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_audit_events ENABLE ROW LEVEL SECURITY;

-- Full Service Access Policies
CREATE POLICY "Full access to plugins" ON plugins FOR ALL USING (true);
CREATE POLICY "Full access to provider_definitions" ON provider_definitions FOR ALL USING (true);
CREATE POLICY "Full access to provider_health" ON provider_health FOR ALL USING (true);
CREATE POLICY "Full access to provider_quotas" ON provider_quotas FOR ALL USING (true);
CREATE POLICY "Full access to account_identities" ON account_identities FOR ALL USING (true);
CREATE POLICY "Full access to oauth_connections" ON oauth_connections FOR ALL USING (true);
CREATE POLICY "Full access to integration_events" ON integration_events FOR ALL USING (true);
CREATE POLICY "Full access to webhooks" ON webhooks FOR ALL USING (true);
CREATE POLICY "Full access to plugin_audit_events" ON plugin_audit_events FOR ALL USING (true);
