// Ported from app.py:
//   @app.route('/quiz/question/<int:island_id>')
//   def get_question(island_id): ...
// No session check in the original -- this route is public, unlike most
// others under /quiz/.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';
import { shuffleArray } from '../../../../lib/apiHelpers';

export async function GET(request, { params }) {
  const { island_id } = await params;

  const question = await withConnection(async (client) => {
    const result = await client.query(
      'SELECT * FROM questions WHERE island_id = $1 ORDER BY RANDOM() LIMIT 1',
      [island_id]
    );
    return result.rows[0] || null;
  });

  if (question) {
    const options = [question.correct_answer, question.option2, question.option3, question.option4];
    shuffleArray(options);
    return NextResponse.json({
      question: question.question,
      options,
      correct_answer: question.correct_answer,
    });
  }
  return NextResponse.json({ error: 'No questions found for this island' }, { status: 404 });
}
