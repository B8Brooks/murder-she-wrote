import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { removeRating, getUserRating } from '@/lib/user-actions';
import { ensureDb } from '@/lib/db';

// Get rating for a specific episode
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
    const rating = await getUserRating(user.id, episodeId);

    return NextResponse.json({ rating });
  } catch (error) {
    console.error('Get rating error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a rating
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
    const deleted = await removeRating(user.id, episodeId);

    if (!deleted) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete rating error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
