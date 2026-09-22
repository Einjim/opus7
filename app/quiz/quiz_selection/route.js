// Ported from app.py:
//   @app.route('/quiz/quiz_selection', methods=['POST'])
//   def quiz_selection(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const quizName = data.quiz_name;
  const userId = session.userId;
  const currentTime = new Date();

  const roomId = await withConnection(async (client) => {
    const result = await client.query(
      'INSERT INTO multiplayer_games (quizname, creator_id, created_time, is_open) VALUES ($1, $2, $3, 1) RETURNING roomid',
      [quizName, userId, currentTime]
    );
    return result.rows[0].roomid;
  });

  console.log(`Quiz Name: ${quizName}, User ID: ${userId}, Room ID: ${roomId}, Created Time: ${currentTime}`);
  return NextResponse.json({ message: 'Quiz selection received successfully', room_id: roomId });
}
