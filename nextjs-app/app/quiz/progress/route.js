// Ported from app.py:
//   @app.route('/quiz/progress', methods=['GET'])
//   def get_progress(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { todayDateString } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'User not logged in' }, { status: 401 });
  }
  const userId = session.userId;

  const payload = await withConnection(async (client) => {
    const totalIslandsResult = await client.query('SELECT COUNT(*) as total_islands FROM islands');
    const totalIslands = parseInt(totalIslandsResult.rows[0].total_islands, 10);

    const userDataResult = await client.query(
      `SELECT up.completed_islands, u.hp, u.gems, u.streaks, u.last_streak_date
       FROM users u
       LEFT JOIN user_progress up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );
    const userData = userDataResult.rows[0];
    if (!userData) {
      return { notFound: true };
    }

    let completedIslands;
    if (!userData.completed_islands) {
      await client.query("INSERT INTO user_progress (user_id, completed_islands) VALUES ($1, '[]')", [
        userId,
      ]);
      completedIslands = [];
    } else {
      completedIslands = JSON.parse(userData.completed_islands);
    }

    const today = todayDateString();
    const isTodayStreak = userData.last_streak_date === today;

    return {
      notFound: false,
      completed_islands: completedIslands,
      current_island: (completedIslands.length > 0 ? Math.max(...completedIslands) : 0) + 1,
      total_islands: totalIslands,
      hp: userData.hp,
      gems: userData.gems,
      streaks: userData.streaks,
      is_today_streak: isTodayStreak,
    };
  });

  if (payload.notFound) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const { notFound, ...body } = payload;
  return NextResponse.json(body);
}
