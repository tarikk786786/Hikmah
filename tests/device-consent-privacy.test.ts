import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentManager } from '../core/geointel/consent.js';

describe('DeviceConsentManager & Privacy Boundary', () => {
  let consentManager: ConsentManager;

  beforeEach(() => {
    consentManager = new ConsentManager();
    consentManager.clear();
  });

  it('should hash raw identifiers deterministically into SHA-256 strings', () => {
    const rawImei = '860123456789012';
    const hash1 = consentManager.hashDeviceId(rawImei);
    const hash2 = consentManager.hashDeviceId(rawImei);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 64 hex characters
    expect(hash1).not.toContain(rawImei); // Raw IMEI is never visible in hash
  });

  it('should produce different hashes for different salts or device IDs', () => {
    const hashA = consentManager.hashDeviceId('device_alpha', 'salt_1');
    const hashB = consentManager.hashDeviceId('device_alpha', 'salt_2');
    const hashC = consentManager.hashDeviceId('device_beta', 'salt_1');

    expect(hashA).not.toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('should grant consent and verify valid consent state', () => {
    const rawId = 'client-phone-001';
    const hash = consentManager.hashDeviceId(rawId);

    expect(consentManager.hasValidConsent(hash)).toBe(false);

    const consent = consentManager.grantConsent(
      hash,
      'usr_123',
      ['CELL', 'GPS'],
      'Pixel 7a',
      30
    );

    expect(consent.consentState).toBe('GRANTED');
    expect(consent.deviceAlias).toBe('Pixel 7a');
    expect(consentManager.hasValidConsent(hash)).toBe(true);

    const fetched = consentManager.getConsent(hash);
    expect(fetched?.consentState).toBe('GRANTED');
  });

  it('should immediately revoke consent and block subsequent checks', () => {
    const hash = consentManager.hashDeviceId('device_revocation_test');
    consentManager.grantConsent(hash, 'usr_123');

    expect(consentManager.hasValidConsent(hash)).toBe(true);

    const revoked = consentManager.revokeConsent(hash);
    expect(revoked).toBe(true);

    expect(consentManager.hasValidConsent(hash)).toBe(false);
    const fetched = consentManager.getConsent(hash);
    expect(fetched?.consentState).toBe('REVOKED');
    expect(fetched?.revokedAt).toBeDefined();
  });

  it('should list and filter consents by user ID', () => {
    const hash1 = consentManager.hashDeviceId('dev_1');
    const hash2 = consentManager.hashDeviceId('dev_2');
    const hash3 = consentManager.hashDeviceId('dev_3');

    consentManager.grantConsent(hash1, 'user_A', ['CELL']);
    consentManager.grantConsent(hash2, 'user_A', ['CELL', 'GPS']);
    consentManager.grantConsent(hash3, 'user_B', ['GPS']);

    const all = consentManager.listConsents();
    expect(all.length).toBe(3);

    const userAConsents = consentManager.listConsents('user_A');
    expect(userAConsents.length).toBe(2);
    expect(userAConsents.map((c) => c.deviceIdHash)).toContain(hash1);
    expect(userAConsents.map((c) => c.deviceIdHash)).toContain(hash2);
  });
});
