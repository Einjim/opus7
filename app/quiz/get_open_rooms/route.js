// Ported from app.py:
//   @app.route('/quiz/get_open_rooms', methods=['GET'])
//   def get_open_rooms(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';

export async function GET() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const openRooms = await withConnection(async (client) => {
    const result = await client.query(
      `SELECT roomid, quizname, created_time FROM multiplayer_games
       WHERE is_open = 1 AND created_time > $1 ORDER BY created_time DESC`,
      [thirtyMinutesAgo]
    );
    return result.rows;
  });

  return NextResponse.json(openRooms);
}
