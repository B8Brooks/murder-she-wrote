import { getDb, generateId } from './db';
import type {
  Episode,
  EpisodeWithDetails,
  GuestStar,
  EpisodeFilters,
  PaginatedResult,
  EpisodeImport,
  Rating,
} from './types';

// Get all unique seasons
export async function getSeasons(): Promise<number[]> {
  const db = getDb();
  const result = await db.execute(`
    SELECT DISTINCT season_number FROM episodes ORDER BY season_number
  `);
  return result.rows.map((r) => r.season_number as number);
}

// Get episode by ID with all details
export async function getEpisodeById(
  episodeId: string,
  userId?: string
): Promise<EpisodeWithDetails | null> {
  const db = getDb();

  const episodeResult = await db.execute({
    sql: 'SELECT * FROM episodes WHERE id = ?',
    args: [episodeId],
  });

  if (episodeResult.rows.length === 0) return null;

  const episode = episodeResult.rows[0] as unknown as Episode;

  // Get guest stars
  const guestStarsResult = await db.execute({
    sql: `
      SELECT gs.id, gs.name
      FROM guest_stars gs
      JOIN episode_guest_stars egs ON gs.id = egs.guest_star_id
      WHERE egs.episode_id = ?
      ORDER BY gs.name
    `,
    args: [episodeId],
  });
  const guestStars = guestStarsResult.rows as unknown as GuestStar[];

  // Get community rating
  const communityResult = await db.execute({
    sql: `
      SELECT AVG(rating) as avg_rating, COUNT(*) as count
      FROM ratings
      WHERE episode_id = ?
    `,
    args: [episodeId],
  });
  const communityRating = communityResult.rows[0] as unknown as { avg_rating: number | null; count: number };

  // Get user's rating and bookmark status if logged in
  let userRating: Rating | null = null;
  let isBookmarked = false;

  if (userId) {
    const userRatingResult = await db.execute({
      sql: 'SELECT * FROM ratings WHERE user_id = ? AND episode_id = ?',
      args: [userId, episodeId],
    });
    userRating = userRatingResult.rows.length > 0
      ? (userRatingResult.rows[0] as unknown as Rating)
      : null;

    const bookmarkResult = await db.execute({
      sql: 'SELECT id FROM bookmarks WHERE user_id = ? AND episode_id = ?',
      args: [userId, episodeId],
    });
    isBookmarked = bookmarkResult.rows.length > 0;
  }

  return {
    ...episode,
    guest_stars: guestStars,
    user_rating: userRating,
    is_bookmarked: isBookmarked,
    community_rating: communityRating.avg_rating
      ? Math.round((communityRating.avg_rating as number) * 10) / 10
      : null,
    rating_count: Number(communityRating.count),
  };
}

// Get episode by season and episode number
export async function getEpisodeByNumber(
  seasonNumber: number,
  episodeNumber: number,
  userId?: string
): Promise<EpisodeWithDetails | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id FROM episodes WHERE season_number = ? AND episode_number = ?',
    args: [seasonNumber, episodeNumber],
  });

  if (result.rows.length === 0) return null;
  return getEpisodeById(result.rows[0].id as string, userId);
}

// Search and filter episodes
export async function searchEpisodes(
  filters: EpisodeFilters,
  userId?: string
): Promise<PaginatedResult<EpisodeWithDetails>> {
  const db = getDb();
  const {
    search,
    season,
    guest_star,
    setting,
    min_rating,
    sort_by = 'episode',
    sort_order = 'asc',
    page = 1,
    limit = 20,
  } = filters;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Full-text search using LIKE
  let episodeIds: Set<string> | null = null;
  if (search) {
    const searchTerm = `%${search}%`;

    // Search in episodes table
    const episodeResults = await db.execute({
      sql: `
        SELECT id FROM episodes
        WHERE title LIKE ? OR synopsis LIKE ? OR setting LIKE ? OR tags LIKE ?
      `,
      args: [searchTerm, searchTerm, searchTerm, searchTerm],
    });
    episodeIds = new Set(episodeResults.rows.map((r) => r.id as string));

    // Also search guest stars
    const guestResults = await db.execute({
      sql: `
        SELECT DISTINCT egs.episode_id
        FROM guest_stars gs
        JOIN episode_guest_stars egs ON gs.id = egs.guest_star_id
        WHERE gs.name LIKE ?
      `,
      args: [searchTerm],
    });
    guestResults.rows.forEach((r) => episodeIds!.add(r.episode_id as string));

    if (episodeIds.size === 0) {
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }
  }

  // Season filter
  if (season !== undefined) {
    conditions.push(`e.season_number = ?`);
    params.push(season);
  }

  // Guest star filter
  if (guest_star) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM episode_guest_stars egs
        JOIN guest_stars gs ON egs.guest_star_id = gs.id
        WHERE egs.episode_id = e.id AND gs.name LIKE ?
      )
    `);
    params.push(`%${guest_star}%`);
  }

  // Setting filter
  if (setting) {
    conditions.push('e.setting LIKE ?');
    params.push(`%${setting}%`);
  }

  // Minimum IMDb rating filter
  if (min_rating !== undefined) {
    conditions.push('e.imdb_rating >= ?');
    params.push(min_rating);
  }

  // Build episode ID filter from search results
  if (episodeIds) {
    const placeholders = Array.from(episodeIds).map(() => '?').join(',');
    conditions.push(`e.id IN (${placeholders})`);
    params.push(...Array.from(episodeIds));
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  let orderBy: string;
  switch (sort_by) {
    case 'title':
      orderBy = `e.title ${sort_order === 'desc' ? 'DESC' : 'ASC'}`;
      break;
    case 'rating':
      orderBy = `e.imdb_rating ${sort_order === 'desc' ? 'DESC' : 'ASC'}`;
      break;
    case 'episode':
    default:
      orderBy = `e.season_number ${sort_order === 'desc' ? 'DESC' : 'ASC'}, e.episode_number ${sort_order === 'desc' ? 'DESC' : 'ASC'}`;
  }

  // Get total count
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM episodes e ${whereClause}`,
    args: params,
  });

  const total = Number(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get paginated results
  const episodesResult = await db.execute({
    sql: `
      SELECT e.* FROM episodes e
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `,
    args: [...params, limit, offset],
  });

  const episodes = episodesResult.rows as unknown as Episode[];

  // Enrich with details
  const enriched = await Promise.all(
    episodes.map((ep) => getEpisodeById(ep.id, userId))
  );

  return {
    data: enriched.filter((e): e is EpisodeWithDetails => e !== null),
    total,
    page,
    limit,
    total_pages: totalPages,
  };
}

