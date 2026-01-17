import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { bookmarkEpisode, getUserBookmarks } from '@/lib/user-actions';
import { ensureDb } from '@/lib/db';

// Get all bookmarks for current user
export async function GET(request: Request) {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getUserBookmarks(user.id, Math.min(limit, 100), offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get bookmarks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a bookmark
export async function POST(request: Request) {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { episode_id } = body;

    if (!episode_id) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 });
    }

    const bookmark = await bookmarkEpisode(user.id, episode_id);

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error('Create bookmark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
