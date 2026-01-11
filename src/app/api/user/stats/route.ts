import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserStats } from '@/lib/user-actions';
import { ensureDb } from '@/lib/db';

export async function GET() {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getUserStats(user.id);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
