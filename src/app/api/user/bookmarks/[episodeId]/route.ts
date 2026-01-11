import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { removeBookmark, isBookmarked } from '@/lib/user-actions';
import { ensureDb } from '@/lib/db';

// Check if episode is bookmarked
export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { episodeId } = await params;
    const bookmarked = await isBookmarked(user.id, episodeId);

    return NextResponse.json({ is_bookmarked: bookmarked });
  } catch (error) {
    console.error('Check bookmark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove a bookmark
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { episodeId } = await params;
    const deleted = await removeBookmark(user.id, episodeId);

    if (!deleted) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
