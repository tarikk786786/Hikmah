import { describe, it, expect, beforeEach } from 'vitest';
import { GeolocationEngine } from '../core/geointel/engine.js';
import { CellObservation } from '../core/geointel/types.js';

describe('GeolocationEngine', () => {
  let engine: GeolocationEngine;

  beforeEach(() => {
    engine = new GeolocationEngine();
  });

  it('should throw error if observations array is empty', async () => {
    await expect(engine.estimateLocation([])).rejects.toThrow(
      /requires at least one cell observation/
    );
  });

  it('should short-circuit and return high confidence when GPS ground truth is present', async () => {
    const obsWithGps: CellObservation = {
      id: 'obs_gps_1',
      userId: 'user_test',
      deviceIdHash: 'dev_hash_1',
      timestamp: '2026-09-16T10:00:00Z',
      latitude: 37.774929,
      longitude: -122.419416,
      accuracy: 12, // GPS fix with < 50m accuracy
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE',
      signalStrengthDbm: -78,
      source: 'neostumbler',
      fingerprint: 'fp_gps_1',
      quality: 'VALIDATED'
    };

    const estimate = await engine.estimateLocation([obsWithGps]);

    expect(estimate.confidence).toBeGreaterThanOrEqual(95);
    expect(estimate.latitude).toBeCloseTo(37.774929, 4);
    expect(estimate.longitude).toBeCloseTo(-122.419416, 4);
    expect(estimate.accuracyRadiusMeters).toBe(12);
    expect(estimate.sources).toContain('Authorized Device Satellite GPS Receiver');
  });

  it('should fuse multiple cell observations using RF triangulation when GPS is absent', async () => {
    const rfObservations: CellObservation[] = [
      {
        id: 'obs_rf_1',
        userId: 'user_test',
        deviceIdHash: 'dev_hash_2',
        timestamp: '2026-09-16T10:05:00Z',
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE',
        signalStrengthDbm: -72,
        source: 'hikmah_mobile',
        fingerprint: 'fp_rf_1',
        quality: 'VALIDATED'
      },
      {
        id: 'obs_rf_2',
        userId: 'user_test',
        deviceIdHash: 'dev_hash_2',
        timestamp: '2026-09-16T10:05:00Z',
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 49201,
        radio: 'NR',
        signalStrengthDbm: -85,
        source: 'hikmah_mobile',
        fingerprint: 'fp_rf_2',
        quality: 'VALIDATED'
      }
    ];

    const estimate = await engine.estimateLocation(rfObservations);

    expect(estimate.latitude).toBeDefined();
    expect(estimate.longitude).toBeDefined();
    expect(estimate.accuracyRadiusMeters).toBeGreaterThan(0);
    expect(estimate.confidence).toBeGreaterThan(0);
    expect(estimate.sources.length).toBeGreaterThan(0);
  });
});
