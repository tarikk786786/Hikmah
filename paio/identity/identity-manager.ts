import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';

export type UserRole = 'owner' | 'admin' | 'operator' | 'observer' | 'guest';

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  role: UserRole;
  isDefault: boolean;
  avatarUrl?: string;
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    privacyMode?: 'normal' | 'private' | 'offline' | 'air-gapped';
    locale?: string;
    timezone?: string;
    preferredModel?: string;
    voiceEnabled?: boolean;
    autoApproveSafeActions?: boolean;
    notificationsEnabled?: boolean;
  };
  contextBudgetTokens: number;
  activeProjectId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedIdentityDevice {
  id: string;
  userId: string;
  profileId?: string;
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'server' | 'edge';
  platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
  clientVersion: string;
  ipAddress?: string;
  lastSeenAt: string;
  isTrusted: boolean;
  capabilities: string[];
}

export class IdentityManager {
  private static instance: IdentityManager;
  private profiles: Map<string, UserProfile> = new Map();
  private devices: Map<string, ConnectedIdentityDevice> = new Map();
  private activeProfileId: string | null = null;
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedDefaultProfile();
  }

  public static getInstance(): IdentityManager {
    if (!IdentityManager.instance) {
      IdentityManager.instance = new IdentityManager();
    }
    return IdentityManager.instance;
  }

  private seedDefaultProfile(): void {
    const defaultProfile: UserProfile = {
      id: 'prof_default_owner',
      userId: 'user_master_owner',
      name: 'Primary Executive Profile',
      slug: 'personal-executive',
      description: 'Default primary owner profile for Hikmah PAIOS',
      role: 'owner',
      isDefault: true,
      preferences: {
        theme: 'dark',
        privacyMode: 'normal',
        locale: 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        preferredModel: 'claude-3-7-sonnet',
        voiceEnabled: true,
        autoApproveSafeActions: true,
        notificationsEnabled: true,
      },
      contextBudgetTokens: 128000,
      metadata: { seeded: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(defaultProfile.id, defaultProfile);
    this.activeProfileId = defaultProfile.id;
  }

  public getActiveProfile(): UserProfile {
    if (this.activeProfileId && this.profiles.has(this.activeProfileId)) {
      return this.profiles.get(this.activeProfileId)!;
    }
    const first = Array.from(this.profiles.values())[0];
    if (first) {
      this.activeProfileId = first.id;
      return first;
    }
    this.seedDefaultProfile();
    return this.profiles.get('prof_default_owner')!;
  }

  public setActiveProfile(profileId: string): UserProfile {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }
    this.activeProfileId = profileId;
    this.bus.emit({
      type: 'identity.profile_switched',
      source: 'IdentityManager',
      userId: profile.userId,
      data: { profileId, slug: profile.slug, name: profile.name },
    });
    return profile;
  }

  public createProfile(params: {
    userId: string;
    name: string;
    slug: string;
    description?: string;
    role?: UserRole;
    isDefault?: boolean;
    preferences?: Partial<UserProfile['preferences']>;
  }): UserProfile {
    const id = `prof_${crypto.randomBytes(6).toString('hex')}`;
    const newProfile: UserProfile = {
      id,
      userId: params.userId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      role: params.role || 'operator',
      isDefault: !!params.isDefault,
      preferences: {
        theme: 'dark',
        privacyMode: 'normal',
        locale: 'en-US',
        timezone: 'UTC',
        ...params.preferences,
      },
      contextBudgetTokens: 100000,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (newProfile.isDefault) {
      for (const p of this.profiles.values()) {
        if (p.userId === params.userId) {
          p.isDefault = false;
        }
      }
    }

    this.profiles.set(id, newProfile);
    this.bus.emit({
      type: 'identity.profile_created',
      source: 'IdentityManager',
      userId: params.userId,
      data: { profileId: id, name: newProfile.name },
    });
    return newProfile;
  }

  public listProfiles(userId?: string): UserProfile[] {
    const list = Array.from(this.profiles.values());
    return userId ? list.filter(p => p.userId === userId) : list;
  }

  public updateProfilePreferences(
    profileId: string,
    updates: Partial<UserProfile['preferences']>
  ): UserProfile {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found.`);
    }
    profile.preferences = { ...profile.preferences, ...updates };
    profile.updatedAt = new Date().toISOString();
    this.bus.emit({
      type: 'identity.preferences_updated',
      source: 'IdentityManager',
      userId: profile.userId,
      data: { profileId, preferences: profile.preferences },
    });
    return profile;
  }

  public registerDevice(device: Omit<ConnectedIdentityDevice, 'id' | 'lastSeenAt'>): ConnectedIdentityDevice {
    const id = `dev_${crypto.randomBytes(6).toString('hex')}`;
    const fullDevice: ConnectedIdentityDevice = {
      ...device,
      id,
      lastSeenAt: new Date().toISOString(),
    };
    this.devices.set(id, fullDevice);
    this.bus.emit({
      type: 'identity.device_registered',
      source: 'IdentityManager',
      userId: device.userId,
      data: { deviceId: id, deviceName: device.deviceName, platform: device.platform },
    });
    return fullDevice;
  }

  public listDevices(userId?: string): ConnectedIdentityDevice[] {
    const list = Array.from(this.devices.values());
    return userId ? list.filter(d => d.userId === userId) : list;
  }

  public heartbeatDevice(deviceId: string): void {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.lastSeenAt = new Date().toISOString();
    }
  }
}
