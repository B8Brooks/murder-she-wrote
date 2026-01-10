/**
 * Import episodes from a JSON or CSV file
 *
 * Usage:
 *   npx tsx scripts/import-episodes.ts --file data/episodes.json
 *   npx tsx scripts/import-episodes.ts --file data/episodes.csv
 *
 * JSON format: Array of episode objects (see data/seed-episodes.json for example)
 *
 * CSV format (header row required):
 *   season_number,episode_number,title,air_date,synopsis,setting,imdb_rating,tags,guest_stars
 *
 *   - tags and guest_stars should be pipe-separated: "tag1|tag2|tag3"
 *   - air_date format: YYYY-MM-DD
 */

import fs from 'fs';
import path from 'path';
import { initDb } from '../src/lib/db';
import { importEpisodes } from '../src/lib/episodes';
import type { EpisodeImport } from '../src/lib/types';

function parseCSV(content: string): EpisodeImport[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const requiredHeaders = ['season_number', 'episode_number', 'title'];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required header: ${required}`);
    }
  }

  const episodes: EpisodeImport[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle CSV parsing (basic - doesn't handle quoted commas)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const episode: EpisodeImport = {
      season_number: parseInt(row.season_number, 10),
      episode_number: parseInt(row.episode_number, 10),
      title: row.title,
    };

    if (row.air_date) episode.air_date = row.air_date;
    if (row.synopsis) episode.synopsis = row.synopsis;
    if (row.setting) episode.setting = row.setting;
    if (row.imdb_rating) episode.imdb_rating = parseFloat(row.imdb_rating);
    if (row.tags) episode.tags = row.tags.split('|').map((t) => t.trim()).filter(Boolean);
    if (row.guest_stars) episode.guest_stars = row.guest_stars.split('|').map((g) => g.trim()).filter(Boolean);

    episodes.push(episode);
  }

  return episodes;
}

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');

  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('Usage: npx tsx scripts/import-episodes.ts --file <path-to-file>');
    console.error('\nSupported formats: .json, .csv');
    process.exit(1);
  }

  const filePath = args[fileIndex + 1];
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading file: ${absolutePath}`);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  let episodes: EpisodeImport[];

  if (ext === '.json') {
    episodes = JSON.parse(content);
  } else if (ext === '.csv') {
    episodes = parseCSV(content);
  } else {
    console.error(`Unsupported file format: ${ext}. Use .json or .csv`);
    process.exit(1);
  }

  console.log(`Found ${episodes.length} episodes to import.`);

  // Initialize DB if needed
  initDb();

  console.log('Importing episodes...');
  const result = importEpisodes(episodes);

  console.log(`\nImported ${result.imported} episodes.`);

  if (result.errors.length > 0) {
    console.log(`\n${result.errors.length} errors:`);
    result.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}

main().catch(console.error);
