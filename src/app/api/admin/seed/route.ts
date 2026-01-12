import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { importEpisodes } from '@/lib/episodes';
import seedData from '../../../../../data/seed-episodes.json';

export async function POST(request: Request) {
  try {
    // Simple secret check - you can change this
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'jessica-fletcher') {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    await ensureDb();

    const result = await importEpisodes(seedData);

    return NextResponse.json({
      success: true,
      imported: result.imported,
      errors: result.errors
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
