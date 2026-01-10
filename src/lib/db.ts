import Database from 'better-sqlite3';
import path from 'path';

// Singleton database instance
let db: Database.Database | null = null;
let initialized = false;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    db = new Database(resolvedPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000'); // 5 second timeout for busy database
  }
  return db;
}

// Initialize database schema - only call once
export function initDb(): void {
  if (initialized) return;

  const db = getDb();

  // Create tables
  db.exec(`
    -- Episodes table
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      season_number INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      air_date TEXT,
      synopsis TEXT,
      setting TEXT,
      imdb_rating REAL,
      tags TEXT,
      UNIQUE(season_number, episode_number)
    );

    -- Guest stars table
    CREATE TABLE IF NOT EXISTS guest_stars (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    -- Episode-GuestStar join table
    CREATE TABLE IF NOT EXISTS episode_guest_stars (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      guest_star_id TEXT NOT NULL,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_star_id) REFERENCES guest_stars(id) ON DELETE CASCADE,
      UNIQUE(episode_id, guest_star_id)
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Ratings table
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      rating REAL NOT NULL CHECK (rating >= 1 AND rating <= 5),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
      UNIQUE(user_id, episode_id)
    );

    -- Bookmarks table
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
      UNIQUE(user_id, episode_id)
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season_number);
    CREATE INDEX IF NOT EXISTS idx_episodes_title ON episodes(title);
    CREATE INDEX IF NOT EXISTS idx_guest_stars_name ON guest_stars(name);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_episode ON ratings(episode_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
  `);

  // Create FTS5 virtual table for full-text search
  // FTS5 indexes title, synopsis, setting, and tags
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
      episode_id,
      title,
      synopsis,
      setting,
      tags,
      content='episodes',
      content_rowid='rowid'
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
      INSERT INTO episodes_fts(episode_id, title, synopsis, setting, tags)
      VALUES (new.id, new.title, new.synopsis, new.setting, new.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS episodes_ad AFTER DELETE ON episodes BEGIN
      INSERT INTO episodes_fts(episodes_fts, episode_id, title, synopsis, setting, tags)
      VALUES ('delete', old.id, old.title, old.synopsis, old.setting, old.tags);
    END;

    CREATE TRIGGER IF NOT EXISTS episodes_au AFTER UPDATE ON episodes BEGIN
      INSERT INTO episodes_fts(episodes_fts, episode_id, title, synopsis, setting, tags)
      VALUES ('delete', old.id, old.title, old.synopsis, old.setting, old.tags);
      INSERT INTO episodes_fts(episode_id, title, synopsis, setting, tags)
      VALUES (new.id, new.title, new.synopsis, new.setting, new.tags);
    END;

    -- FTS for guest stars (for typeahead search)
    CREATE VIRTUAL TABLE IF NOT EXISTS guest_stars_fts USING fts5(
      guest_star_id,
      name,
      content='guest_stars',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS guest_stars_ai AFTER INSERT ON guest_stars BEGIN
      INSERT INTO guest_stars_fts(guest_star_id, name) VALUES (new.id, new.name);
    END;

    CREATE TRIGGER IF NOT EXISTS guest_stars_ad AFTER DELETE ON guest_stars BEGIN
      INSERT INTO guest_stars_fts(guest_stars_fts, guest_star_id, name)
      VALUES ('delete', old.id, old.name);
    END;

    CREATE TRIGGER IF NOT EXISTS guest_stars_au AFTER UPDATE ON guest_stars BEGIN
      INSERT INTO guest_stars_fts(guest_stars_fts, guest_star_id, name)
      VALUES ('delete', old.id, old.name);
      INSERT INTO guest_stars_fts(guest_star_id, name) VALUES (new.id, new.name);
    END;
  `);

  initialized = true;
}

// Ensure DB is initialized - call this at the start of API routes
export function ensureDb(): void {
  // Skip during build if DATABASE_URL is not set or if building
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }
  initDb();
}

// Generate a CUID-like ID
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${randomPart}`;
}
