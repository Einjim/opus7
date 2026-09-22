// Ported from app.py:
//   @app.route('/quiz/check_joiner/<int:room_id>', methods=['GET'])
//   def check_joiner(room_id): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { room_id } = await params;

  const result = await withConnection(async (client) => {
    const res = await client.query('SELECT joiner_id FROM multiplayer_games WHERE roomid = $1', [
      room_id,
    ]);
    return res.rows[0] || null;
  });

  return NextResponse.json({ has_joiner: Boolean(result && result.joiner_id) });
}
