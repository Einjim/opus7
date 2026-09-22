// Ported from app.py:
//   @app.route('/quiz/get_progress_test_questions', methods=['GET'])
//   def get_progress_test_questions(): ...
// Pool 1: unanswered questions from the user's last 5 attempts.
// Pool 2 (if pool 1 has fewer than 5): questions the user has never
// interacted with at all, sampled server-side rather than via
// `ORDER BY RANDOM()` -- see the original's own perf-fix comment, kept
// here since the id-list-then-sample approach is what it actually does.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, shuffleArray, randomSample } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();
  const userId = session.userId;

  const result = await withConnection(async (client) => {
    // POOL 1
    const unansweredQuestionIds = new Set();
    const lastFiveResult = await client.query(
      'SELECT unanswered_questions FROM quiz_results WHERE uid_submitquiz = $1 ORDER BY id DESC LIMIT 5',
      [userId]
    );
    for (const row of lastFiveResult.rows) {
      if (row.unanswered_questions) {
        try {
          const ids = JSON.parse(row.unanswered_questions);
          ids.forEach((qid) => unansweredQuestionIds.add(parseInt(qid, 10)));
        } catch {
          continue;
        }
      }
    }

    let questionsToFetch = [...unansweredQuestionIds];

    // POOL 2
    if (questionsToFetch.length < 5) {
      const allInteractedIds = new Set();
      const allResultsResult = await client.query(
        'SELECT correct_answers, incorrect_answers, unanswered_questions FROM quiz_results WHERE uid_submitquiz = $1',
        [userId]
      );
      for (const row of allResultsResult.rows) {
        for (const field of ['correct_answers', 'unanswered_questions']) {
          if (row[field]) {
            try {
              const ids = JSON.parse(row[field]);
              ids.forEach((qid) => allInteractedIds.add(parseInt(qid, 10)));
            } catch {
              continue;
            }
          }
        }
        if (row.incorrect_answers) {
          try {
            Object.keys(JSON.parse(row.incorrect_answers)).forEach((qid) =>
              allInteractedIds.add(parseInt(qid, 10))
            );
          } catch {
            continue;
          }
        }
      }
      unansweredQuestionIds.forEach((id) => allInteractedIds.add(id));

      const neededCount = 5 - questionsToFetch.length;

      const candidateIdsResult =
        allInteractedIds.size === 0
          ? await client.query('SELECT id FROM quizzes')
          : await client.query('SELECT id FROM quizzes WHERE id != ALL($1)', [[...allInteractedIds]]);

      const candidateIds = candidateIdsResult.rows.map((row) => row.id);
      const unseenIds = randomSample(candidateIds, Math.min(neededCount, candidateIds.length));
      questionsToFetch = questionsToFetch.concat(unseenIds);
    }

    if (questionsToFetch.length === 0) {
      return {
        outcome: 'no_questions',
        message:
          'هیچ سوالی برای ایجاد آزمون پیشرفت یافت نشد. به نظر می‌رسد شما به تمام سوالات موجود پاسخ داده‌اید.',
      };
    }

    let finalIds = [...new Set(questionsToFetch)];
    if (finalIds.length > 5) {
      finalIds = randomSample(finalIds, 5);
    }

    if (finalIds.length === 0) {
      return {
        outcome: 'no_questions',
        message: 'با وجود تلاش، سوال مناسبی برای شما یافت نشد. لطفا در آزمون‌های بیشتری شرکت کنید.',
      };
    }

    const questionsDataResult = await client.query('SELECT * FROM quizzes WHERE id = ANY($1)', [
      finalIds,
    ]);
    const questionsData = questionsDataResult.rows;

    if (questionsData.length === 0) {
      return { outcome: 'fetch_failed' };
    }

    const formattedQuestions = questionsData.map((qData) => {
      let options;
      try {
        options = JSON.parse(qData.option);
      } catch {
        options = String(qData.option || '')
          .split(',')
          .map((opt) => opt.trim());
      }
      if (!options.includes(qData.correct_option)) {
        options.push(qData.correct_option);
      }
      shuffleArray(options);
      return { id: qData.id, text: qData.question, options };
    });
    shuffleArray(formattedQuestions);

    return { outcome: 'ok', questions: formattedQuestions };
  });

  if (result.outcome === 'no_questions') {
    return NextResponse.json(
      { error: 'No questions available', message: result.message },
      { status: 404 }
    );
  }
  if (result.outcome === 'fetch_failed') {
    return NextResponse.json({ error: 'Could not retrieve question details' }, { status: 500 });
  }

  return NextResponse.json({
    testId: `progress_${userId}_${Math.floor(Date.now() / 1000)}`,
    quizName: 'آزمون پیشرفت',
    category: 'Progress',
    duration: 1800,
    questions: result.questions,
  });
}
