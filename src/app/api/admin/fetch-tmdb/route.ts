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

interface TMDBCredits {
  cast?: { name: string; order: number }[];
  guest_stars?: { name: string; order: number }[];
}

// Detect location from synopsis text
function detectSetting(synopsis: string, title: string): string {
  const text = (synopsis + ' ' + title).toLowerCase();

  // Check for explicit location mentions
  const locations: [RegExp, string][] = [
    [/cabot cove/i, 'Cabot Cove, Maine'],
    [/new york|manhattan|broadway|nyc/i, 'New York City'],
    [/los angeles|hollywood|beverly hills|la\b/i, 'Los Angeles'],
    [/san francisco/i, 'San Francisco'],
    [/london|england|british/i, 'London, England'],
    [/ireland|irish|dublin/i, 'Ireland'],
    [/las vegas|vegas/i, 'Las Vegas'],
    [/washington\s*d\.?c\.?/i, 'Washington, D.C.'],
    [/chicago/i, 'Chicago'],
    [/boston/i, 'Boston'],
    [/new orleans|mardi gras/i, 'New Orleans'],
    [/hawaii|honolulu/i, 'Hawaii'],
    [/mexico/i, 'Mexico'],
    [/paris|france|french/i, 'Paris, France'],
    [/italy|italian|rome|venice/i, 'Italy'],
    [/cruise|ship|aboard/i, 'Cruise Ship'],
    [/circus|carnival/i, 'Traveling Circus'],
  ];

  for (const [pattern, location] of locations) {
    if (pattern.test(text)) {
      return location;
    }
  }

  // Cabot Cove indicators (Jessica's hometown - stories with friends, neighbors, students)
  const cabotCoveIndicators = [
    /her (close )?friends/i,
    /former students/i,
    /neighbors?/i,
    /sheriff/i,
    /seth|amos|mort/i,  // Recurring Cabot Cove characters
    /local doctor/i,
    /small town/i,
    /her hometown/i,
    /maine/i,
  ];

  for (const pattern of cabotCoveIndicators) {
    if (pattern.test(text)) {
      return 'Cabot Cove, Maine';
    }
  }

  // Default - many episodes are in various locations
  return '';
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
      setting: string;
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
        const synopsis = ep.overview || 'Synopsis not available.';

        // Fetch full credits for each episode to get complete guest star list
        let guestStars: string[] = [];
        try {
          const creditsResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${TMDB_SHOW_ID}/season/${season}/episode/${ep.episode_number}/credits?api_key=${apiKey}`
          );
          if (creditsResponse.ok) {
            const credits: TMDBCredits = await creditsResponse.json();
            // Combine guest_stars and cast (excluding Angela Lansbury who is the main star)
            const allCast = [
              ...(credits.guest_stars || []),
              ...(credits.cast || [])
            ]
              .filter(c => !c.name.includes('Angela Lansbury'))
              .sort((a, b) => a.order - b.order)
              .slice(0, 10)
              .map(c => c.name);
            guestStars = allCast;
          }
        } catch {
          // Fall back to basic guest stars if credits fetch fails
          guestStars = ep.guest_stars?.slice(0, 5).map(g => g.name) || [];
        }

        episodes.push({
          title: ep.name,
          season_number: season,
          episode_number: ep.episode_number,
          air_date: ep.air_date || '',
          synopsis,
          setting: detectSetting(synopsis, ep.name),
          guest_stars: guestStars
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
