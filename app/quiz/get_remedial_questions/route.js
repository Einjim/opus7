// Ported from app.py:
//   @app.route('/quiz/get_remedial_questions', methods=['GET'])
//   def get_remedial_questions(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, shuffleArray, randomSample } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();
  const userId = session.userId;

  const result = await withConnection(async (client) => {
    const lastFiveResult = await client.query(
      'SELECT incorrect_answers FROM quiz_results WHERE uid_submitquiz = $1 ORDER BY id DESC LIMIT 5',
      [userId]
    );
    const lastFiveResults = lastFiveResult.rows;

    if (lastFiveResults.length === 0) {
      return { outcome: 'no_attempts' };
    }

    const incorrectQuestionIds = new Set();
    for (const row of lastFiveResults) {
      if (row.incorrect_answers && row.incorrect_answers !== 'null') {
        try {
          const incorrectDict = JSON.parse(row.incorrect_answers);
          Object.keys(incorrectDict).forEach((qid) => incorrectQuestionIds.add(parseInt(qid, 10)));
        } catch {
          continue;
        }
      }
    }

    if (incorrectQuestionIds.size === 0) {
      return { outcome: 'no_mistakes' };
    }

    const questionIdsToFetch = randomSample(
      [...incorrectQuestionIds],
      Math.min(5, incorrectQuestionIds.size)
    );

    const questionsResult = await client.query(
      'SELECT id, question, option FROM quizzes WHERE id = ANY($1)',
      [questionIdsToFetch]
    );

    return { outcome: 'ok', questions: questionsResult.rows };
  });

  if (result.outcome === 'no_attempts') {
    return NextResponse.json(
      { message: 'برای ایجاد آزمون رفع اشکال، ابتدا باید در چند آزمون شرکت کنید.' },
      { status: 404 }
    );
  }
  if (result.outcome === 'no_mistakes') {
    return NextResponse.json(
      { message: 'تبریک! شما در ۵ آزمون اخیر خود هیچ پاسخ اشتباهی نداشته‌اید.' },
      { status: 404 }
    );
  }

  const formattedQuestions = result.questions.map((q) => {
    let options;
    try {
      options = JSON.parse(q.option);
    } catch {
      options = [];
    }
    shuffleArray(options);
    return { id: q.id, text: q.question, options };
  });

  return NextResponse.json({
    testId: `remedial_${userId}_${Math.floor(Date.now() / 1000)}`,
    duration: 1800,
    questions: formattedQuestions,
  });
}
