// Ported from app.py:
//   @app.route('/quiz/join_room', methods=['POST'])
//   def join_room(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const roomId = data.room_id;

  const joined = await withConnection(async (client) => {
    const result = await client.query(
      'UPDATE multiplayer_games SET joiner_id = $1, is_open = 2 WHERE roomid = $2 AND is_open = 1',
      [session.userId, roomId]
    );
    return result.rowCount > 0;
  });

  if (joined) {
    return NextResponse.json({ message: 'Successfully joined the room', success: true });
  }
  return NextResponse.json(
    { message: 'Room is no longer available or does not exist', success: false },
    { status: 410 }
  );
}
