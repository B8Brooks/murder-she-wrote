import { NextResponse } from 'next/server';
import { searchSettings } from '@/lib/episodes';
import { ensureDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const settings = await searchSettings(query, Math.min(limit, 50));

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
