# Privacy Architecture & Ethical Boundaries

Hikmah operates under strict technical and ethical constraints to ensure cellular intelligence capabilities are utilized solely for authorized device telemetry, personal mobility logging, and open-source infrastructure research.

---

## 1. Zero Raw Identifier Policy

To protect client privacy, Hikmah **never stores raw hardware identifiers**:
- International Mobile Equipment Identity (IMEI)
- International Mobile Subscriber Identity (IMSI)
- Mobile Station International Subscriber Directory Number (MSISDN / phone number)
- Wi-Fi or Bluetooth Media Access Control (MAC) addresses

### One-Way Salted SHA-256
When a device registers or submits telemetry, the raw identifier is transformed immediately:
$$\text{deviceIdHash} = \text{SHA-256}(\text{clientIdentifier} \mathbin{\Vert} \text{SYSTEM\_DEVICE\_SALT})$$

Raw identifiers are dropped from RAM immediately after hashing and are never logged or stored in Supabase.

---

## 2. Explicit Consent Lifecycle

Device authorization is governed by `ConsentManager`:

```
           ┌───────────┐
           │  PENDING  │  (Registered, awaiting opt-in confirmation)
           └─────┬─────┘
                 │ User Grants Consent
                 ▼
           ┌───────────┐
      ┌───►│  GRANTED  │  (Ingestion pipeline accepts telemetry packets)
      │    └─────┬─────┘
User  │          │ User Revokes Consent OR Retention Expires
Re-   │          ▼
grants│    ┌───────────┐
      └────┤  REVOKED  │  (Ingestion pipeline discards telemetry immediately)
           └───────────┘
```

### Ingestion Pipeline Enforcement
Before processing any telemetry packet, `ObservationIngestionPipeline` verifies:
```typescript
const isPermitted = await consentManager.verifyConsent(packet.deviceIdHash);
if (!isPermitted) {
  throw new PrivacyConsentError(`Packet rejected: Device ${packet.deviceIdHash.slice(0, 8)}... has no active GRANTED consent.`);
}
```

---

## 3. Right to Be Forgotten & Auto-Purging

- **Data Retention Policies**: Configurable retention limits (7, 14, 30, or 90 days).
- **Scheduled Auto-Purge**: Telemetry older than the configured `retentionDays` is deleted by background cleanup jobs.
- **On-Demand Purge**: Users can trigger full deletion of all historical telemetry for a device hash at any time via the Control Center or the `geointel_purge_device_data` MCP tool.