// Get episodes by season
export async function getEpisodesBySeason(
  seasonNumber: number,
  userId?: string
): Promise<EpisodeWithDetails[]> {
  const result = await searchEpisodes(
    { season: seasonNumber, limit: 100 },
    userId
  );
  return result.data;
}

// Search guest stars for typeahead
export async function searchGuestStars(query: string, limit = 10): Promise<GuestStar[]> {
  const db = getDb();

  if (!query.trim()) {
    const result = await db.execute({
      sql: 'SELECT id, name FROM guest_stars ORDER BY name LIMIT ?',
      args: [limit],
    });
    return result.rows as unknown as GuestStar[];
  }

  // Use LIKE for search
  const result = await db.execute({
    sql: `
      SELECT id, name FROM guest_stars
      WHERE name LIKE ?
      ORDER BY name
      LIMIT ?
    `,
    args: [`%${query}%`, limit],
  });

  return result.rows as unknown as GuestStar[];
}

// Get unique settings for typeahead
export async function searchSettings(query: string, limit = 10): Promise<string[]> {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT DISTINCT setting FROM episodes
      WHERE setting IS NOT NULL AND setting LIKE ?
      ORDER BY setting
      LIMIT ?
    `,
    args: [`%${query}%`, limit],
  });

  return result.rows.map((r) => r.setting as string);
}

// Import episodes from data
export async function importEpisodes(episodes: EpisodeImport[]): Promise<{ imported: number; errors: string[] }> {
  const db = getDb();
  const errors: string[] = [];
  let imported = 0;

  for (const ep of episodes) {
    try {
      // Check for existing episode
      const existingResult = await db.execute({
        sql: 'SELECT id FROM episodes WHERE season_number = ? AND episode_number = ?',
        args: [ep.season_number, ep.episode_number],
      });
      const episodeId = existingResult.rows.length > 0
        ? (existingResult.rows[0].id as string)
        : generateId();

      // Insert or update episode
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO episodes (id, season_number, episode_number, title, air_date, synopsis, setting, imdb_rating, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          episodeId,
          ep.season_number,
          ep.episode_number,
          ep.title,
          ep.air_date || null,
          ep.synopsis || null,
          ep.setting || null,
          ep.imdb_rating || null,
          ep.tags ? JSON.stringify(ep.tags) : null,
        ],
      });

      // Handle guest stars
      if (ep.guest_stars && ep.guest_stars.length > 0) {
        for (const gsName of ep.guest_stars) {
          // Check if guest star exists
          const existingGsResult = await db.execute({
            sql: 'SELECT id FROM guest_stars WHERE name = ?',
            args: [gsName],
          });

          let gsId: string;
          if (existingGsResult.rows.length > 0) {
            gsId = existingGsResult.rows[0].id as string;
          } else {
            gsId = generateId();
            await db.execute({
              sql: 'INSERT OR IGNORE INTO guest_stars (id, name) VALUES (?, ?)',
              args: [gsId, gsName],
            });
          }

          // Link guest star to episode
          await db.execute({
            sql: 'INSERT OR IGNORE INTO episode_guest_stars (id, episode_id, guest_star_id) VALUES (?, ?, ?)',
            args: [generateId(), episodeId, gsId],
          });
        }
      }

      imported++;
    } catch (error) {
      errors.push(`S${ep.season_number}E${ep.episode_number}: ${error}`);
    }
  }

  return { imported, errors };
}

// Get all guest stars
export async function getAllGuestStars(): Promise<GuestStar[]> {
  const db = getDb();
  const result = await db.execute('SELECT id, name FROM guest_stars ORDER BY name');
  return result.rows as unknown as GuestStar[];
}
