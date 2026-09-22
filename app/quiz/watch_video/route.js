// Ported from app.py:
//   @app.route('/quiz/watch_video', methods=['POST'])
//   def watch_video(): ...
// Charges coins on first watch only; a unique constraint on
// video_views(user_id, video_id) plus ON CONFLICT DO NOTHING is what makes
// this safe against a double-click/double-request race, same as the
// original.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

const COST = 100;

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = (await request.json().catch(() => null)) || {};
  const videoId = data.video_id;
  if (!videoId) {
    return NextResponse.json({ success: false, error: 'Missing video_id' }, { status: 400 });
  }

  const userId = session.userId;

  const result = await withConnection(async (client) => {
    const videoCheck = await client.query('SELECT id FROM teacherboard WHERE id = $1', [videoId]);
    if (videoCheck.rows.length === 0) {
      return { outcome: 'not_found' };
    }

    const viewCheck = await client.query(
      'SELECT id FROM video_views WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );
    if (viewCheck.rows.length > 0) {
      const coinsResult = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
      return { outcome: 'already_watched', coins: coinsResult.rows[0].coins };
    }

    const userCoinsResult = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
    const userCoins = userCoinsResult.rows[0].coins;
    if (userCoins < COST) {
      return { outcome: 'insufficient_coins' };
    }

    const insertResult = await client.query(
      `INSERT INTO video_views (user_id, video_id) VALUES ($1, $2)
       ON CONFLICT (user_id, video_id) DO NOTHING
       RETURNING id`,
      [userId, videoId]
    );
    const wonRace = insertResult.rows.length > 0;

    if (!wonRace) {
      const coinsResult = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
      return { outcome: 'already_watched', coins: coinsResult.rows[0].coins };
    }

    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [COST, userId]);
    const newCoinsResult = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
    return { outcome: 'charged', coins: newCoinsResult.rows[0].coins };
  });

  if (result.outcome === 'not_found') {
    return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
  }
  if (result.outcome === 'already_watched') {
    return NextResponse.json({
      success: true,
      already_watched: true,
      coins_deducted: 0,
      coins: result.coins,
    });
  }
  if (result.outcome === 'insufficient_coins') {
    return NextResponse.json(
      { success: false, error: 'Insufficient coins to watch video' },
      { status: 403 }
    );
  }
  return NextResponse.json({
    success: true,
    already_watched: false,
    coins_deducted: COST,
    coins: result.coins,
  });
}
