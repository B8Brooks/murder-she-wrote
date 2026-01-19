/**
 * Database migration to add parental guide support
 * Run with: npm run db:migrate:parental
 */

import { getDb, ensureDb } from '../src/lib/db';

async function migrate() {
  console.log('Running parental guide migration...\n');

  // Ensure database is initialized first
  await ensureDb();
  const db = getDb();

  try {
    // Add IMDb ID column to episodes table
    console.log('Adding imdb_id column to episodes table...');
    await db.execute('ALTER TABLE episodes ADD COLUMN imdb_id TEXT');
    console.log('✓ Added imdb_id column');

    // Index for faster IMDb ID lookups
    console.log('Creating index on imdb_id...');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_episodes_imdb ON episodes(imdb_id)');
    console.log('✓ Created index');

    // Parental guides table
    console.log('Creating parental_guides table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS parental_guides (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL,
        imdb_id TEXT,
        violence_severity INTEGER DEFAULT 0 CHECK(violence_severity >= 0 AND violence_severity <= 3),
        violence_description TEXT,
        sex_severity INTEGER DEFAULT 0 CHECK(sex_severity >= 0 AND sex_severity <= 3),
        sex_description TEXT,
        profanity_severity INTEGER DEFAULT 0 CHECK(profanity_severity >= 0 AND profanity_severity <= 3),
        profanity_description TEXT,
        alcohol_severity INTEGER DEFAULT 0 CHECK(alcohol_severity >= 0 AND alcohol_severity <= 3),
        alcohol_description TEXT,
        frightening_severity INTEGER DEFAULT 0 CHECK(frightening_severity >= 0 AND frightening_severity <= 3),
        frightening_description TEXT,
        scraped_at TEXT NOT NULL,
        FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
        UNIQUE(episode_id)
      )
    `);
    console.log('✓ Created parental_guides table');

    // User parental preferences table
    console.log('Creating user_parental_preferences table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_parental_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filter_enabled INTEGER DEFAULT 0,
        max_violence INTEGER DEFAULT 3,
        max_sex INTEGER DEFAULT 3,
        max_profanity INTEGER DEFAULT 3,
        max_alcohol INTEGER DEFAULT 3,
        max_frightening INTEGER DEFAULT 3,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `);
    console.log('✓ Created user_parental_preferences table');

    // Raw HTML storage for reprocessing (optional, for robustness)
    console.log('Creating parental_guide_raw_html table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS parental_guide_raw_html (
        id TEXT PRIMARY KEY,
        episode_id TEXT NOT NULL,
        imdb_id TEXT NOT NULL,
        raw_html TEXT,
        scraped_at TEXT NOT NULL,
        FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created parental_guide_raw_html table');

    // Indexes for filtering
    console.log('Creating indexes for parental guide filtering...');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_parental_guides_episode ON parental_guides(episode_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_user_parental_prefs_user ON user_parental_preferences(user_id)');
    console.log('✓ Created indexes');

    console.log('\n=== Migration completed successfully! ===\n');
  } catch (error: any) {
    if (error?.message?.includes('duplicate column name')) {
      console.log('⚠ Column imdb_id already exists, skipping...');
    } else {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
