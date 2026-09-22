// Ported from app.py:
//   @app.route('/quiz/get_comments/<int:question_id>', methods=['GET'])
//   def get_comments(question_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { question_id } = await params;

  const comments = await withConnection(async (client) => {
    const result = await client.query(
      `SELECT c.id, c.user_id, c.parent_comment_id, c.comment_text, c.timestamp,
              u.username, u.first_name, u.last_name, u.profile_picture
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.question_id = $1
       ORDER BY c.timestamp ASC`,
      [question_id]
    );
    return result.rows;
  });

  return NextResponse.json({ success: true, comments });
}
