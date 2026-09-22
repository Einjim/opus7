// Ported from app.py:
//   @app.route('/quiz/cancel_room/<int:room_id>', methods=['POST'])
//   def cancel_room(room_id): ...
//
// Lets a room's creator close it while it's still waiting for an
// opponent. Only the creator can cancel, and only before anyone has
// joined -- once a joiner is present the game has effectively started.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';
import { getSession } from '../../../../lib/session';
import { unauthorized } from '../../../../lib/apiHelpers';

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const { room_id } = await params;

  const deleted = await withConnection(async (client) => {
    const result = await client.query(
      'DELETE FROM multiplayer_games WHERE roomid = $1 AND creator_id = $2 AND joiner_id IS NULL',
      [room_id, session.userId]
    );
    return result.rowCount > 0;
  });

  if (deleted) {
    return NextResponse.json({ success: true, message: 'Room closed successfully' });
  }
  return NextResponse.json(
    { success: false, message: 'Room not found, not yours, or already joined' },
    { status: 409 }
  );
}
