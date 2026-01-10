/**
 * Initialize the database and seed with sample data
 * Run with: npx tsx scripts/init-db.ts
 */

import { initDb } from '../src/lib/db';
import { importEpisodes } from '../src/lib/episodes';
import seedEpisodes from '../data/seed-episodes.json';
import type { EpisodeImport } from '../src/lib/types';

async function main() {
  console.log('Initializing database...');
  initDb();
  console.log('Database schema created successfully.');

  console.log('\nSeeding episodes...');
  const result = importEpisodes(seedEpisodes as EpisodeImport[]);
  console.log(`Imported ${result.imported} episodes.`);

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  console.log('\nDatabase initialization complete!');
  console.log('You can now start the app with: npm run dev');
}

main().catch(console.error);
