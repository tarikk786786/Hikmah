import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCellIdProvider } from '../core/geointel/providers/opencellid.js';
import { CellLookupCache } from '../core/geointel/cache.js';
import { QuotaTracker } from '../core/geointel/quota-tracker.js';

describe('OpenCellIdProvider', () => {
  let cache: CellLookupCache;
  let quota: QuotaTracker;
  let provider: OpenCellIdProvider;

  beforeEach(() => {
    cache = new CellLookupCache();
    cache.clear();
    quota = new QuotaTracker();
    quota.clearDailyUsage();
    quota.setLimit('opencellid', 1000);
    provider = new OpenCellIdProvider(undefined, cache, quota);
  });

  it('should return cell position with mandatory attribution', async () => {
    const result = await provider.getCellPosition({
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE'
    });

    expect(result).not.toBeNull();
    expect(result?.attribution).toBe('Data from OpenCelliD community (CC-BY-SA 4.0)');
    expect(result?.mcc).toBe(310);
    expect(result?.mnc).toBe(410);
    expect(result?.cellId).toBe(28419);
    expect(result?.radio).toBe('LTE');
    expect(result?.latitude).toBeDefined();
    expect(result?.longitude).toBeDefined();
    expect(result?.confidence).toBeGreaterThan(0);
  });

  it('should utilize cache and not increment quota on second lookup', async () => {
    const query = { mcc: 310, mnc: 410, lac: 1402, cellId: 49201, radio: 'NR' as const };

    const initialUsage = quota.getDailyCount('opencellid');
    const firstRes = await provider.getCellPosition(query);
    expect(firstRes).not.toBeNull();
    expect(quota.getDailyCount('opencellid')).toBe(initialUsage + 1);

    // Second call should hit cache and NOT consume additional quota
    const secondRes = await provider.getCellPosition(query);
    expect(secondRes).not.toBeNull();
    expect(secondRes?.id).toBe(firstRes?.id);
    expect(quota.getDailyCount('opencellid')).toBe(initialUsage + 1);
  });

  it('should search cells in bounding box with max 50 limit and attribution', async () => {
    const res = await provider.getCellsInArea({
      bbox: {
        minLat: 37.7,
        minLon: -122.5,
        maxLat: 37.8,
        maxLon: -122.4
      },
      limit: 100 // Requesting 100 should be capped at 50
    });

    expect(res.attribution).toBe('Data from OpenCelliD community (CC-BY-SA 4.0)');
    expect(res.cells.length).toBeLessThanOrEqual(50);
    expect(res.cells.length).toBeGreaterThan(0);
    expect(res.cells[0].attribution).toBe('Data from OpenCelliD community (CC-BY-SA 4.0)');
  });

  it('should reject bounding box with invalid coordinates', async () => {
    await expect(
      provider.getCellsInArea({
        bbox: {
          minLat: 40.0,
          minLon: -120.0,
          maxLat: 30.0, // min > max
          maxLon: -122.0
        }
      })
    ).rejects.toThrow(/Invalid BoundingBox/);
  });

  it('should throw error when daily quota is exhausted', async () => {
    quota.setLimit('opencellid', 2);
    quota.recordUsage('opencellid', 'cell/get', 2);

    await expect(
      provider.getCellPosition({
        mcc: 310,
        mnc: 410,
        lac: 9999,
        cellId: 11111,
        radio: 'LTE'
      })
    ).rejects.toThrow(/OpenCelliD daily quota exceeded/);
  });
});
