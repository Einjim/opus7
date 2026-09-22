// Ported from app.py:
//   @app.route('/quiz/send_message', methods=['POST'])
//   def send_message(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, escapeHtml } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const senderId = session.userId;
  const receiverId = data.receiver_id;
  const message = data.message;

  if (!receiverId || !message) {
    return NextResponse.json({ success: false, error: 'Missing receiver_id or message' }, { status: 400 });
  }

  const safeMessage = escapeHtml(message);

  const result = await withConnection(async (client) => {
    const coinsResult = await client.query('SELECT coins FROM users WHERE id = $1', [senderId]);
    const userCoins = coinsResult.rows[0].coins;

    if (userCoins < 5) {
      return { insufficientCoins: true };
    }

    await client.query('UPDATE users SET coins = coins - 5 WHERE id = $1', [senderId]);
    await client.query(
      'INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)',
      [senderId, receiverId, safeMessage]
    );
    return { insufficientCoins: false };
  });

  if (result.insufficientCoins) {
    return NextResponse.json(
      { success: false, error: 'Insufficient coins to send message' },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, message: 'Message sent successfully', coins_deducted: 5 });
}
