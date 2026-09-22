// Ported from app.py:
//   @app.route('/quiz/get_messages/<int:other_user_id>', methods=['GET'])
//   def get_messages(other_user_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';
import { getSession } from '../../../../lib/session';
import { unauthorized } from '../../../../lib/apiHelpers';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const { other_user_id } = await params;
  const userId = session.userId;

  const messages = await withConnection(async (client) => {
    const result = await client.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)
       ORDER BY timestamp ASC`,
      [userId, other_user_id, other_user_id, userId]
    );
    return result.rows;
  });

  return NextResponse.json({ success: true, messages });
}
