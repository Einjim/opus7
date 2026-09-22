// Ported from app.py:
//   @app.route('/quiz/get_scheduled_quizzes', methods=['GET'])
//   def get_scheduled_quizzes(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';

export async function GET() {
  const now = new Date();

  const activeQuizzes = await withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, quiz_name, description,
              to_char(start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_time,
              to_char(end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as end_time
       FROM scheduled_quizzes
       WHERE is_active = TRUE AND start_time <= $1 AND end_time >= $2
       ORDER BY start_time DESC`,
      [now, now]
    );
    return result.rows;
  });

  return NextResponse.json(activeQuizzes);
}
