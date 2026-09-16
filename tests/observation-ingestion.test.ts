import { describe, it, expect, beforeEach } from 'vitest';
import { ObservationIngestionPipeline } from '../core/geointel/ingestion.js';
import { ConsentManager } from '../core/geointel/consent.js';

describe('ObservationIngestionPipeline', () => {
  let consentManager: ConsentManager;
  let pipeline: ObservationIngestionPipeline;
  const authorizedDeviceHash = 'auth_dev_hash_1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(() => {
    consentManager = new ConsentManager();
    consentManager.clear();
    consentManager.grantConsent(authorizedDeviceHash, 'usr_pilot', ['CELL', 'GPS']);
    pipeline = new ObservationIngestionPipeline(consentManager);
    pipeline.clear();
  });

  it('should reject telemetry from devices without active consent', async () => {
    const unconsentedHash = 'unconsented_dev_hash_9999999999999999999999999999999999999999';

    await expect(
      pipeline.ingest({
        deviceIdHash: unconsentedHash,
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE'
      })
    ).rejects.toThrow(/does not have active consent granted/);
  });

  it('should ingest valid telemetry from an authorized device', async () => {
    const result = await pipeline.ingest({
      deviceIdHash: authorizedDeviceHash,
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE',
      signalStrengthDbm: -75,
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.observation.id).toBeDefined();
    expect(result.observation.deviceIdHash).toBe(authorizedDeviceHash);
    expect(result.observation.quality).toBe('VALIDATED');
    expect(result.observation.signalStrengthDbm).toBe(-75);
  });

  it('should reject coordinates outside of valid WGS84 boundaries', async () => {
    await expect(
      pipeline.ingest({
        deviceIdHash: authorizedDeviceHash,
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE',
        latitude: 105.0 // Invalid > 90
      })
    ).rejects.toThrow(/Invalid latitude/);

    await expect(
      pipeline.ingest({
        deviceIdHash: authorizedDeviceHash,
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE',
        longitude: -195.0 // Invalid < -180
      })
    ).rejects.toThrow(/Invalid longitude/);
  });

  it('should reject invalid cellular parameters (MCC/CellId)', async () => {
    await expect(
      pipeline.ingest({
        deviceIdHash: authorizedDeviceHash,
        mcc: 45, // Invalid MCC < 100
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE'
      })
    ).rejects.toThrow(/Invalid MCC/);

    await expect(
      pipeline.ingest({
        deviceIdHash: authorizedDeviceHash,
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: -5, // Invalid CellId <= 0
        radio: 'LTE'
      })
    ).rejects.toThrow(/Invalid CellId/);
  });

  it('should deduplicate repeated identical observations within a 1-minute time window', async () => {
    const timeIso = '2026-09-16T10:00:15.000Z';
    const first = await pipeline.ingest({
      deviceIdHash: authorizedDeviceHash,
      timestamp: timeIso,
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE',
      signalStrengthDbm: -80
    });
    expect(first.isDuplicate).toBe(false);

    // Repeated observation within the same minute window (10:00:45)
    const second = await pipeline.ingest({
      deviceIdHash: authorizedDeviceHash,
      timestamp: '2026-09-16T10:00:45.000Z',
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE',
      signalStrengthDbm: -80
    });
    expect(second.isDuplicate).toBe(true);
    expect(second.observation.id).toBe(first.observation.id);
  });

  it('should purge all device telemetry on right-to-be-forgotten request', async () => {
    await pipeline.ingest({
      deviceIdHash: authorizedDeviceHash,
      timestamp: '2026-09-16T10:00:00Z',
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE'
    });

    await pipeline.ingest({
      deviceIdHash: authorizedDeviceHash,
      timestamp: '2026-09-16T10:05:00Z',
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 49201,
      radio: 'NR'
    });

    expect(pipeline.listObservations(authorizedDeviceHash).length).toBe(2);

    const deleted = pipeline.purgeDeviceData(authorizedDeviceHash);
    expect(deleted).toBe(2);
    expect(pipeline.listObservations(authorizedDeviceHash).length).toBe(0);
  });
});
