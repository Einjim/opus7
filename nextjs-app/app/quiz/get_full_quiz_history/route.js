// Ported from app.py:
//   @app.route('/quiz/get_full_quiz_history', methods=['GET'])
//   def get_full_quiz_history(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();
  const userId = session.userId;

  const history = await withConnection(async (client) => {
    const items = [];

    const singlePlayerResult = await client.query(
      'SELECT id, quiz_name, score, start_time FROM quiz_results WHERE uid_submitquiz = $1',
      [userId]
    );
    for (const res of singlePlayerResult.rows) {
      items.push({
        type: 'single',
        result_id: res.id,
        quiz_name: res.quiz_name,
        score: res.score,
        date: res.start_time,
      });
    }

    const multiplayerResult = await client.query(
      `SELECT
         mg.quizname, mg.created_time,
         mg.creator_id, c.username AS creator_username, c.profile_picture AS creator_pp,
         mg.joiner_id, j.username AS joiner_username, j.profile_picture AS joiner_pp
       FROM multiplayer_games mg
       JOIN users c ON mg.creator_id = c.id
       LEFT JOIN users j ON mg.joiner_id = j.id
       WHERE (mg.creator_id = $1 OR mg.joiner_id = $2) AND mg.joiner_id IS NOT NULL`,
      [userId, userId]
    );

    for (const res of multiplayerResult.rows) {
      let opponentUsername = '';
      let opponentProfilePicture = null;

      if (res.creator_id === userId) {
        opponentUsername = res.joiner_username;
        opponentProfilePicture = res.joiner_pp;
      } else {
        opponentUsername = res.creator_username;
        opponentProfilePicture = res.creator_pp;
      }

      items.push({
        type: 'multiplayer',
        quiz_name: res.quizname,
        opponent: opponentUsername,
        opponent_profile_picture: opponentProfilePicture,
        date: res.created_time.toISOString(),
      });
    }

    items.sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      if (da < db) return 1;
      if (da > db) return -1;
      return 0;
    });

    return items;
  });

  return NextResponse.json({ history });
}
