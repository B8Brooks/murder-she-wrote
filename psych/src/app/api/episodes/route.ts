import { NextResponse } from 'next/server';
import { searchEpisodes, getSeasons, getUserParentalPreferences } from '@/lib/episodes';
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
    
    // Auto-apply user's parental preferences if enabled and not overridden by URL params
    let filters = parsed.data;
    if (user?.id) {
      const prefs = await getUserParentalPreferences(user.id);
      if (prefs?.filter_enabled) {
        // Only apply preferences if not explicitly overridden in URL
        filters = {
          ...filters,
          max_violence: filters.max_violence ?? prefs.max_violence,
          max_sex: filters.max_sex ?? prefs.max_sex,
          max_profanity: filters.max_profanity ?? prefs.max_profanity,
          max_alcohol: filters.max_alcohol ?? prefs.max_alcohol,
          max_frightening: filters.max_frightening ?? prefs.max_frightening,
        };
      }
    }

    const results = await searchEpisodes(filters, user?.id);
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
