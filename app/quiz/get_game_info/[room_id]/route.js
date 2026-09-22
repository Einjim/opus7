// Ported from app.py:
//   @app.route('/quiz/get_game_info/<int:room_id>', methods=['GET'])
//   def get_game_info(room_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { room_id } = await params;

  const gameInfo = await withConnection(async (client) => {
    const result = await client.query(
      `SELECT
         mg.quizname,
         c.id AS creator_id, c.username AS creator_username, c.first_name AS creator_first_name, c.last_name AS creator_last_name, c.profile_picture AS creator_profile_picture,
         j.id AS joiner_id, j.username AS joiner_username, j.first_name AS joiner_first_name, j.last_name AS joiner_last_name, j.profile_picture AS joiner_profile_picture
       FROM multiplayer_games mg
       LEFT JOIN users c ON mg.creator_id = c.id
       LEFT JOIN users j ON mg.joiner_id = j.id
       WHERE mg.roomid = $1`,
      [room_id]
    );
    return result.rows[0] || null;
  });

  if (gameInfo) {
    return NextResponse.json({
      quiz_name: gameInfo.quizname,
      creator: {
        id: gameInfo.creator_id,
        first_name: gameInfo.creator_first_name,
        last_name: gameInfo.creator_last_name,
        username: gameInfo.creator_username,
        profile_picture: gameInfo.creator_profile_picture,
      },
      joiner: {
        id: gameInfo.joiner_id,
        first_name: gameInfo.joiner_first_name,
        last_name: gameInfo.joiner_last_name,
        username: gameInfo.joiner_username,
        profile_picture: gameInfo.joiner_profile_picture,
      },
    });
  }
  return NextResponse.json({ error: 'Game not found' }, { status: 404 });
}
