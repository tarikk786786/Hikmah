import { SkillLifecycleState } from '../manifests/types.js';

export type KillSwitchAction = 'ENABLE' | 'DISABLE' | 'QUARANTINE' | 'DELETE';

export interface KillSwitchRecord {
  skillId: string;
  action: KillSwitchAction;
  reason: string;
  timestamp: string;
  actor: string;
  evidence?: Record<string, any>;
}

export class SkillKillSwitch {
  private static instance: SkillKillSwitch;
  private history: KillSwitchRecord[] = [];
  private skillStates: Map<string, SkillLifecycleState> = new Map();
  private listeners: Array<(record: KillSwitchRecord) => void> = [];

  public static getInstance(): SkillKillSwitch {
    if (!SkillKillSwitch.instance) {
      SkillKillSwitch.instance = new SkillKillSwitch();
    }
    return SkillKillSwitch.instance;
  }

  public registerListener(fn: (record: KillSwitchRecord) => void): void {
    this.listeners.push(fn);
  }

  public getSkillState(skillId: string): SkillLifecycleState | undefined {
    return this.skillStates.get(skillId);
  }

  public setSkillState(skillId: string, state: SkillLifecycleState): void {
    this.skillStates.set(skillId, state);
  }

  public quarantine(skillId: string, reason: string, evidence?: Record<string, any>, actor = 'SYSTEM_POLICY_ENGINE'): KillSwitchRecord {
    const record: KillSwitchRecord = {
      skillId,
      action: 'QUARANTINE',
      reason,
      timestamp: new Date().toISOString(),
      actor,
      evidence,
    };

    this.skillStates.set(skillId, 'QUARANTINED');
    this.history.push(record);
    this.notify(record);
    return record;
  }

  public disable(skillId: string, reason: string, actor = 'USER'): KillSwitchRecord {
    const record: KillSwitchRecord = {
      skillId,
      action: 'DISABLE',
      reason,
      timestamp: new Date().toISOString(),
      actor,
    };

    this.skillStates.set(skillId, 'VALIDATED');
    this.history.push(record);
    this.notify(record);
    return record;
  }

  public enable(skillId: string, reason = 'Administrative activation', actor = 'USER'): KillSwitchRecord {
    const record: KillSwitchRecord = {
      skillId,
      action: 'ENABLE',
      reason,
      timestamp: new Date().toISOString(),
      actor,
    };

    this.skillStates.set(skillId, 'ENABLED');
    this.history.push(record);
    this.notify(record);
    return record;
  }

  public delete(skillId: string, reason = 'Skill uninstalled', actor = 'USER'): KillSwitchRecord {
    const record: KillSwitchRecord = {
      skillId,
      action: 'DELETE',
      reason,
      timestamp: new Date().toISOString(),
      actor,
    };

    this.skillStates.set(skillId, 'REMOVED');
    this.history.push(record);
    this.notify(record);
    return record;
  }

  public getHistory(skillId?: string): KillSwitchRecord[] {
    if (skillId) {
      return this.history.filter(h => h.skillId === skillId);
    }
    return [...this.history];
  }

  private notify(record: KillSwitchRecord): void {
    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch (err) {
        console.error(`[SkillKillSwitch] Listener error on action ${record.action}:`, err);
      }
    }
  }
}
