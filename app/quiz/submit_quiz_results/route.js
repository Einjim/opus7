// Ported from app.py:
//   @app.route('/quiz/submit_quiz_results', methods=['POST'])
//   def submit_quiz_results(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, todayDateString, daysBetweenDateStrings, round2 } from '../../../lib/apiHelpers';

const REQUIRED_FIELDS = ['quizName', 'category', 'userAnswers', 'startTime', 'totalQuestions', 'allQuestionIds'];

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const hasAllFields =
    data && REQUIRED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(data, field));
  if (!hasAllFields) {
    return NextResponse.json({ error: 'Missing required fields in request' }, { status: 400 });
  }

  const uidSubmitquiz = session.userId;
  const userAnswers = data.userAnswers || {};
  const allQuestionIdsFromClient = data.allQuestionIds || [];

  let allQuestionIds;
  try {
    allQuestionIds = allQuestionIdsFromClient.map((qid) => {
      const n = Number(qid);
      if (!Number.isInteger(n)) throw new Error('not an integer');
      return n;
    });
  } catch {
    return NextResponse.json({ error: 'Invalid format for allQuestionIds' }, { status: 400 });
  }

  const totalQuestions = allQuestionIds.length;
  if (totalQuestions === 0) {
    return NextResponse.json({ message: 'Quiz submitted with no questions.', score: 0 });
  }

  const responsePayload = await withConnection(async (client) => {
    const correctAnswersResult = await client.query(
      'SELECT id, correct_option FROM quizzes WHERE id = ANY($1)',
      [allQuestionIds]
    );
    const correctAnswersDict = {};
    for (const row of correctAnswersResult.rows) {
      correctAnswersDict[String(row.id)] = row.correct_option;
    }

    const answeredIds = new Set(Object.keys(userAnswers));
    const allIds = new Set(allQuestionIds.map(String));

    const correctSet = new Set();
    for (const [qId, userAns] of Object.entries(userAnswers)) {
      if (userAns === correctAnswersDict[qId]) correctSet.add(qId);
    }
    const incorrectSet = new Set([...answeredIds].filter((id) => !correctSet.has(id)));
    const unansweredSet = new Set([...allIds].filter((id) => !answeredIds.has(id)));

    const incorrectDict = {};
    for (const qId of incorrectSet) incorrectDict[qId] = userAnswers[qId];

    const score =
      totalQuestions > 0
        ? round2(((correctSet.size - incorrectSet.size / 3) / totalQuestions) * 100)
        : 0;

    // Streak update
    const userResult = await client.query('SELECT streaks, last_streak_date FROM users WHERE id = $1', [
      uidSubmitquiz,
    ]);
    const user = userResult.rows[0];
    const todayDate = todayDateString();
    const lastStreakDate = user.last_streak_date || null;

    let newStreaks = user.streaks || 0;
    if (lastStreakDate === todayDate) {
      // already logged today -- no change, no query, matching the original's `pass` branch
    } else if (lastStreakDate && daysBetweenDateStrings(todayDate, lastStreakDate) === 1) {
      newStreaks += 1;
      await client.query('UPDATE users SET streaks = $1, last_streak_date = $2 WHERE id = $3', [
        newStreaks,
        todayDate,
        uidSubmitquiz,
      ]);
    } else {
      newStreaks = 1;
      await client.query('UPDATE users SET streaks = $1, last_streak_date = $2 WHERE id = $3', [
        newStreaks,
        todayDate,
        uidSubmitquiz,
      ]);
    }

    await client.query(
      `INSERT INTO quiz_results (
         uid_submitquiz, quiz_name, category, total_questions,
         number_of_correct_answers, number_of_incorrect_answers, number_of_unanswered_questions,
         correct_answers, incorrect_answers, unanswered_questions,
         start_time, duration, score
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        uidSubmitquiz,
        data.quizName,
        data.category,
        totalQuestions,
        correctSet.size,
        incorrectSet.size,
        unansweredSet.size,
        JSON.stringify([...correctSet]),
        JSON.stringify(incorrectDict),
        JSON.stringify([...unansweredSet]),
        data.startTime,
        (data.duration || 0) / 1000,
        score,
      ]
    );

    return {
      message: 'Quiz results submitted successfully',
      category: data.category,
      correctCount: correctSet.size,
      incorrectCount: incorrectSet.size,
      unansweredCount: unansweredSet.size,
      score,
    };
  });

  return NextResponse.json(responsePayload);
}
