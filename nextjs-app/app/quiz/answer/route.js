// Ported from app.py:
//   @app.route('/quiz/answer', methods=['POST'])
//   def submit_answer(): ...
//
// NOTE on streak logic here vs. submit_quiz_results: this route always
// re-runs the streaks UPDATE (even when the day-diff is 0, writing back
// the same value), where submit_quiz_results explicitly skips the update
// on a same-day resubmission. That's a real difference between the two
// routes in the original code, not a mistake -- preserved as-is.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { todayDateString, daysBetweenDateStrings } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'User not logged in' }, { status: 401 });
  }
  const userId = session.userId;

  const data = await request.json();
  const islandNumber = data.islandNumber;
  const isCorrect = data.isCorrect;

  if (!isCorrect) {
    await withConnection(async (client) => {
      await client.query('UPDATE users SET hp = hp - 1 WHERE id = $1', [userId]);
    });
    return NextResponse.json({ success: true, message: 'Incorrect answer, HP deducted.' });
  }

  const newStreaks = await withConnection(async (client) => {
    const userResult = await client.query('SELECT streaks, last_streak_date FROM users WHERE id = $1', [
      userId,
    ]);
    const user = userResult.rows[0];

    const today = todayDateString();
    const lastStreakDate = user.last_streak_date || null;

    let streaks = user.streaks;
    if (lastStreakDate) {
      const diff = daysBetweenDateStrings(today, lastStreakDate);
      if (diff === 1) {
        streaks += 1;
      } else if (diff > 1) {
        streaks = 1;
      }
      // diff === 0 (or negative): streaks unchanged, but the row is still
      // rewritten below, matching the original exactly.
    } else {
      streaks = 1;
    }

    await client.query('UPDATE users SET streaks = $1, last_streak_date = $2 WHERE id = $3', [
      streaks,
      today,
      userId,
    ]);

    const progressResult = await client.query(
      'SELECT completed_islands FROM user_progress WHERE user_id = $1',
      [userId]
    );
    const progress = progressResult.rows[0];
    const completed = new Set(JSON.parse(progress.completed_islands));
    completed.add(islandNumber);
    await client.query('UPDATE user_progress SET completed_islands = $1 WHERE user_id = $2', [
      JSON.stringify([...completed]),
      userId,
    ]);

    return streaks;
  });

  return NextResponse.json({ success: true, message: 'Correct! Progress saved.', streaks: newStreaks });
}
