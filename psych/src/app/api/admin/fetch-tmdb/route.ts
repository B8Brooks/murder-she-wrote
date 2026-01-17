import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { importEpisodes } from '@/lib/episodes';

const TMDB_SHOW_ID = 1447; // Psych
const TOTAL_SEASONS = 8;

// Main cast to exclude from guest stars
const MAIN_CAST = [
  'James Roday',
  'James Roday Rodriguez',
  'Dulé Hill',
  'Timothy Omundson',
  'Maggie Lawson',
  'Kirsten Nelson',
  'Corbin Bernsen',
];

interface TMDBEpisode {
  episode_number: number;
  name: string;
  overview: string;
  air_date: string;
  vote_average?: number;
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
    [/santa barbara/i, 'Santa Barbara, CA'],
    [/los angeles|hollywood|beverly hills|la\b/i, 'Los Angeles, CA'],
    [/san francisco/i, 'San Francisco, CA'],
    [/new york|manhattan|broadway|nyc/i, 'New York City'],
    [/london|england|british/i, 'London, England'],
    [/canada|canadian|vancouver/i, 'Canada'],
    [/las vegas|vegas/i, 'Las Vegas, NV'],
    [/mexico/i, 'Mexico'],
    [/hawaii|honolulu/i, 'Hawaii'],
    [/washington\s*d\.?c\.?/i, 'Washington, D.C.'],
  ];

  for (const [pattern, location] of locations) {
    if (pattern.test(text)) {
      return location;
    }
  }

  // Santa Barbara indicators (the show's primary setting)
  const santaBarbaraIndicators = [
    /sbpd|police department/i,
    /chief vick/i,
    /psych office/i,
    /lassiter|lassie/i,
    /juliet|jules/i,
    /gus('s)? (dad|father|mother|mom)/i,
    /henry('s)? (house|place)/i,
  ];

  for (const pattern of santaBarbaraIndicators) {
    if (pattern.test(text)) {
      return 'Santa Barbara, CA';
    }
  }

  // Default to Santa Barbara since most episodes are set there
  return 'Santa Barbara, CA';
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'ive-heard-it-both-ways') {
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
      imdb_rating?: number;
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
            // Combine guest_stars and cast, excluding main cast
            const allCast = [
              ...(credits.guest_stars || []),
              ...(credits.cast || [])
            ]
              .filter(c => !MAIN_CAST.some(main => c.name.includes(main)))
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
          imdb_rating: ep.vote_average || undefined,
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
