import { NextResponse } from 'next/server';
import { loginUser, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { ensureDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Set auth cookie
    await setAuthCookie(result.token);

    return NextResponse.json({ user: result.user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
