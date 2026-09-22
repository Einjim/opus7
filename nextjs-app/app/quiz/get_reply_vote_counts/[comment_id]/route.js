// Ported from app.py:
//   @app.route('/quiz/get_reply_vote_counts/<int:comment_id>', methods=['GET'])
//   def get_reply_vote_counts(comment_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { comment_id } = await params;

  const { likes, dislikes } = await withConnection(async (client) => {
    const likesResult = await client.query(
      "SELECT COUNT(*) FROM reply_votes WHERE comment_id = $1 AND vote_type = 'like'",
      [comment_id]
    );
    const dislikesResult = await client.query(
      "SELECT COUNT(*) FROM reply_votes WHERE comment_id = $1 AND vote_type = 'dislike'",
      [comment_id]
    );
    return {
      likes: parseInt(likesResult.rows[0].count, 10),
      dislikes: parseInt(dislikesResult.rows[0].count, 10),
    };
  });

  return NextResponse.json({ success: true, likes, dislikes });
}
