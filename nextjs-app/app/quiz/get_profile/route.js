// Ported from app.py:
//   @app.route('/quiz/get_profile', methods=['POST'])
//   def get_profile(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function POST() {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const user = await withConnection(async (client) => {
    const result = await client.query(
      'SELECT profile_picture, first_name, last_name, username, coins, streaks, hp FROM users WHERE id = $1',
      [session.userId]
    );
    return result.rows[0] || null;
  });

  if (user) {
    return NextResponse.json({
      profile_picture: user.profile_picture,
      name: `${user.first_name} ${user.last_name}`,
      username: user.username,
      coins: user.coins,
      streaks: user.streaks,
      hp: user.hp,
    });
  }
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
