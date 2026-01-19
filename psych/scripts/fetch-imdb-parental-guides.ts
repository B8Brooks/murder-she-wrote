import 'dotenv/config';
/**
 * Fetch IMDb parental guide data for all Psych episodes
 * Run with: npm run fetch:imdb
 *
 * Process:
 * 1. Get all episodes from database
 * 2. Fetch IMDb ID for each episode from TMDB
 * 3. Scrape parental guide from IMDb
 * 4. Parse and store data
 */

import { getDb, generateId, ensureDb } from '../src/lib/db';
import * as cheerio from 'cheerio';

const TMDB_SHOW_ID = 1447; // Psych
const DELAY_MS = 500; // Respectful scraping delay
const MAX_RETRIES = 3;

interface Episode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string;
  imdb_id: string | null;
}

interface ParentalGuideData {
  violence_severity: number;
  violence_description: string;
  sex_severity: number;
  sex_description: string;
  profanity_severity: number;
  profanity_description: string;
  alcohol_severity: number;
  alcohol_description: string;
  frightening_severity: number;
  frightening_description: string;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

// Step 1: Fetch all episodes from database
async function fetchAllEpisodes(): Promise<Episode[]> {
  const db = getDb();
  const result = await db.execute(
    'SELECT id, season_number, episode_number, title, imdb_id FROM episodes ORDER BY season_number, episode_number'
  );
  return result.rows as unknown as Episode[];
}

// Step 2: Get IMDb ID from TMDB
async function fetchImdbId(seasonNumber: number, episodeNumber: number): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured');
  }

  const url = `https://api.themoviedb.org/3/tv/${TMDB_SHOW_ID}/season/${seasonNumber}/episode/${episodeNumber}/external_ids?api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    return data.imdb_id || null;
  } catch (error) {
    console.error(`Failed to fetch IMDb ID for S${seasonNumber}E${episodeNumber}:`, error);
    return null;
  }
}

// Step 3: Parse severity from text
function parseSeverity(text: string): number {
  const lower = text.toLowerCase().trim();
  if (lower.includes('severe')) return 3;
  if (lower.includes('moderate')) return 2;
  if (lower.includes('mild')) return 1;
  if (lower.includes('none')) return 0;
  return 0; // Default to None if unclear
}

// Step 4: Scrape parental guide from IMDb (FIXED FOR NEW STRUCTURE)
async function scrapeParentalGuide(imdbId: string): Promise<ParentalGuideData | null> {
  const url = `https://www.imdb.com/title/${imdbId}/parentalguide`;

  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);

    const guide: ParentalGuideData = {
      violence_severity: 0,
      violence_description: '',
      sex_severity: 0,
      sex_description: '',
      profanity_severity: 0,
      profanity_description: '',
      alcohol_severity: 0,
      alcohol_description: '',
      frightening_severity: 0,
      frightening_description: '',
    };

    // Helper to get severity from the content rating summary section
    const getSeverityFromSummary = (href: string): number => {
      // Find the li element that has an a with the matching href
      const listItem = $(`a[href="${href}"]`).closest('li');
      if (!listItem.length) return 0;
      
      // Within that li, find the severity in .ipc-html-content-inner-div
      const severityText = listItem.find('.ipc-html-content-inner-div').text().trim();
      return parseSeverity(severityText);
    };

    // Helper to get descriptions from the detailed section
    const getDescriptionsFromSection = (sectionId: string): string => {
      const section = $(`section#${sectionId}`);
      if (!section.length) return '';

      const descriptions: string[] = [];
      
      // Find all list items in the section
      section.find('li.ipc-metadata-list__item').each((_, el) => {
        const text = $(el).find('.ipc-html-content-inner-div').text().trim();
        if (text && text.length > 10 && !text.toLowerCase().includes('edit') && !text.match(/^\d+ of \d+/)) {
          descriptions.push(text);
        }
      });

      return descriptions.join(' | ').substring(0, 2000);
    };

    // Extract severity from summary and descriptions from detail sections
    guide.violence_severity = getSeverityFromSummary('#violence');
    guide.violence_description = getDescriptionsFromSection('violence');

    guide.sex_severity = getSeverityFromSummary('#nudity');
    guide.sex_description = getDescriptionsFromSection('nudity');

    guide.profanity_severity = getSeverityFromSummary('#profanity');
    guide.profanity_description = getDescriptionsFromSection('profanity');

    guide.alcohol_severity = getSeverityFromSummary('#alcohol');
    guide.alcohol_description = getDescriptionsFromSection('alcohol');

    guide.frightening_severity = getSeverityFromSummary('#frightening');
    guide.frightening_description = getDescriptionsFromSection('frightening');

    return guide;
  } catch (error) {
    console.error(`Failed to scrape parental guide for ${imdbId}:`, error);
    return null;
  }
}

// Main execution
async function main() {
  console.log('Starting IMDb parental guide fetch...\n');

  await ensureDb();
  const db = getDb();
  const episodes = await fetchAllEpisodes();

  console.log(`Found ${episodes.length} episodes to process\n`);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  for (const episode of episodes) {
    const episodeLabel = `S${episode.season_number}E${episode.episode_number.toString().padStart(2, '0')}`;
    console.log(`Processing ${episodeLabel}: ${episode.title}`);

    try {
      // Get IMDb ID if not already stored
      let imdbId = episode.imdb_id;
      if (!imdbId) {
        console.log(`  Fetching IMDb ID from TMDB...`);
        imdbId = await fetchImdbId(episode.season_number, episode.episode_number);

        if (!imdbId) {
          console.log(`  ❌ No IMDb ID found`);
          failed++;
          continue;
        }

        // Update episode with IMDb ID
        await db.execute({
          sql: 'UPDATE episodes SET imdb_id = ? WHERE id = ?',
          args: [imdbId, episode.id],
        });

        console.log(`  ✓ IMDb ID: ${imdbId}`);
        await delay(DELAY_MS); // Rate limiting
      }

      // Scrape parental guide
      console.log(`  Scraping parental guide from IMDb...`);
      const guideData = await scrapeParentalGuide(imdbId);

      if (!guideData) {
        console.log(`  ❌ Failed to scrape parental guide`);
        failed++;
        continue;
      }

      // Store in database
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO parental_guides (
            id, episode_id, imdb_id,
            violence_severity, violence_description,
            sex_severity, sex_description,
            profanity_severity, profanity_description,
            alcohol_severity, alcohol_description,
            frightening_severity, frightening_description,
            scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          generateId(),
          episode.id,
          imdbId,
          guideData.violence_severity,
          guideData.violence_description || null,
          guideData.sex_severity,
          guideData.sex_description || null,
          guideData.profanity_severity,
          guideData.profanity_description || null,
          guideData.alcohol_severity,
          guideData.alcohol_description || null,
          guideData.frightening_severity,
          guideData.frightening_description || null,
          new Date().toISOString(),
        ],
      });

      console.log(`  ✓ Stored parental guide (V:${guideData.violence_severity} S:${guideData.sex_severity} P:${guideData.profanity_severity} A:${guideData.alcohol_severity} F:${guideData.frightening_severity})`);
      updated++;

      await delay(DELAY_MS); // Rate limiting
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      failed++;
    }

    processed++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total episodes: ${episodes.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
