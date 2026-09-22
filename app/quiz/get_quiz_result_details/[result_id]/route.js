// Ported from app.py:
//   @app.route('/quiz/get_quiz_result_details/<int:result_id>', methods=['GET'])
//   def get_quiz_result_details(result_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';
import { getSession } from '../../../../lib/session';
import { unauthorized } from '../../../../lib/apiHelpers';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session.userId) return unauthorized();
  const userId = session.userId;
  const { result_id } = await params;

  const outcome = await withConnection(async (client) => {
    const resultRes = await client.query(
      'SELECT * FROM quiz_results WHERE id = $1 AND uid_submitquiz = $2',
      [result_id, userId]
    );
    const result = resultRes.rows[0];
    if (!result) {
      return { status: 404, body: { error: 'Quiz result not found or access denied' } };
    }

    let correctIds;
    let incorrectMap;
    let unansweredIds;
    try {
      correctIds = JSON.parse(result.correct_answers ?? '[]');
      incorrectMap = JSON.parse(result.incorrect_answers ?? '{}');
      unansweredIds = JSON.parse(result.unanswered_questions ?? '[]');
    } catch {
      return { status: 500, body: { error: 'Failed to parse quiz result data' } };
    }

    correctIds = correctIds.map((i) => parseInt(i, 10));
    unansweredIds = unansweredIds.map((i) => parseInt(i, 10));
    const incorrectMapInt = {};
    for (const [k, v] of Object.entries(incorrectMap)) {
      incorrectMapInt[parseInt(k, 10)] = v;
    }

    const allQuestionIds = [
      ...correctIds,
      ...Object.keys(incorrectMapInt).map(Number),
      ...unansweredIds,
    ];

    if (allQuestionIds.length === 0) {
      return {
        status: 200,
        body: {
          quiz_name: result.quiz_name,
          category: result.category,
          score: result.score,
          questions: [],
        },
      };
    }

    const questionsDbRes = await client.query(
      'SELECT id, question, option, correct_option FROM quizzes WHERE id = ANY($1)',
      [allQuestionIds]
    );
    const questionsMap = {};
    for (const q of questionsDbRes.rows) questionsMap[q.id] = q;

    const correctIdsSet = new Set(correctIds);
    const unansweredIdsSet = new Set(unansweredIds);

    const detailedQuestions = [];
    for (const qId of allQuestionIds) {
      const questionData = questionsMap[qId];
      if (!questionData) continue; // question was deleted from the DB since

      let options;
      try {
        options = JSON.parse(questionData.option);
      } catch {
        options = [];
      }

      const detail = {
        id: qId,
        question_text: questionData.question,
        options,
        correct_answer: questionData.correct_option,
        user_answer: null,
        status: '',
      };

      if (correctIdsSet.has(qId)) {
        detail.status = 'correct';
        detail.user_answer = questionData.correct_option;
      } else if (unansweredIdsSet.has(qId)) {
        detail.status = 'unanswered';
      } else if (qId in incorrectMapInt) {
        detail.status = 'incorrect';
        detail.user_answer = incorrectMapInt[qId];
      }

      detailedQuestions.push(detail);
    }

    return {
      status: 200,
      body: {
        quiz_name: result.quiz_name,
        category: result.category,
        score: result.score,
        questions: detailedQuestions,
      },
    };
  });

  return NextResponse.json(outcome.body, { status: outcome.status });
}
