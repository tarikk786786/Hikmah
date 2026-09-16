export interface UserSkillPreference {
  userId: string;
  skillId: string;
  preference: 'PREFERRED' | 'REJECTED' | 'NEUTRAL';
  updatedAt: string;
}

export interface TaskSkillMemoryEntry {
  userId: string;
  taskType: string;
  skillId: string;
  success: boolean;
  timestamp: string;
  notes?: string;
}

export class PersonalSkillMemory {
  private static instance: PersonalSkillMemory;
  private preferences: Map<string, UserSkillPreference[]> = new Map();
  private taskHistory: TaskSkillMemoryEntry[] = [];

  public static getInstance(): PersonalSkillMemory {
    if (!PersonalSkillMemory.instance) {
      PersonalSkillMemory.instance = new PersonalSkillMemory();
    }
    return PersonalSkillMemory.instance;
  }

  public recordPreference(userId: string, skillId: string, preference: 'PREFERRED' | 'REJECTED' | 'NEUTRAL'): void {
    const userPrefs = this.preferences.get(userId) || [];
    const existingIndex = userPrefs.findIndex(p => p.skillId === skillId);
    const entry: UserSkillPreference = {
      userId,
      skillId,
      preference,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      userPrefs[existingIndex] = entry;
    } else {
      userPrefs.push(entry);
    }
    this.preferences.set(userId, userPrefs);
  }

  public isSkillRejected(userId: string, skillId: string): boolean {
    const userPrefs = this.preferences.get(userId);
    return userPrefs?.some(p => p.skillId === skillId && p.preference === 'REJECTED') || false;
  }

  public isSkillPreferred(userId: string, skillId: string): boolean {
    const userPrefs = this.preferences.get(userId);
    return userPrefs?.some(p => p.skillId === skillId && p.preference === 'PREFERRED') || false;
  }

  public recordTaskOutcome(userId: string, taskType: string, skillId: string, success: boolean, notes?: string): void {
    this.taskHistory.push({
      userId,
      taskType: taskType.toLowerCase(),
      skillId,
      success,
      timestamp: new Date().toISOString(),
      notes,
    });
  }

  public getBestSkillForTask(userId: string, taskType: string): string | undefined {
    const relevant = this.taskHistory.filter(
      h => h.userId === userId && h.taskType === taskType.toLowerCase() && h.success
    );
    if (relevant.length === 0) return undefined;

    // Count occurrences of successful skills
    const counts: Record<string, number> = {};
    for (const r of relevant) {
      counts[r.skillId] = (counts[r.skillId] || 0) + 1;
    }

    // Return skill with most successes that isn't rejected
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    for (const [sId] of sorted) {
      if (!this.isSkillRejected(userId, sId)) {
        return sId;
      }
    }
    return undefined;
  }
}
