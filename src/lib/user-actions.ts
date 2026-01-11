import { getDb, generateId } from './db';
import type {
  Rating,
  Bookmark,
  RatingWithEpisode,
  BookmarkWithEpisode,
  UserStats,
} from './types';

// Rate an episode (create or update)
export async function rateEpisode(
  userId: string,
  episodeId: string,
  rating: number,
  notes?: string
): Promise<Rating> {
  const db = getDb();

  // Validate rating is between 1 and 5 (allowing half-stars)
  if (rating < 1 || rating > 5 || (rating * 2) % 1 !== 0) {
    throw new Error('Rating must be between 1 and 5, with half-star increments');
  }

  const now = new Date().toISOString();

  // Check for existing rating
  const existingResult = await db.execute({
    sql: 'SELECT id FROM ratings WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });

  if (existingResult.rows.length > 0) {
    // Update existing rating
    const existingId = existingResult.rows[0].id as string;
    await db.execute({
      sql: 'UPDATE ratings SET rating = ?, notes = ?, updated_at = ? WHERE id = ?',
      args: [rating, notes || null, now, existingId],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM ratings WHERE id = ?',
      args: [existingId],
    });
    return result.rows[0] as unknown as Rating;
  } else {
    // Create new rating
    const id = generateId();
    await db.execute({
      sql: `
        INSERT INTO ratings (id, user_id, episode_id, rating, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, episodeId, rating, notes || null, now, now],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM ratings WHERE id = ?',
      args: [id],
    });
    return result.rows[0] as unknown as Rating;
  }
}

// Remove a rating
export async function removeRating(userId: string, episodeId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM ratings WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });
  return result.rowsAffected > 0;
}

// Get user's rating for an episode
export async function getUserRating(userId: string, episodeId: string): Promise<Rating | null> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM ratings WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as Rating) : null;
}

// Get all ratings by a user
export async function getUserRatings(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ ratings: RatingWithEpisode[]; total: number }> {
  const db = getDb();

  const totalResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM ratings WHERE user_id = ?',
    args: [userId],
  });
  const total = Number(totalResult.rows[0].count);

  const ratingsResult = await db.execute({
    sql: `
      SELECT r.*, e.id as ep_id, e.season_number, e.episode_number, e.title,
             e.air_date, e.synopsis, e.setting, e.imdb_rating, e.tags
      FROM ratings r
      JOIN episodes e ON r.episode_id = e.id
      WHERE r.user_id = ?
      ORDER BY r.updated_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [userId, limit, offset],
  });

  const ratings = ratingsResult.rows as unknown as Array<Rating & {
    ep_id: string;
    season_number: number;
    episode_number: number;
    title: string;
    air_date: string | null;
    synopsis: string | null;
    setting: string | null;
    imdb_rating: number | null;
    tags: string | null;
  }>;

  return {
    ratings: ratings.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      episode_id: r.episode_id,
      rating: r.rating,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      episode: {
        id: r.ep_id,
        season_number: r.season_number,
        episode_number: r.episode_number,
        title: r.title,
        air_date: r.air_date,
        synopsis: r.synopsis,
        setting: r.setting,
        imdb_rating: r.imdb_rating,
        tags: r.tags,
      },
    })),
    total,
  };
}

// Bookmark an episode
export async function bookmarkEpisode(userId: string, episodeId: string): Promise<Bookmark> {
  const db = getDb();

  // Check for existing bookmark
  const existingResult = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });

  if (existingResult.rows.length > 0) {
    return existingResult.rows[0] as unknown as Bookmark;
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db.execute({
    sql: 'INSERT INTO bookmarks (id, user_id, episode_id, created_at) VALUES (?, ?, ?, ?)',
    args: [id, userId, episodeId, now],
  });

  const result = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as Bookmark;
}

// Remove a bookmark
export async function removeBookmark(userId: string, episodeId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'DELETE FROM bookmarks WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });
  return result.rowsAffected > 0;
}

