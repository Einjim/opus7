// Ported from app.py:
//   @app.route('/quiz/get_single_player_quizzes', methods=['GET'])
//   def get_single_player_quizzes(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';

export async function GET() {
  const names = await withConnection(async (client) => {
    const result = await client.query('SELECT DISTINCT name FROM quizzes');
    return result.rows.map((quiz) => quiz.name);
  });

  return NextResponse.json(names);
}
