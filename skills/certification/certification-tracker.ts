import { SkillCertificationStatus, UniversalSkillManifest } from '../manifests/types.js';

export interface CertificationHistoryEntry {
  skillId: string;
  fromStatus: SkillCertificationStatus;
  toStatus: SkillCertificationStatus;
  reason: string;
  actor: string;
  timestamp: string;
}

export class SkillCertificationTracker {
  private static instance: SkillCertificationTracker;
  private history: CertificationHistoryEntry[] = [];
  private skillStatuses: Map<string, SkillCertificationStatus> = new Map();

  public static getInstance(): SkillCertificationTracker {
    if (!SkillCertificationTracker.instance) {
      SkillCertificationTracker.instance = new SkillCertificationTracker();
    }
    return SkillCertificationTracker.instance;
  }

  public getStatus(skillId: string): SkillCertificationStatus {
    return this.skillStatuses.get(skillId) || 'UNVERIFIED';
  }

  public advanceCertification(
    manifest: UniversalSkillManifest,
    targetStatus: SkillCertificationStatus,
    reason: string,
    actor = 'SYSTEM'
  ): { success: boolean; currentStatus: SkillCertificationStatus; error?: string } {
    const current = this.getStatus(manifest.id);

    // Validation rules for state machine progression
    if (targetStatus === 'SCANNED' && current !== 'UNVERIFIED') {
      // allow re-scanning
    } else if (targetStatus === 'TESTED' && current !== 'SCANNED' && current !== 'UNVERIFIED') {
      // can test after scan
    } else if (targetStatus === 'CERTIFIED') {
      // Must be tested or reviewed before certification
      if (current !== 'REVIEWED' && current !== 'TESTED') {
        return {
          success: false,
          currentStatus: current,
          error: `Cannot certify skill '${manifest.id}' directly from '${current}'. Must pass REVIEWED or TESTED first.`,
        };
      }
    }

    this.skillStatuses.set(manifest.id, targetStatus);
    manifest.certification = targetStatus;

    this.history.push({
      skillId: manifest.id,
      fromStatus: current,
      toStatus: targetStatus,
      reason,
      actor,
      timestamp: new Date().toISOString(),
    });

    return { success: true, currentStatus: targetStatus };
  }

  public getHistory(skillId: string): CertificationHistoryEntry[] {
    return this.history.filter(h => h.skillId === skillId);
  }
}
