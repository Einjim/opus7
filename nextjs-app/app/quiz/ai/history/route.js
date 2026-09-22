// Ported from app.py:
//   @app.route('/quiz/ai/history', methods=['GET'])
//   def ai_history(): ...

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { unauthorized } from '../../../../lib/apiHelpers';
import { getChatHistory } from '../../../../lib/aiChatHistory';

export async function GET() {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const history = getChatHistory(session.userId);
  return NextResponse.json({ success: true, history });
}
