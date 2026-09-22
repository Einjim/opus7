// Ported from app.py:
//   @app.route('/signin') -> signin_page()
//   @app.route('/signin', methods=['POST']) -> signin()

import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { withConnection } from '../../lib/db';
import { getSession } from '../../lib/session';

const html = fs.readFileSync(path.join(process.cwd(), 'html-pages', 'signin.html'), 'utf-8');

export async function GET() {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request) {
  const data = await request.json();
  const { username, password } = data;

  const user = await withConnection(async (client) => {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  });

  if (user) {
    // Legacy compatibility: some rows historically stored the hash as
    // Python's `repr(bytes)` form (e.g. "b'$2b$12$...'") instead of the
    // plain hash string. Unwrap that exact same way before comparing.
    let storedHash = user.password;
    if (storedHash.startsWith("b'") && storedHash.endsWith("'")) {
      storedHash = storedHash.slice(2, -1);
    }

    const passwordMatches = await bcrypt.compare(password, storedHash);
    if (passwordMatches) {
      const session = await getSession();
      session.userId = user.id;
      await session.save();
      return NextResponse.json({ message: 'Login successful', redirect: '/quiz_app' }, { status: 200 });
    }
  }

  return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
}
