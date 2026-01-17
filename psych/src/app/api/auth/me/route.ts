import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ensureDb } from '@/lib/db';

export async function GET() {
  try {
    await ensureDb();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
