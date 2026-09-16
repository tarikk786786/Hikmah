# Geointelligence Data Models & Schema

Hikmah stores cellular infrastructure and telemetry data in PostgreSQL / Supabase, partitioned between public RF assets and private authorized device records.

---

## 1. Relational Schema Summary

```
 ┌──────────────────────┐         ┌────────────────────────┐
 │   device_consents    │ 1     * │    cell_observations   │
 ├──────────────────────┼─────────┼────────────────────────┤
 │ device_id_hash (PK)  │         │ id (PK UUID)           │
 │ label                │         │ device_id_hash (FK)    │
 │ consent_status       │         │ cell_id                │
 │ consent_scope        │         │ radio, mcc, mnc, lac   │
 │ retention_days       │         │ signal_dbm, ta         │
 │ granted_at           │         │ estimated_lat, lon     │
 │ expires_at           │         │ observation_time       │
 └──────────────────────┘         │ fingerprint (UNIQUE)   │
                                  └────────────────────────┘

 ┌──────────────────────┐         ┌────────────────────────┐
 │        cells         │         │     cell_cache         │
 ├──────────────────────┤         ├────────────────────────┤
 │ id (PK UUID)         │         │ cache_key (PK)         │
 │ radio, mcc, mnc      │         │ response_json          │
 │ lac, cell_id (UNIQUE)│         │ expires_at             │
 │ lat, lon, range      │         │ created_at             │
 │ samples, attribution │         └────────────────────────┘
 └──────────────────────┘
```

---

## 2. Table Specifications

### `cells`
Stores known public cell tower footprints acquired via OpenCelliD or observed by authorized devices:
- `radio` (`VARCHAR(8)`): 'GSM', 'UMTS', 'LTE', 'NR'
- `mcc`, `mnc`, `lac`, `cell_id` (`INTEGER`): Global unique cell tuple
- `lat`, `lon` (`DOUBLE PRECISION`): Center point coordinates (WGS84)
- `range_meters` (`INTEGER`): Approximate coverage radius
- `samples` (`INTEGER`): Hit count
- `attribution` (`TEXT`): License notice (`Data from OpenCelliD community (CC-BY-SA 4.0)`)

### `device_consents`
Strict privacy table managing authorized devices:
- `device_id_hash` (`VARCHAR(64)`): Salted SHA-256 hash
- `label` (`VARCHAR(128)`): Friendly name (e.g., 'Pixel 7a')
- `consent_status` (`VARCHAR(16)`): 'PENDING', 'GRANTED', 'REVOKED', 'EXPIRED'
- `consent_scope` (`VARCHAR(32)`): 'CELL_ONLY', 'CELL_AND_WIFI', 'FULL_TELEMETRY'
- `retention_days` (`INTEGER`): Default 30 days

### `cell_observations`
Telemetry observations ingested from consented devices:
- `device_id_hash` (`VARCHAR(64)` REFERENCES `device_consents`)
- `signal_dbm` (`DOUBLE PRECISION`): Received signal strength (RSRP/RSSI)
- `timing_advance` (`INTEGER`): Distance metric (TA)
- `fingerprint` (`VARCHAR(64)`): MD5 hash used to prevent duplicate ingestion within 1-minute windows
- `created_at` (`TIMESTAMPTZ`): Server ingestion timestamp

### `provider_quotas`
Tracks external API credit consumption:
- `provider` (`VARCHAR(32)`): e.g. 'opencellid'
- `date` (`DATE`): Calendar date (UTC)
- `requests_used` (`INTEGER`): Counter
- `daily_limit` (`INTEGER`): Default 1000
