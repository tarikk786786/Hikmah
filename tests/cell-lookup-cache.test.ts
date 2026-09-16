import { describe, it, expect, beforeEach } from 'vitest';
import { CellLookupCache } from '../core/geointel/cache.js';
import { CellRecord } from '../core/geointel/types.js';

describe('CellLookupCache', () => {
  let cache: CellLookupCache;

  beforeEach(() => {
    cache = new CellLookupCache();
    cache.clear();
  });

  it('should generate normalized key with lowercase provider and uppercase radio', () => {
    const key = cache.generateKey('OpenCellID', 'lte', 310, 410, 1402, 28419);
    expect(key).toBe('opencellid:LTE:310:410:1402:28419');
  });

  it('should cache and retrieve a cell record correctly', () => {
    const record: CellRecord = {
      id: 'cell_test_1',
      provider: 'opencellid',
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE',
      latitude: 37.7749,
      longitude: -122.4194,
      rangeMeters: 1000,
      samples: 50,
      confidence: 85,
      attribution: 'Data from OpenCelliD community (CC-BY-SA 4.0)',
      lastSeen: new Date().toISOString()
    };

    cache.set(record);

    const retrieved = cache.get({
      mcc: 310,
      mnc: 410,
      lac: 1402,
      cellId: 28419,
      radio: 'LTE'
    });

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('cell_test_1');
    expect(retrieved?.latitude).toBe(37.7749);
  });

  it('should return null when querying non-existent cell', () => {
    const res = cache.get({
      mcc: 999,
      mnc: 999,
      lac: 999,
      cellId: 999,
      radio: 'GSM'
    });
    expect(res).toBeNull();
  });

  it('should respect TTL expiration', async () => {
    const shortTtlCache = new CellLookupCache(20); // 20ms TTL

    const record: CellRecord = {
      id: 'cell_short_ttl',
      provider: 'opencellid',
      mcc: 310,
      mnc: 260,
      lac: 500,
      cellId: 1234,
      radio: 'NR',
      latitude: 40.7128,
      longitude: -74.0060,
      rangeMeters: 500,
      samples: 10,
      confidence: 90,
      attribution: 'Data from OpenCelliD community (CC-BY-SA 4.0)',
      lastSeen: new Date().toISOString()
    };

    shortTtlCache.set(record, 20);

    const immediate = shortTtlCache.get({ mcc: 310, mnc: 260, lac: 500, cellId: 1234, radio: 'NR' });
    expect(immediate).not.toBeNull();

    // Wait for TTL expiry
    await new Promise((resolve) => setTimeout(resolve, 35));

    const expired = shortTtlCache.get({ mcc: 310, mnc: 260, lac: 500, cellId: 1234, radio: 'NR' });
    expect(expired).toBeNull();
  });

  it('should support wildcard radio matching when query radio is omitted', () => {
    const record: CellRecord = {
      id: 'cell_wildcard',
      provider: 'opencellid',
      mcc: 208,
      mnc: 1,
      lac: 300,
      cellId: 8888,
      radio: 'UMTS',
      latitude: 48.8566,
      longitude: 2.3522,
      rangeMeters: 2000,
      samples: 25,
      confidence: 75,
      attribution: 'Data from OpenCelliD community (CC-BY-SA 4.0)',
      lastSeen: new Date().toISOString()
    };

    cache.set(record);

    const matchWithoutRadio = cache.get({
      mcc: 208,
      mnc: 1,
      lac: 300,
      cellId: 8888
      // radio undefined
    });

    expect(matchWithoutRadio).not.toBeNull();
    expect(matchWithoutRadio?.cellId).toBe(8888);
    expect(matchWithoutRadio?.radio).toBe('UMTS');
  });
});
