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
export function getSeasons(): number[] {
  const db = getDb();
  const result = db.prepare(`
    SELECT DISTINCT season_number FROM episodes ORDER BY season_number
  `).all() as { season_number: number }[];
  return result.map((r) => r.season_number);
}

// Get episode by ID with all details
export function getEpisodeById(
  episodeId: string,
  userId?: string
): EpisodeWithDetails | null {
  const db = getDb();

  const episode = db.prepare(`
    SELECT * FROM episodes WHERE id = ?
  `).get(episodeId) as Episode | undefined;

  if (!episode) return null;

  // Get guest stars
  const guestStars = db.prepare(`
    SELECT gs.id, gs.name
    FROM guest_stars gs
    JOIN episode_guest_stars egs ON gs.id = egs.guest_star_id
    WHERE egs.episode_id = ?
    ORDER BY gs.name
  `).all(episodeId) as GuestStar[];

  // Get community rating
  const communityRating = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as count
    FROM ratings
    WHERE episode_id = ?
  `).get(episodeId) as { avg_rating: number | null; count: number };

  // Get user's rating and bookmark status if logged in
  let userRating: Rating | null = null;
  let isBookmarked = false;

  if (userId) {
    userRating = (db.prepare(`
      SELECT * FROM ratings WHERE user_id = ? AND episode_id = ?
    `).get(userId, episodeId) as Rating | undefined) || null;

    const bookmark = db.prepare(`
      SELECT id FROM bookmarks WHERE user_id = ? AND episode_id = ?
    `).get(userId, episodeId);
    isBookmarked = !!bookmark;
  }

  return {
    ...episode,
    guest_stars: guestStars,
    user_rating: userRating,
    is_bookmarked: isBookmarked,
    community_rating: communityRating.avg_rating
      ? Math.round(communityRating.avg_rating * 10) / 10
      : null,
    rating_count: communityRating.count,
  };
}

// Get episode by season and episode number
export function getEpisodeByNumber(
  seasonNumber: number,
  episodeNumber: number,
  userId?: string
): EpisodeWithDetails | null {
  const db = getDb();
  const episode = db.prepare(`
    SELECT id FROM episodes WHERE season_number = ? AND episode_number = ?
  `).get(seasonNumber, episodeNumber) as { id: string } | undefined;

  if (!episode) return null;
  return getEpisodeById(episode.id, userId);
}

// Search and filter episodes
export function searchEpisodes(
  filters: EpisodeFilters,
  userId?: string
): PaginatedResult<EpisodeWithDetails> {
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

  // Full-text search using FTS5
  let episodeIds: Set<string> | null = null;
  if (search) {
    const ftsResults = db.prepare(`
      SELECT episode_id FROM episodes_fts WHERE episodes_fts MATCH ?
    `).all(`"${search.replace(/"/g, '""')}"*`) as { episode_id: string }[];
    episodeIds = new Set(ftsResults.map((r) => r.episode_id));

    // Also search guest stars
    const guestFts = db.prepare(`
      SELECT egs.episode_id
      FROM guest_stars_fts gsf
      JOIN guest_stars gs ON gsf.guest_star_id = gs.id
      JOIN episode_guest_stars egs ON gs.id = egs.guest_star_id
      WHERE guest_stars_fts MATCH ?
    `).all(`"${search.replace(/"/g, '""')}"*`) as { episode_id: string }[];
    guestFts.forEach((r) => episodeIds!.add(r.episode_id));

    if (episodeIds.size === 0) {
      return { data: [], total: 0, page, limit, total_pages: 0 };
    }
  }

  // Season filter
  if (season !== undefined) {
    conditions.push('e.season_number = ?');
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

  // Build episode ID filter from FTS results
  if (episodeIds) {
    const idList = Array.from(episodeIds)
      .map(() => '?')
      .join(',');
    conditions.push(`e.id IN (${idList})`);
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
      orderBy = `e.imdb_rating ${sort_order === 'desc' ? 'DESC NULLS LAST' : 'ASC NULLS LAST'}`;
      break;
    case 'episode':
    default:
      orderBy = `e.season_number ${sort_order === 'desc' ? 'DESC' : 'ASC'}, e.episode_number ${sort_order === 'desc' ? 'DESC' : 'ASC'}`;
  }

  // Get total count
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM episodes e ${whereClause}
  `).get(...params) as { total: number };

  const total = countResult.total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get paginated results
  const episodes = db.prepare(`
    SELECT e.* FROM episodes e
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Episode[];

  // Enrich with details
  const enriched = episodes.map((ep) => getEpisodeById(ep.id, userId)!);

  return {
    data: enriched,
    total,
    page,
    limit,
    total_pages: totalPages,
  };
}

