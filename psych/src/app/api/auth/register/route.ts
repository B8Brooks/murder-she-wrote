import { NextResponse } from 'next/server';
import { registerUser, createToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { ensureDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const result = await registerUser(email, password, name);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Create and set auth token
    const token = await createToken(result.user.id, result.user.email);
    await setAuthCookie(token);

    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
