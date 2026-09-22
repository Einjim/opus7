// Ported from app.py:
//   @app.route('/quiz/get_last_ten_quiz_results', methods=['GET'])
//   def get_last_ten_quiz_results(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const results = await withConnection(async (client) => {
    const result = await client.query(
      'SELECT * FROM quiz_results WHERE uid_submitquiz = $1 ORDER BY id DESC LIMIT 10',
      [session.userId]
    );
    return result.rows;
  });

  if (results.length === 0) {
    return NextResponse.json({ message: 'No quiz results found' }, { status: 404 });
  }

  return NextResponse.json(
    results.map((res) => ({
      quiz_name: res.quiz_name,
      category: res.category,
      score: res.score,
      total_questions: res.total_questions,
      correct_answers: JSON.parse(res.correct_answers).length,
      incorrect_answers: Object.keys(JSON.parse(res.incorrect_answers)).length,
      unanswered_questions: JSON.parse(res.unanswered_questions).length,
      start_time: res.start_time,
      duration: res.duration,
    }))
  );
}
