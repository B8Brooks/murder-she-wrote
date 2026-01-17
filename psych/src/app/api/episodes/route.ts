import { NextResponse } from 'next/server';
import { searchEpisodes, getSeasons } from '@/lib/episodes';
import { getCurrentUser } from '@/lib/auth';
import { episodeFiltersSchema } from '@/lib/validations';
import { ensureDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = episodeFiltersSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    const results = await searchEpisodes(parsed.data, user?.id);
    const seasons = await getSeasons();

    return NextResponse.json({
      ...results,
      seasons,
    });
  } catch (error) {
    console.error('Episodes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
