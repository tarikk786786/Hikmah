import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CellObservation, RadioType, ObservationQuality } from './types.js';
import { ConsentManager } from './consent.js';
import { EventBus } from '../events/event-bus.js';

export interface IngestObservationInput {
  userId?: string;
  deviceIdHash: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  mcc: number;
  mnc: number;
  lac: number;
  tac?: number;
  cellId: number;
  radio: RadioType;
  pci?: number;
  psc?: number;
  signalStrengthDbm?: number;
  timingAdvance?: number;
  source?: 'neostumbler' | 'hikmah_mobile' | 'manual';
  metadata?: Record<string, unknown>;
}

export class ObservationIngestionPipeline {
  private consentManager: ConsentManager;
  private eventBus: EventBus;
  private observations: Map<string, CellObservation> = new Map(); // id -> observation
  private fingerprints: Map<string, string> = new Map(); // fingerprint -> observationId

  constructor(consentManager?: ConsentManager, eventBus?: EventBus) {
    this.consentManager = consentManager || ConsentManager.getInstance();
    this.eventBus = eventBus || EventBus.getInstance();
  }

  public generateFingerprint(input: IngestObservationInput, timestampIso: string): string {
    // Truncate timestamp to 1-minute window to coalesce identical repeated observations
    const epochMinutes = Math.floor(new Date(timestampIso).getTime() / 60000);
    const key = `${input.deviceIdHash}:${epochMinutes}:${input.mcc}:${input.mnc}:${input.lac}:${input.cellId}:${input.radio}`;
    return createHash('sha256').update(key).digest('hex');
  }

  public async ingest(input: IngestObservationInput): Promise<{ observation: CellObservation; isDuplicate: boolean }> {
    // 1. Consent Gatekeeper
    if (!this.consentManager.hasValidConsent(input.deviceIdHash)) {
      throw new Error(
        `Rejected telemetry: Device [${input.deviceIdHash.substring(0, 8)}...] does not have active consent granted.`
      );
    }

    // 2. Validate Coordinate Ranges if present
    if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
      throw new Error(`Invalid latitude [${input.latitude}]: Must be between -90 and 90`);
    }
    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
      throw new Error(`Invalid longitude [${input.longitude}]: Must be between -180 and 180`);
    }

    // 3. Validate Identifiers
    if (input.mcc < 100 || input.mcc > 999) {
      throw new Error(`Invalid MCC [${input.mcc}]: Must be 3-digit number`);
    }
    if (input.mnc < 0 || input.mnc > 999) {
      throw new Error(`Invalid MNC [${input.mnc}]`);
    }
    if (input.cellId <= 0) {
      throw new Error(`Invalid CellId [${input.cellId}]: Must be positive integer`);
    }

    const timestamp = input.timestamp || new Date().toISOString();
    const fingerprint = this.generateFingerprint(input, timestamp);

    // 4. Anti-Duplication Check
    const existingId = this.fingerprints.get(fingerprint);
    if (existingId) {
      const existing = this.observations.get(existingId)!;
      return { observation: { ...existing }, isDuplicate: true };
    }

    const observation: CellObservation = {
      id: `obs_${uuidv4().substring(0, 8)}`,
      userId: input.userId || 'usr_default',
      deviceIdHash: input.deviceIdHash,
      timestamp,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      mcc: input.mcc,
      mnc: input.mnc,
      lac: input.lac,
      tac: input.tac,
      cellId: input.cellId,
      radio: input.radio,
      pci: input.pci,
      psc: input.psc,
      signalStrengthDbm: input.signalStrengthDbm,
      timingAdvance: input.timingAdvance,
      source: input.source || 'hikmah_mobile',
      fingerprint,
      quality: 'VALIDATED',
      metadata: input.metadata
    };

    this.observations.set(observation.id, observation);
    this.fingerprints.set(fingerprint, observation.id);

    this.eventBus.emit({
      event: 'FILE_CREATED', // Using existing event or generic notification
      riskLevel: 'LOW',
      correlation: { observationId: observation.id, userId: observation.userId },
      payload: {
        type: 'CELL_OBSERVATION',
        cellId: observation.cellId,
        mcc: observation.mcc,
        mnc: observation.mnc,
        radio: observation.radio
      }
    });

    return { observation: { ...observation }, isDuplicate: false };
  }

  public getObservation(id: string): CellObservation | null {
    const obs = this.observations.get(id);
    return obs ? { ...obs } : null;
  }

  public listObservations(deviceIdHash?: string): CellObservation[] {
    let list = Array.from(this.observations.values());
    if (deviceIdHash) {
      list = list.filter((o) => o.deviceIdHash === deviceIdHash);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public purgeDeviceData(deviceIdHash: string): number {
    let deletedCount = 0;
    for (const [id, obs] of this.observations.entries()) {
      if (obs.deviceIdHash === deviceIdHash) {
        this.observations.delete(id);
        deletedCount++;
      }
    }
    for (const [fp, id] of this.fingerprints.entries()) {
      if (!this.observations.has(id)) {
        this.fingerprints.delete(fp);
      }
    }
    return deletedCount;
  }

  public clear(): void {
    this.observations.clear();
    this.fingerprints.clear();
  }
}

