import { NextResponse } from 'next/server';
import { getEpisodeById } from '@/lib/episodes';
import { getCurrentUser } from '@/lib/auth';
import { ensureDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const user = await getCurrentUser();
    const episode = await getEpisodeById(id, user?.id);

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json({ episode });
  } catch (error) {
    console.error('Episode fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
