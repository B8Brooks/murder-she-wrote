import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { userParentalPreferencesSchema } from '@/lib/validations';
import type { UserParentalPreferences } from '@/lib/types';

// GET /api/user/parental-preferences - Get user's parental preferences
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.valid || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM user_parental_preferences WHERE user_id = ?',
    args: [authResult.userId],
  });

  if (result.rows.length === 0) {
    // Return default preferences
    return NextResponse.json({
      filter_enabled: false,
      max_violence: 3,
      max_sex: 3,
      max_profanity: 3,
      max_alcohol: 3,
      max_frightening: 3,
    });
  }

  const prefs = result.rows[0] as any;
  return NextResponse.json({
    filter_enabled: prefs.filter_enabled === 1,
    max_violence: prefs.max_violence,
    max_sex: prefs.max_sex,
    max_profanity: prefs.max_profanity,
    max_alcohol: prefs.max_alcohol,
    max_frightening: prefs.max_frightening,
  });
}

// PUT /api/user/parental-preferences - Update user's parental preferences
export async function PUT(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.valid || !authResult.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = userParentalPreferencesSchema.parse(body);

    const db = getDb();

    // Check if preferences exist
    const existing = await db.execute({
      sql: 'SELECT id FROM user_parental_preferences WHERE user_id = ?',
      args: [authResult.userId],
    });

    const now = new Date().toISOString();

    if (existing.rows.length === 0) {
      // Create new preferences
      await db.execute({
        sql: `
          INSERT INTO user_parental_preferences (
            id, user_id, filter_enabled, max_violence, max_sex, 
            max_profanity, max_alcohol, max_frightening, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          generateId(),
          authResult.userId,
          validatedData.filter_enabled ? 1 : 0,
          validatedData.max_violence,
          validatedData.max_sex,
          validatedData.max_profanity,
          validatedData.max_alcohol,
          validatedData.max_frightening,
          now,
          now,
        ],
      });
    } else {
      // Update existing preferences
      await db.execute({
        sql: `
          UPDATE user_parental_preferences
          SET filter_enabled = ?, max_violence = ?, max_sex = ?,
              max_profanity = ?, max_alcohol = ?, max_frightening = ?,
              updated_at = ?
          WHERE user_id = ?
        `,
        args: [
          validatedData.filter_enabled ? 1 : 0,
          validatedData.max_violence,
          validatedData.max_sex,
          validatedData.max_profanity,
          validatedData.max_alcohol,
          validatedData.max_frightening,
          now,
          authResult.userId,
        ],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating parental preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
