// Ported from app.py:
//   @app.route('/quiz/get_vote_counts/<int:question_id>', methods=['GET'])
//   def get_vote_counts(question_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { question_id } = await params;

  const { likes, dislikes } = await withConnection(async (client) => {
    const likesResult = await client.query(
      "SELECT COUNT(*) FROM question_votes WHERE question_id = $1 AND vote_type = 'like'",
      [question_id]
    );
    const dislikesResult = await client.query(
      "SELECT COUNT(*) FROM question_votes WHERE question_id = $1 AND vote_type = 'dislike'",
      [question_id]
    );
    return {
      likes: parseInt(likesResult.rows[0].count, 10),
      dislikes: parseInt(dislikesResult.rows[0].count, 10),
    };
  });

  return NextResponse.json({ success: true, likes, dislikes });
}
