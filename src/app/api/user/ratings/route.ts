import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { rateEpisode, getUserRatings } from '@/lib/user-actions';
import { ratingSchema } from '@/lib/validations';
import { ensureDb } from '@/lib/db';

// Get all ratings for current user
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

    const result = await getUserRatings(user.id, Math.min(limit, 100), offset);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get ratings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update a rating
export async function POST(request: Request) {
  try {
    await ensureDb();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { episode_id, ...ratingData } = body;

    if (!episode_id) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 });
    }

    const parsed = ratingSchema.safeParse(ratingData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const rating = await rateEpisode(user.id, episode_id, parsed.data.rating, parsed.data.notes);

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error('Create rating error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
