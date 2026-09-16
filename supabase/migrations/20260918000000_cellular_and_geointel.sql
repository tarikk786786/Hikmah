-- ============================================================================
-- HIKMAH OS: Migration 20260918000000
-- Cellular & Geolocation Intelligence Schema
-- ============================================================================

-- 1. Master Public Cellular Infrastructure
CREATE TABLE IF NOT EXISTS public.cells (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'opencellid',
    mcc INTEGER NOT NULL,
    mnc INTEGER NOT NULL,
    lac INTEGER NOT NULL,
    tac INTEGER,
    cell_id INTEGER NOT NULL,
    radio TEXT NOT NULL CHECK (radio IN ('GSM', 'UMTS', 'LTE', 'NR', 'CDMA')),
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    range_meters INTEGER DEFAULT 1000,
    samples INTEGER DEFAULT 1,
    confidence INTEGER DEFAULT 80,
    attribution TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    raw_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cells_coords ON public.cells(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cells_identifiers ON public.cells(mcc, mnc, lac, cell_id);
CREATE INDEX IF NOT EXISTS idx_cells_radio ON public.cells(radio);

-- 2. Device Consent Registry
CREATE TABLE IF NOT EXISTS public.device_consents (
    device_id_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    device_alias TEXT,
    consent_state TEXT NOT NULL DEFAULT 'PENDING' CHECK (consent_state IN ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED')),
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    collection_types TEXT[] DEFAULT '{"CELL", "GPS"}'::text[],
    retention_days INTEGER DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_consents_user ON public.device_consents(user_id);

-- 3. Authorized Device Cell Observations (Telemetry)
CREATE TABLE IF NOT EXISTS public.cell_observations (
    id TEXT PRIMARY KEY,
    user_id UUID,
    device_id_hash TEXT NOT NULL REFERENCES public.device_consents(device_id_hash) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    accuracy NUMERIC(8, 2),
    mcc INTEGER NOT NULL,
    mnc INTEGER NOT NULL,
    lac INTEGER NOT NULL,
    tac INTEGER,
    cell_id INTEGER NOT NULL,
    radio TEXT NOT NULL CHECK (radio IN ('GSM', 'UMTS', 'LTE', 'NR', 'CDMA')),
    pci INTEGER,
    psc INTEGER,
    signal_strength_dbm INTEGER,
    timing_advance INTEGER,
    source TEXT DEFAULT 'hikmah_mobile',
    fingerprint TEXT UNIQUE,
    quality TEXT DEFAULT 'VALIDATED',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cell_observations_device ON public.cell_observations(device_id_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cell_observations_cell ON public.cell_observations(cell_id, mcc, mnc);

-- 4. Mobile Network Operators Registry
CREATE TABLE IF NOT EXISTS public.operators (
    mcc INTEGER NOT NULL,
    mnc INTEGER NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    radio_types TEXT[] DEFAULT '{}'::text[],
    source TEXT DEFAULT 'regulatory',
    PRIMARY KEY (mcc, mnc)
);

-- Seed Standard Carrier Identification Records
INSERT INTO public.operators (mcc, mnc, name, country, country_code, radio_types) VALUES
    (310, 410, 'AT&T Mobility', 'United States', 'us', '{"LTE", "NR"}'),
    (310, 260, 'T-Mobile USA', 'United States', 'us', '{"LTE", "NR"}'),
    (311, 480, 'Verizon Wireless', 'United States', 'us', '{"LTE", "NR"}'),
    (234, 10, 'O2 UK', 'United Kingdom', 'gb', '{"LTE", "NR"}'),
    (234, 15, 'Vodafone UK', 'United Kingdom', 'gb', '{"LTE", "NR"}')
ON CONFLICT (mcc, mnc) DO NOTHING;

-- 5. Provider Quotas
CREATE TABLE IF NOT EXISTS public.provider_quotas (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    user_id UUID,
    request_count INTEGER DEFAULT 0,
    period_date TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(provider, endpoint, period_date)
);

-- 6. Cell Lookup Persistent Cache
CREATE TABLE IF NOT EXISTS public.cell_cache (
    cache_key TEXT PRIMARY KEY,
    cell_record JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
