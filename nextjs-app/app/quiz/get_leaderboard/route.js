// Ported from app.py:
//   @app.route('/quiz/get_leaderboard', methods=['GET'])
//   def get_leaderboard(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';

export async function GET() {
  const leaderboardData = await withConnection(async (client) => {
    const result = await client.query(
      'SELECT id, username, first_name, last_name, profile_picture, coins FROM users ORDER BY coins DESC LIMIT 100'
    );
    return result.rows;
  });

  return NextResponse.json(leaderboardData);
}
