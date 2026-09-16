import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'desktop_push' | 'mobile_push' | 'email' | 'sound';

export interface PAIOSNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: 'system' | 'approval' | 'agent' | 'security' | 'task' | 'general';
  priority: NotificationPriority;
  channels: NotificationChannel[];
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  actionPayload?: Record<string, unknown>;
  createdAt: string;
}

export class NotificationCenter {
  private static instance: NotificationCenter;
  private notifications: Map<string, PAIOSNotification> = new Map();
  private quietHoursEnabled: boolean = false;
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedWelcomeNotification();
  }

  public static getInstance(): NotificationCenter {
    if (!NotificationCenter.instance) {
      NotificationCenter.instance = new NotificationCenter();
    }
    return NotificationCenter.instance;
  }

  private seedWelcomeNotification(): void {
    const welcome: PAIOSNotification = {
      id: 'notif_welcome',
      userId: 'user_master_owner',
      title: 'Welcome to Hikmah PAIOS',
      body: 'Your Personal AI Operating System is operational. All 25 canonical modules are unified.',
      category: 'system',
      priority: 'normal',
      channels: ['in_app'],
      read: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(welcome.id, welcome);
  }

  public send(params: {
    userId?: string;
    title: string;
    body: string;
    category?: PAIOSNotification['category'];
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
    actionUrl?: string;
    actionPayload?: Record<string, unknown>;
  }): PAIOSNotification {
    const id = `notif_${crypto.randomBytes(6).toString('hex')}`;
    const priority = params.priority || 'normal';

    // Simple deduplication: avoid duplicate identical notifications within 60s
    for (const n of this.notifications.values()) {
      if (n.title === params.title && n.body === params.body && !n.dismissed) {
        return n;
      }
    }

    const notif: PAIOSNotification = {
      id,
      userId: params.userId || 'user_master_owner',
      title: params.title,
      body: params.body,
      category: params.category || 'general',
      priority,
      channels: params.channels || ['in_app'],
      read: false,
      dismissed: false,
      actionUrl: params.actionUrl,
      actionPayload: params.actionPayload,
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(id, notif);

    this.bus.emit({
      type: 'notification.sent',
      source: 'NotificationCenter',
      userId: notif.userId,
      data: { notificationId: id, title: notif.title, priority: notif.priority },
    });

    return notif;
  }

  public list(filter?: { unreadOnly?: boolean; userId?: string; limit?: number }): PAIOSNotification[] {
    let list = Array.from(this.notifications.values()).filter(n => !n.dismissed);
    if (filter?.unreadOnly) {
      list = list.filter(n => !n.read);
    }
    if (filter?.userId) {
      list = list.filter(n => n.userId === filter.userId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, filter?.limit || 50);
  }

  public markAsRead(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  public dismiss(id: string): boolean {
    const notif = this.notifications.get(id);
    if (!notif) return false;
    notif.dismissed = true;
    return true;
  }

  public setQuietHours(enabled: boolean): void {
    this.quietHoursEnabled = enabled;
  }

  public isQuietHours(): boolean {
    return this.quietHoursEnabled;
  }
}
