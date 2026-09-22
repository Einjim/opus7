// Ported from app.py:
//   @app.route('/quiz/add_comment', methods=['POST'])
//   def add_comment(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, escapeHtml } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const rawCommentText = data.comment_text || '';
  const safeCommentText = escapeHtml(rawCommentText);

  await withConnection(async (client) => {
    await client.query(
      'INSERT INTO comments (question_id, user_id, parent_comment_id, comment_text) VALUES ($1, $2, $3, $4)',
      [data.question_id, session.userId, data.parent_comment_id, safeCommentText]
    );
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