// Get episodes by season
export function getEpisodesBySeason(
  seasonNumber: number,
  userId?: string
): EpisodeWithDetails[] {
  const result = searchEpisodes(
    { season: seasonNumber, limit: 100 },
    userId
  );
  return result.data;
}

// Search guest stars for typeahead
export function searchGuestStars(query: string, limit = 10): GuestStar[] {
  const db = getDb();

  if (!query.trim()) {
    return db.prepare(`
      SELECT id, name FROM guest_stars ORDER BY name LIMIT ?
    `).all(limit) as GuestStar[];
  }

  // Use FTS5 for prefix search
  const results = db.prepare(`
    SELECT gs.id, gs.name
    FROM guest_stars_fts gsf
    JOIN guest_stars gs ON gsf.guest_star_id = gs.id
    WHERE guest_stars_fts MATCH ?
    LIMIT ?
  `).all(`"${query.replace(/"/g, '""')}"*`, limit) as GuestStar[];

  return results;
}

// Get unique settings for typeahead
export function searchSettings(query: string, limit = 10): string[] {
  const db = getDb();

  const results = db.prepare(`
    SELECT DISTINCT setting FROM episodes
    WHERE setting IS NOT NULL AND setting LIKE ?
    ORDER BY setting
    LIMIT ?
  `).all(`%${query}%`, limit) as { setting: string }[];

  return results.map((r) => r.setting);
}

// Import episodes from data
export function importEpisodes(episodes: EpisodeImport[]): { imported: number; errors: string[] } {
  const db = getDb();
  const errors: string[] = [];
  let imported = 0;

  const insertEpisode = db.prepare(`
    INSERT OR REPLACE INTO episodes (id, season_number, episode_number, title, air_date, synopsis, setting, imdb_rating, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const getEpisodeId = db.prepare(`
    SELECT id FROM episodes WHERE season_number = ? AND episode_number = ?
  `);

  const insertGuestStar = db.prepare(`
    INSERT OR IGNORE INTO guest_stars (id, name) VALUES (?, ?)
  `);

  const getGuestStarId = db.prepare(`
    SELECT id FROM guest_stars WHERE name = ?
  `);

  const insertEpisodeGuestStar = db.prepare(`
    INSERT OR IGNORE INTO episode_guest_stars (id, episode_id, guest_star_id)
    VALUES (?, ?, ?)
  `);

  const transaction = db.transaction((episodes: EpisodeImport[]) => {
    for (const ep of episodes) {
      try {
        // Check for existing episode
        const existing = getEpisodeId.get(ep.season_number, ep.episode_number) as { id: string } | undefined;
        const episodeId = existing?.id || generateId();

        // Insert or update episode
        insertEpisode.run(
          episodeId,
          ep.season_number,
          ep.episode_number,
          ep.title,
          ep.air_date || null,
          ep.synopsis || null,
          ep.setting || null,
          ep.imdb_rating || null,
          ep.tags ? JSON.stringify(ep.tags) : null
        );

        // Handle guest stars
        if (ep.guest_stars && ep.guest_stars.length > 0) {
          for (const gsName of ep.guest_stars) {
            // Insert guest star if not exists
            const existingGs = getGuestStarId.get(gsName) as { id: string } | undefined;
            const gsId = existingGs?.id || generateId();

            if (!existingGs) {
              insertGuestStar.run(gsId, gsName);
            }

            // Link guest star to episode
            insertEpisodeGuestStar.run(generateId(), episodeId, gsId);
          }
        }

        imported++;
      } catch (error) {
        errors.push(`S${ep.season_number}E${ep.episode_number}: ${error}`);
      }
    }
  });

  transaction(episodes);

  return { imported, errors };
}

// Get all guest stars
export function getAllGuestStars(): GuestStar[] {
  const db = getDb();
  return db.prepare('SELECT id, name FROM guest_stars ORDER BY name').all() as GuestStar[];
}
