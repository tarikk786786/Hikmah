import { createHash } from 'crypto';
import { DeviceConsent } from './types.js';

export class ConsentManager {
  private static instance: ConsentManager;
  private consents: Map<string, DeviceConsent> = new Map(); // deviceIdHash -> DeviceConsent

  public static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  /**
   * Hashes raw device identifier (IMEI, MAC, serial) using SHA-256 with project salt
   * to guarantee raw hardware identities are never stored in plain text.
   */
  public hashDeviceId(rawId: string, salt = 'hikmah_salt_2026'): string {
    return createHash('sha256').update(`${salt}:${rawId.trim()}`).digest('hex');
  }

  public grantConsent(
    deviceIdHash: string,
    userId: string,
    collectionTypes: string[] = ['CELL', 'GPS'],
    deviceAlias?: string,
    retentionDays = 90
  ): DeviceConsent {
    const consent: DeviceConsent = {
      deviceIdHash,
      userId,
      deviceAlias,
      consentState: 'GRANTED',
      grantedAt: new Date().toISOString(),
      collectionTypes,
      retentionDays
    };

    this.consents.set(deviceIdHash, consent);
    return { ...consent };
  }

  public revokeConsent(deviceIdHash: string): boolean {
    const existing = this.consents.get(deviceIdHash);
    if (!existing) return false;

    existing.consentState = 'REVOKED';
    existing.revokedAt = new Date().toISOString();
    return true;
  }

  public hasValidConsent(deviceIdHash: string): boolean {
    const consent = this.consents.get(deviceIdHash);
    if (!consent) return false;
    return consent.consentState === 'GRANTED';
  }

  public getConsent(deviceIdHash: string): DeviceConsent | null {
    const consent = this.consents.get(deviceIdHash);
    return consent ? { ...consent } : null;
  }

  public listConsents(userId?: string): DeviceConsent[] {
    let list = Array.from(this.consents.values());
    if (userId) {
      list = list.filter((c) => c.userId === userId);
    }
    return list.map((c) => ({ ...c }));
  }

  public clear(): void {
    this.consents.clear();
  }
}
