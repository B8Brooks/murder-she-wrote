/**
 * Initialize the database schema
 * Run with: npx tsx scripts/init-db.ts
 */

import { initDb } from '../src/lib/db';

async function main() {
  console.log('Initializing database...');
  await initDb();
  console.log('Database schema created successfully.');
  console.log('\nDatabase initialization complete!');
  console.log('Use the admin page to fetch episodes from TMDB.');
}

main().catch(console.error);
