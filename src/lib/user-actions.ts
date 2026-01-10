import { getDb, generateId } from './db';
import type {
  Rating,
  Bookmark,
  RatingWithEpisode,
  BookmarkWithEpisode,
  UserStats,
} from './types';

// Rate an episode (create or update)
export function rateEpisode(
  userId: string,
  episodeId: string,
  rating: number,
  notes?: string
): Rating {
  const db = getDb();

  // Validate rating is between 1 and 5 (allowing half-stars)
  if (rating < 1 || rating > 5 || (rating * 2) % 1 !== 0) {
    throw new Error('Rating must be between 1 and 5, with half-star increments');
  }

  const now = new Date().toISOString();

  // Check for existing rating
  const existing = db.prepare(`
    SELECT id FROM ratings WHERE user_id = ? AND episode_id = ?
  `).get(userId, episodeId) as { id: string } | undefined;

  if (existing) {
    // Update existing rating
    db.prepare(`
      UPDATE ratings SET rating = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(rating, notes || null, now, existing.id);

    return db.prepare('SELECT * FROM ratings WHERE id = ?').get(existing.id) as Rating;
  } else {
    // Create new rating
    const id = generateId();
    db.prepare(`
      INSERT INTO ratings (id, user_id, episode_id, rating, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, episodeId, rating, notes || null, now, now);

    return db.prepare('SELECT * FROM ratings WHERE id = ?').get(id) as Rating;
  }
}

// Remove a rating
export function removeRating(userId: string, episodeId: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM ratings WHERE user_id = ? AND episode_id = ?
  `).run(userId, episodeId);
  return result.changes > 0;
}

// Get user's rating for an episode
export function getUserRating(userId: string, episodeId: string): Rating | null {
  const db = getDb();
  const rating = db.prepare(`
    SELECT * FROM ratings WHERE user_id = ? AND episode_id = ?
  `).get(userId, episodeId) as Rating | undefined;
  return rating || null;
}

// Get all ratings by a user
export function getUserRatings(
  userId: string,
  limit = 50,
  offset = 0
): { ratings: RatingWithEpisode[]; total: number } {
  const db = getDb();

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM ratings WHERE user_id = ?
  `).get(userId) as { count: number };

  const ratings = db.prepare(`
    SELECT r.*, e.id as ep_id, e.season_number, e.episode_number, e.title,
           e.air_date, e.synopsis, e.setting, e.imdb_rating, e.tags
    FROM ratings r
    JOIN episodes e ON r.episode_id = e.id
    WHERE r.user_id = ?
    ORDER BY r.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Array<Rating & {
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
    total: total.count,
  };
}

// Bookmark an episode
export function bookmarkEpisode(userId: string, episodeId: string): Bookmark {
  const db = getDb();

  // Check for existing bookmark
  const existing = db.prepare(`
    SELECT * FROM bookmarks WHERE user_id = ? AND episode_id = ?
  `).get(userId, episodeId) as Bookmark | undefined;

  if (existing) {
    return existing;
  }

  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO bookmarks (id, user_id, episode_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, episodeId, now);

  return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as Bookmark;
}

// Remove a bookmark
export function removeBookmark(userId: string, episodeId: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM bookmarks WHERE user_id = ? AND episode_id = ?
  `).run(userId, episodeId);
  return result.changes > 0;
}

// Check if episode is bookmarked
export function isBookmarked(userId: string, episodeId: string): boolean {
  const db = getDb();
  const bookmark = db.prepare(`
    SELECT id FROM bookmarks WHERE user_id = ? AND episode_id = ?
  `).get(userId, episodeId);
  return !!bookmark;
}

// Get all bookmarks by a user
export function getUserBookmarks(
  userId: string,
  limit = 50,
  offset = 0
): { bookmarks: BookmarkWithEpisode[]; total: number } {
  const db = getDb();

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?
  `).get(userId) as { count: number };

  const bookmarks = db.prepare(`
    SELECT b.*, e.id as ep_id, e.season_number, e.episode_number, e.title,
           e.air_date, e.synopsis, e.setting, e.imdb_rating, e.tags
    FROM bookmarks b
    JOIN episodes e ON b.episode_id = e.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset) as Array<Bookmark & {
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
    total: total.count,
  };
}

// Get user statistics
export function getUserStats(userId: string): UserStats {
  const db = getDb();

  // Total rated
  const totalRated = db.prepare(`
    SELECT COUNT(*) as count FROM ratings WHERE user_id = ?
  `).get(userId) as { count: number };

  // Total bookmarked
  const totalBookmarked = db.prepare(`
    SELECT COUNT(*) as count FROM bookmarks WHERE user_id = ?
  `).get(userId) as { count: number };

  // Average rating
  const avgRating = db.prepare(`
    SELECT AVG(rating) as avg FROM ratings WHERE user_id = ?
  `).get(userId) as { avg: number | null };

  // Ratings by season
  const ratingsBySeason = db.prepare(`
    SELECT e.season_number as season, COUNT(*) as count, AVG(r.rating) as avg_rating
    FROM ratings r
    JOIN episodes e ON r.episode_id = e.id
    WHERE r.user_id = ?
    GROUP BY e.season_number
    ORDER BY e.season_number
  `).all(userId) as { season: number; count: number; avg_rating: number }[];

  // Top-rated season (by average rating, minimum 3 episodes rated)
  const topSeason = db.prepare(`
    SELECT e.season_number as season, AVG(r.rating) as avg_rating
    FROM ratings r
    JOIN episodes e ON r.episode_id = e.id
    WHERE r.user_id = ?
    GROUP BY e.season_number
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating DESC
    LIMIT 1
  `).get(userId) as { season: number; avg_rating: number } | undefined;

  return {
    total_rated: totalRated.count,
    total_bookmarked: totalBookmarked.count,
    average_rating: avgRating.avg ? Math.round(avgRating.avg * 100) / 100 : null,
    top_rated_season: topSeason?.season || null,
    ratings_by_season: ratingsBySeason.map((r) => ({
      season: r.season,
      count: r.count,
      avg_rating: Math.round(r.avg_rating * 100) / 100,
    })),
  };
}
