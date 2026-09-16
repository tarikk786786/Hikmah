-- HIKMAH AI Operating System - Step 23: Skill Marketplace & Skill Intelligence Engine Migration
-- Schema for Skills, Manifests, Versions, Sandboxes, Scans, Dependencies, and Analytics

-- 1. Skills Master Table
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    author TEXT,
    publisher_name TEXT NOT NULL,
    publisher_type TEXT DEFAULT 'community',
    publisher_verified BOOLEAN DEFAULT false,
    repository TEXT,
    homepage TEXT,
    license TEXT DEFAULT 'MIT',
    sha256 TEXT,
    signature TEXT,
    source TEXT DEFAULT 'local',
    risk_level TEXT DEFAULT 'LOW',
    certification_status TEXT DEFAULT 'UNVERIFIED',
    lifecycle_state TEXT DEFAULT 'DISCOVERED',
    is_installed BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    is_generated BOOLEAN DEFAULT false,
    installed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Skill Versions
CREATE TABLE IF NOT EXISTS skill_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    manifest JSONB NOT NULL,
    changelog TEXT,
    released_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, version)
);

-- 3. Skill Categories & Tags
CREATE TABLE IF NOT EXISTS skill_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Skill Capabilities
CREATE TABLE IF NOT EXISTS skill_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    capability TEXT NOT NULL,
    tool_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Skill Permissions
CREATE TABLE IF NOT EXISTS skill_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    network_enabled BOOLEAN DEFAULT false,
    allowed_domains TEXT[] DEFAULT '{}',
    fs_read_paths TEXT[] DEFAULT '{}',
    fs_write_paths TEXT[] DEFAULT '{}',
    shell_enabled BOOLEAN DEFAULT false,
    allowed_commands TEXT[] DEFAULT '{}',
    credentials_required BOOLEAN DEFAULT false,
    credential_providers TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Skill Dependencies
CREATE TABLE IF NOT EXISTS skill_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    dep_name TEXT NOT NULL,
    dep_type TEXT NOT NULL,
    dep_version TEXT,
    optional BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Skill Security Scans
CREATE TABLE IF NOT EXISTS skill_security_scans (
    id TEXT PRIMARY KEY,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    risk_level TEXT NOT NULL,
    findings JSONB DEFAULT '[]',
    secrets_found TEXT[] DEFAULT '{}',
    dangerous_apis TEXT[] DEFAULT '{}',
    sbom JSONB DEFAULT '{}',
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Skill Tests & Benchmarks
CREATE TABLE IF NOT EXISTS skill_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    all_passed BOOLEAN NOT NULL,
    passed_count INT NOT NULL,
    failed_count INT NOT NULL,
    results JSONB DEFAULT '[]',
    tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Skill Installations & Lock
CREATE TABLE IF NOT EXISTS skill_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    permissions_hash TEXT NOT NULL,
    installed_by TEXT DEFAULT 'SYSTEM',
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    uninstalled_at TIMESTAMPTZ
);

-- 10. Skill Executions & Analytics
CREATE TABLE IF NOT EXISTS skill_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    duration_ms INT NOT NULL,
    success BOOLEAN NOT NULL,
    error TEXT,
    memory_used_mb NUMERIC,
    security_violation BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Skill User Preferences & Memory
CREATE TABLE IF NOT EXISTS skill_user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    preference TEXT DEFAULT 'NEUTRAL',
    task_type TEXT,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Skill Kill Switch & Audit Events
CREATE TABLE IF NOT EXISTS skill_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    permitted BOOLEAN NOT NULL,
    reason TEXT,
    actor TEXT,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Fast Discovery and Verification
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_certification ON skills(certification_status);
CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills(is_installed);
CREATE INDEX IF NOT EXISTS idx_skill_capabilities_cap ON skill_capabilities(capability);
CREATE INDEX IF NOT EXISTS idx_skill_categories_cat ON skill_categories(category);
CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_audit_skill ON skill_audit_events(skill_id);

-- Enable Row-Level Security
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_audit_events ENABLE ROW LEVEL SECURITY;

-- Standard Service Role Full Access Policies
CREATE POLICY "Allow service role full access to skills" ON skills FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_versions" ON skill_versions FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_categories" ON skill_categories FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_capabilities" ON skill_capabilities FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_permissions" ON skill_permissions FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_dependencies" ON skill_dependencies FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_security_scans" ON skill_security_scans FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_tests" ON skill_tests FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_installations" ON skill_installations FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_executions" ON skill_executions FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_user_memory" ON skill_user_memory FOR ALL USING (true);
CREATE POLICY "Allow service role full access to skill_audit_events" ON skill_audit_events FOR ALL USING (true);
