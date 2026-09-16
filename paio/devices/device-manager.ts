import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';
import { SessionManager } from '../sessions/session-manager';

export type DeviceType = 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'server' | 'edge';

export interface DeviceTelemetry {
  cpuUsagePercent?: number;
  memoryUsagePercent?: number;
  batteryPercent?: number;
  isCharging?: boolean;
  networkType?: 'wifi' | 'cellular' | 'ethernet' | 'offline';
  ipAddress?: string;
  reportedAt: string;
}

export interface PAIOSDevice {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  platform: 'windows' | 'macos' | 'linux' | 'ios' | 'android';
  status: 'online' | 'idle' | 'offline';
  lastSeenAt: string;
  isCurrentDevice: boolean;
  capabilities: string[];
  telemetry?: DeviceTelemetry;
}

export interface HandoffResult {
  success: boolean;
  sessionId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  checkpointId?: string;
  transferredAt: string;
}

export class DeviceManager {
  private static instance: DeviceManager;
  private devices: Map<string, PAIOSDevice> = new Map();
  private currentDeviceId: string = 'dev_primary_desktop';
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedDefaultDevices();
  }

  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  private seedDefaultDevices(): void {
    const desktop: PAIOSDevice = {
      id: 'dev_primary_desktop',
      userId: 'user_master_owner',
      name: 'Workstation Studio (Windows)',
      type: 'desktop',
      platform: 'windows',
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      isCurrentDevice: true,
      capabilities: ['gpu_acceleration', 'full_filesystem', 'docker', 'audio_input', 'audio_output', 'mcp_gateway'],
      telemetry: {
        cpuUsagePercent: 18,
        memoryUsagePercent: 42,
        networkType: 'ethernet',
        reportedAt: new Date().toISOString(),
      },
    };

    const mobile: PAIOSDevice = {
      id: 'dev_primary_mobile',
      userId: 'user_master_owner',
      name: 'Personal iPhone 16 Pro',
      type: 'mobile',
      platform: 'ios',
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      isCurrentDevice: false,
      capabilities: ['push_notifications', 'biometrics', 'camera', 'microphone', 'location'],
      telemetry: {
        batteryPercent: 88,
        isCharging: false,
        networkType: 'wifi',
        reportedAt: new Date().toISOString(),
      },
    };

    this.devices.set(desktop.id, desktop);
    this.devices.set(mobile.id, mobile);
  }

  public registerDevice(params: Omit<PAIOSDevice, 'id' | 'lastSeenAt'>): PAIOSDevice {
    const id = `dev_${crypto.randomBytes(6).toString('hex')}`;
    const dev: PAIOSDevice = {
      ...params,
      id,
      lastSeenAt: new Date().toISOString(),
    };
    this.devices.set(id, dev);
    this.bus.emit({
      type: 'device.registered',
      source: 'DeviceManager',
      userId: dev.userId,
      data: { deviceId: id, name: dev.name, type: dev.type },
    });
    return dev;
  }

  public getDevice(id: string): PAIOSDevice | undefined {
    return this.devices.get(id);
  }

  public listDevices(userId?: string): PAIOSDevice[] {
    const list = Array.from(this.devices.values());
    return userId ? list.filter(d => d.userId === userId) : list;
  }

  public getCurrentDevice(): PAIOSDevice {
    return this.devices.get(this.currentDeviceId) || Array.from(this.devices.values())[0];
  }

  public setCurrentDevice(deviceId: string): void {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device ${deviceId} not found.`);
    }
    for (const d of this.devices.values()) {
      d.isCurrentDevice = d.id === deviceId;
    }
    this.currentDeviceId = deviceId;
  }

  public updateTelemetry(deviceId: string, telemetry: DeviceTelemetry): void {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.telemetry = telemetry;
      dev.lastSeenAt = new Date().toISOString();
      dev.status = 'online';
    }
  }

  public handoffSession(sessionId: string, targetDeviceId: string): HandoffResult {
    const target = this.devices.get(targetDeviceId);
    if (!target) {
      throw new Error(`Target device ${targetDeviceId} not found.`);
    }

    const sessionMgr = SessionManager.getInstance();
    const session = sessionMgr.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    const sourceDeviceId = session.currentDeviceId || this.currentDeviceId;

    // Save checkpoint before transferring
    const checkpoint = sessionMgr.checkpointSession(sessionId, {
      summary: `Handoff from ${sourceDeviceId} to ${target.name} (${target.id})`,
      stepIndex: session.checkpoints.length + 1,
    });

    // Resume on target device
    sessionMgr.resumeSession(sessionId, targetDeviceId);

    const result: HandoffResult = {
      success: true,
      sessionId,
      sourceDeviceId,
      targetDeviceId,
      checkpointId: checkpoint.id,
      transferredAt: new Date().toISOString(),
    };

    this.bus.emit({
      type: 'device.handoff_completed',
      source: 'DeviceManager',
      data: result,
    });

    return result;
  }
}
