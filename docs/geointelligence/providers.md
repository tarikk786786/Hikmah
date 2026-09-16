# Geointelligence External Providers

Hikmah integrates with three primary public providers for cellular network data and geographic rendering.

---

## 1. OpenCelliD (`OpenCellIdProvider`)

- **Primary Role**: Public cell tower database query provider.
- **Base URL**: `https://opencellid.org/cell`
- **Supported Radios**: GSM, UMTS, LTE, NR (5G).
- **Authentication**: `OPENCELLID_API_KEY` passed as `key` query parameter.
- **Quota Limit**: **1,000 requests / day** per free API key account.
- **Attribution**: `Data from OpenCelliD community (CC-BY-SA 4.0)` (CC-BY-SA 4.0 mandatory license).

### Quota Enforcement
Hikmah wraps every upstream call with `QuotaTracker`:
```typescript
const quota = await quotaTracker.checkLimit('opencellid', 1000);
if (!quota.allowed) {
  throw new Error(`OpenCelliD daily limit reached (${quota.used}/${quota.limit}). Resets at midnight UTC.`);
}
```

### Response Normalization
Raw OpenCelliD fields are normalized into the Hikmah `CellRecord` format:
- `mcc` (Mobile Country Code)
- `mnc` (Mobile Network Code)
- `lac` (Location Area Code / Tracking Area Code)
- `cellId` (Cell Identifier)
- `lat` / `lon` (WGS84 decimal degrees)
- `range` (Estimated cell radius in meters)
- `samples` (Observation density count)
- `changeable` (Boolean indicating whether position is stationary)

---

## 2. Mozilla Ichnaea (`IchnaeaProvider`)

- **Primary Role**: RF signal-based multi-cell triangulation and client position estimation.
- **Endpoint**: Compatible with Mozilla Ichnaea v1 API (`/v1/geolocate`).
- **Input Telemetry**:
  - `radioType`: `gsm` | `wcdma` | `lte` | `nr`
  - Array of cell observations with `mobileCountryCode`, `mobileNetworkCode`, `locationAreaCode`, `cellId`, `signalStrength` (RSRP / dBm), and `timingAdvance`.
- **Estimation Algorithm**:
  - Signal-weighted centroid algorithm:
    $$\mathbf{p} = \frac{\sum w_i \cdot \mathbf{p}_i}{\sum w_i}$$
  - Weight factor $w_i = 10^{(P_{rx} - P_{ref}) / 20}$ derived from measured signal strength.
  - Accuracy radius is estimated based on the geometric spread of contributing cell towers and signal attenuation.

---

## 3. OpenStreetMap & Nominatim (`OSMProvider`)

- **Primary Role**: Reverse geocoding (coordinates $\to$ address) and map tile generation.
- **Reverse Geocode Endpoint**: `https://nominatim.openstreetmap.org/reverse`
- **Tile Server**: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Rate Limit Policy**: Nominatim usage requires custom `User-Agent: Hikmah-OS/1.0` and a maximum rate of 1 request per second.
- **Attribution**: `© OpenStreetMap contributors`
