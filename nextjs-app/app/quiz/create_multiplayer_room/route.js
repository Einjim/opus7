// Ported from app.py:
//   @app.route('/quiz/create_multiplayer_room', methods=['POST'])
//   def create_multiplayer_room(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const quizName = data.quiz_name;
  if (!quizName) {
    return NextResponse.json({ error: 'Quiz name is required' }, { status: 400 });
  }

  const roomId = await withConnection(async (client) => {
    const result = await client.query(
      'INSERT INTO multiplayer_games (quizname, creator_id, created_time, is_open) VALUES ($1, $2, $3, 1) RETURNING roomid',
      [quizName, session.userId, new Date()]
    );
    return result.rows[0].roomid;
  });

  return NextResponse.json({ message: 'Room created successfully', room_id: roomId }, { status: 201 });
}
