import { NextRequest, NextResponse } from 'next/server';
import { NotificationCenter } from '@/paio/notifications/notification-center';

export async function GET() {
  try {
    const center = NotificationCenter.getInstance();
    const notifications = center.list();
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const center = NotificationCenter.getInstance();

    if (body.action === 'mark_read') {
      const ok = center.markAsRead(body.notificationId);
      return NextResponse.json({ success: ok });
    }

    if (body.action === 'dismiss') {
      const ok = center.dismiss(body.notificationId);
      return NextResponse.json({ success: ok });
    }

    const notif = center.send({
      title: body.title,
      body: body.body,
      priority: body.priority,
      category: body.category,
    });

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process notification' }, { status: 500 });
  }
}
