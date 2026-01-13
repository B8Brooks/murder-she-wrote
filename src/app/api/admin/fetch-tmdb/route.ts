import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { importEpisodes } from '@/lib/episodes';

const TMDB_SHOW_ID = 484; // Murder, She Wrote
const TOTAL_SEASONS = 12;

interface TMDBEpisode {
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  guest_stars?: { name: string }[];
}

interface TMDBSeason {
  episodes: TMDBEpisode[];
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'jessica-fletcher') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'TMDB_API_KEY not configured. Get a free API key at https://www.themoviedb.org/settings/api'
      }, { status: 500 });
    }

    const episodes: Array<{
      title: string;
      season_number: number;
      episode_number: number;
      air_date: string;
      synopsis: string;
      guest_stars: string[];
    }> = [];

    // Fetch all seasons
    for (let season = 1; season <= TOTAL_SEASONS; season++) {
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${TMDB_SHOW_ID}/season/${season}?api_key=${apiKey}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch season ${season}: ${response.status}`);
        continue;
      }

      const data: TMDBSeason = await response.json();

      for (const ep of data.episodes) {
        episodes.push({
          title: ep.name,
          season_number: season,
          episode_number: ep.episode_number,
          air_date: ep.air_date || '',
          synopsis: ep.overview || 'Synopsis not available.',
          guest_stars: ep.guest_stars?.slice(0, 5).map(g => g.name) || []
        });
      }
    }

    await ensureDb();
    const result = await importEpisodes(episodes);

    return NextResponse.json({
      success: true,
      fetched: episodes.length,
      imported: result.imported,
      errors: result.errors
    });
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
  }
}