// Check if episode is bookmarked
export async function isBookmarked(userId: string, episodeId: string): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id FROM bookmarks WHERE user_id = ? AND episode_id = ?',
    args: [userId, episodeId],
  });
  return result.rows.length > 0;
}

// Get all bookmarks by a user
export async function getUserBookmarks(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ bookmarks: BookmarkWithEpisode[]; total: number }> {
  const db = getDb();

  const totalResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?',
    args: [userId],
  });
  const total = Number(totalResult.rows[0].count);

  const bookmarksResult = await db.execute({
    sql: `
      SELECT b.*, e.id as ep_id, e.season_number, e.episode_number, e.title,
             e.air_date, e.synopsis, e.setting, e.imdb_rating, e.tags
      FROM bookmarks b
      JOIN episodes e ON b.episode_id = e.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [userId, limit, offset],
  });

  const bookmarks = bookmarksResult.rows as unknown as Array<Bookmark & {
    ep_id: string;
    season_number: number;
    episode_number: number;
    title: string;
    air_date: string | null;
    synopsis: string | null;
    setting: string | null;
    imdb_rating: number | null;
    tags: string | null;
  }>;

  return {
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      user_id: b.user_id,
      episode_id: b.episode_id,
      created_at: b.created_at,
      episode: {
        id: b.ep_id,
        season_number: b.season_number,
        episode_number: b.episode_number,
        title: b.title,
        air_date: b.air_date,
        synopsis: b.synopsis,
        setting: b.setting,
        imdb_rating: b.imdb_rating,
        tags: b.tags,
      },
    })),
    total,
  };
}

// Get user statistics
export async function getUserStats(userId: string): Promise<UserStats> {
  const db = getDb();

  // Total rated
  const totalRatedResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM ratings WHERE user_id = ?',
    args: [userId],
  });
  const totalRated = Number(totalRatedResult.rows[0].count);

  // Total bookmarked
  const totalBookmarkedResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?',
    args: [userId],
  });
  const totalBookmarked = Number(totalBookmarkedResult.rows[0].count);

  // Average rating
  const avgRatingResult = await db.execute({
    sql: 'SELECT AVG(rating) as avg FROM ratings WHERE user_id = ?',
    args: [userId],
  });
  const avgRating = avgRatingResult.rows[0].avg as number | null;

  // Ratings by season
  const ratingsBySeasonResult = await db.execute({
    sql: `
      SELECT e.season_number as season, COUNT(*) as count, AVG(r.rating) as avg_rating
      FROM ratings r
      JOIN episodes e ON r.episode_id = e.id
      WHERE r.user_id = ?
      GROUP BY e.season_number
      ORDER BY e.season_number
    `,
    args: [userId],
  });
  const ratingsBySeason = ratingsBySeasonResult.rows as unknown as Array<{
    season: number;
    count: number;
    avg_rating: number;
  }>;

  // Top-rated season (by average rating, minimum 3 episodes rated)
  const topSeasonResult = await db.execute({
    sql: `
      SELECT e.season_number as season, AVG(r.rating) as avg_rating
      FROM ratings r
      JOIN episodes e ON r.episode_id = e.id
      WHERE r.user_id = ?
      GROUP BY e.season_number
      HAVING COUNT(*) >= 3
      ORDER BY avg_rating DESC
      LIMIT 1
    `,
    args: [userId],
  });
  const topSeason = topSeasonResult.rows.length > 0
    ? (topSeasonResult.rows[0] as unknown as { season: number; avg_rating: number })
    : null;

  return {
    total_rated: totalRated,
    total_bookmarked: totalBookmarked,
    average_rating: avgRating ? Math.round(avgRating * 100) / 100 : null,
    top_rated_season: topSeason?.season || null,
    ratings_by_season: ratingsBySeason.map((r) => ({
      season: Number(r.season),
      count: Number(r.count),
      avg_rating: Math.round(Number(r.avg_rating) * 100) / 100,
    })),
  };
}
