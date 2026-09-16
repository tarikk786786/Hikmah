import { NextRequest, NextResponse } from 'next/server';
import { BackupEngine } from '@/storage/core/backup/backup-engine';
import { BackupType } from '@/storage/core/types';

const backupEngine = BackupEngine.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'DATABASE', name, encrypt = true } = body;

    const manifest = await backupEngine.createBackup({
      type: type as BackupType,
      name,
      encrypt
    });

    return NextResponse.json(manifest, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const backups = backupEngine.listBackups();
    return NextResponse.json({ backups, count: backups.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
