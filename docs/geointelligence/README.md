# Hikmah Cellular & Geolocation Intelligence Subsystem

The **Cellular & Geolocation Intelligence** subsystem is Hikmah's privacy-first, modular engine for cellular network infrastructure analysis, radio frequency (RF) triangulation, and multi-source location estimation.

---

## 1. Architectural Philosophy & Boundaries

Hikmah implements geolocation and cellular telemetry **strictly as a public data aggregator and authorized-device analysis tool**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HIKMAH GEOINTEL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Public Infrastructure]                [Consenting Telemetry]           │
│   • OpenCelliD (Towers & BBoxes)         • NeoStumbler / Hikmah Mobile   │
│   • OpenStreetMap / Nominatim (Tiles)    • Device Consent Manager        │
│                                            (Salted SHA-256 Hashes)      │
│            │                                      │                     │
│            ▼                                      ▼                     │
│  ┌────────────────────┐                 ┌────────────────────┐          │
│  │ OpenCellIdProvider │                 │ Ingestion Pipeline │          │
│  │  (Quota: 1,000/d)  │                 │ (1m Dedup Windows) │          │
│  └─────────┬──────────┘                 └─────────┬──────────┘          │
│            │                                      │                     │
│            └───────────────┬──────────────────────┘                     │
│                            ▼                                            │
│                 ┌────────────────────┐                                  │
│                 │ Geolocation Engine │                                  │
│                 │  (Multi-Source RF  │                                  │
│                 │   Triangulation)   │                                  │
│                 └──────────┬─────────┘                                  │
│                            ▼                                            │
│            ┌──────────────────────────────┐                             │
│            │ hikmah-geointel MCP Server   │                             │
│            │ (13 Tools + Audit Logging)   │                             │
│            └───────────────┬──────────────┘                             │
│                            │                                            │
│            ┌───────────────┴──────────────┐                             │
│            ▼                              ▼                             │
│    Web Control Center             Capability Registry                   │
│   (/geointel, cells, maps)         & Tool Registry                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Strict Non-Goals (Privacy Boundaries)
* **NO Carrier-Subscriber Tracking**: Hikmah has no integration with SS7, Diameter, or carrier lawful intercept interfaces.
* **NO Hardware Serials Stored**: IMEIs, IMSIs, and MAC addresses are **never** stored in cleartext. Hardware identifiers are immediately salted and hashed with SHA-256.
* **NO Ingestion Without Consent**: Devices must have an active `GRANTED` state in `device_consents`. Unconsented packets are dropped immediately.

---

## 2. Core Capabilities

1. **Public Cell Tower Lookup**: Query cell positions by MCC, MNC, LAC/TAC, and Cell ID (GSM, UMTS, LTE, NR).
2. **Bounding Box Area Query**: Search public cells within geographic bounding boxes (max 50 cells per request).
3. **OpenCelliD Quota Management**: Enforces daily credit budgets (1,000 requests/day per API key) with real-time tracking and grace periods.
4. **Normalized L2/L3 Caching**: Caches tower coordinates with configurable 30-day TTL to conserve upstream quota.
5. **Multi-Source Geolocation Ensemble**: Fuses GPS fixes, OpenCelliD reference towers, and Mozilla Ichnaea RF triangulation (RSRP signal weighting).
6. **Reverse Geocoding & Mapping**: Resolves coordinates to human-readable addresses and administrative areas via OpenStreetMap Nominatim.
7. **Movement & Handover Analysis**: Tracks sector transitions, distance traversed, and signal reception distributions over time.
8. **Dedicated MCP Server**: Exposes 13 structured tools through the Model Context Protocol.

---

## 3. Mandatory OpenCelliD Attribution

In compliance with OpenCelliD terms of service, all data derived from OpenCelliD must be attributed:
> **"Data from OpenCelliD community (CC-BY-SA 4.0)"**

Hikmah automatically embeds this attribution in:
- API responses from `OpenCellIdProvider`
- MCP tool execution outputs
- Web Control Center UI footers and exports
