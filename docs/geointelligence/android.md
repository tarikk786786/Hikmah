# Android & NeoStumbler Telemetry Integration

Hikmah provides compatibility with open-source Android cellular observation loggers, notably **NeoStumbler**, and the companion **Hikmah Mobile** agent.

---

## 1. NeoStumbler Overview

[NeoStumbler](https://github.com/mjaakko/NeoStumbler) is an open-source Android application that records:
- Cell towers (GSM, UMTS, LTE, NR)
- Wi-Fi access points
- Bluetooth Low Energy (BLE) beacons

NeoStumbler supports sending observation batches to custom endpoints compatible with the Mozilla Ichnaea submission protocol (`/v1/geosubmit`).

---

## 2. Telemetry Submission Protocol

Observations can be submitted via POST requests or the `geointel_ingest_observations` MCP tool:

```json
{
  "deviceIdentifier": "my-authorized-android-phone",
  "items": [
    {
      "timestamp": "2026-09-16T10:00:00.000Z",
      "position": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 12
      },
      "cellTowers": [
        {
          "radioType": "lte",
          "mobileCountryCode": 310,
          "mobileNetworkCode": 410,
          "locationAreaCode": 1402,
          "cellId": 28419,
          "signalStrength": -78,
          "timingAdvance": 3
        }
      ]
    }
  ]
}
```

---

## 3. Ingestion Pipeline Guarantees

1. **Consent Verification**: Rejects any submission whose salted SHA-256 device hash does not have `GRANTED` status.
2. **Fingerprint Deduplication**: Prevents duplicate entries from redundant scans or retried network uploads using a 1-minute window fingerprint:
   $$\text{fingerprint} = \text{MD5}(\text{deviceHash} \mathbin{\Vert} \text{radio} \mathbin{\Vert} \text{mcc:mnc:lac:cid} \mathbin{\Vert} \lfloor\text{timestamp} / 60000\rfloor)$$
3. **Coordinate Validation**: Validates that latitudes fall within $[-90, 90]$ and longitudes within $[-180, 180]$.
4. **L2 Tower Caching**: New cell towers observed in client submissions enrich Hikmah's local `cells` cache for future triangulation.
