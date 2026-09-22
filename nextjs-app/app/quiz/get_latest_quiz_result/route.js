// Ported from app.py:
//   @app.route('/quiz/get_latest_quiz_result', methods=['GET'])
//   def get_latest_quiz_result(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const result = await withConnection(async (client) => {
    const res = await client.query(
      'SELECT * FROM quiz_results WHERE uid_submitquiz = $1 ORDER BY id DESC LIMIT 1',
      [session.userId]
    );
    return res.rows[0] || null;
  });

  if (!result) {
    return NextResponse.json({ message: 'No quiz results found' }, { status: 404 });
  }

  return NextResponse.json({
    quiz_name: result.quiz_name,
    category: result.category,
    score: result.score,
    total_questions: result.total_questions,
    correct_answers: result.correct_answers ? JSON.parse(result.correct_answers).length : 0,
    incorrect_answers: result.incorrect_answers
      ? Object.keys(JSON.parse(result.incorrect_answers)).length
      : 0,
    unanswered_questions: result.unanswered_questions
      ? JSON.parse(result.unanswered_questions).length
      : 0,
    start_time: result.start_time,
    duration: result.duration,
  });
}
