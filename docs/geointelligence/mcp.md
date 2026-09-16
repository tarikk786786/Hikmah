# `hikmah-geointel` MCP Server Specification

The `hikmah-geointel` Model Context Protocol (MCP) server provides AI agents with safe, controlled interfaces to public cellular infrastructure and authorized telemetry.

---

## 1. Tool Summary & Risk Classifications

Every tool is registered into the Hikmah `ToolRegistry` and `CapabilityRegistry` with a security risk rating and mandatory audit logging:

| Tool Name | Risk Level | Description |
|---|---|---|
| `geointel_lookup_cell` | `LOW` | Look up a public cell tower by MCC, MNC, LAC, and Cell ID. |
| `geointel_search_cells_in_area` | `LOW` | Search cell towers in a bounding box (max 50). |
| `geointel_estimate_location` | `LOW` | Triangulate coordinates from cell RF measurements. |
| `geointel_reverse_geocode` | `LOW` | Resolve (lat, lon) to OSM human-readable address. |
| `geointel_register_device_consent` | `MEDIUM` | Register and grant consent for an authorized device. |
| `geointel_revoke_device_consent` | `MEDIUM` | Immediately revoke telemetry authorization for a device. |
| `geointel_verify_device_consent` | `LOW` | Check active consent status for a device hash. |
| `geointel_list_consented_devices` | `MEDIUM` | List all registered devices and consent states. |
| `geointel_purge_device_data` | `HIGH` | Permanently delete all historical observations for a device. |
| `geointel_ingest_observations` | `MEDIUM` | Ingest batch RF observations from an authorized device. |
| `geointel_get_historical_path` | `MEDIUM` | Retrieve chronological location path for an authorized device. |
| `geointel_analyze_movement` | `LOW` | Calculate movement metrics (speed, handovers, distance). |
| `geointel_check_provider_quota` | `LOW` | Check remaining credits for OpenCelliD and providers. |

---

## 2. Tool Interfaces

### `geointel_lookup_cell`
```json
{
  "radio": "LTE",
  "mcc": 310,
  "mnc": 410,
  "lac": 1402,
  "cellId": 28419
}
```
**Returns**: `CellRecord` containing coordinates, coverage radius, samples, and OpenCelliD CC-BY-SA 4.0 attribution.

### `geointel_estimate_location`
```json
{
  "cells": [
    { "radio": "LTE", "mcc": 310, "mnc": 410, "lac": 1402, "cellId": 28419, "signalStrength": -78 },
    { "radio": "LTE", "mcc": 310, "mnc": 410, "lac": 1402, "cellId": 49201, "signalStrength": -85 }
  ]
}
```
**Returns**: `GeolocationEstimate` with calculated `lat`, `lon`, `accuracyRadiusMeters`, and confidence score.

### `geointel_revoke_device_consent`
```json
{
  "deviceIdentifier": "client-terminal-alpha"
}
```
**Returns**:
```json
{
  "success": true,
  "deviceIdHash": "e3b0c44298fc...",
  "status": "REVOKED",
  "message": "Consent revoked. Any incoming telemetry will be discarded."
}
```
