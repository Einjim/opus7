// Ported from app.py:
//   @app.route('/quiz/ai/send', methods=['POST'])
//   def ai_send(): ...

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';
import { unauthorized } from '../../../../lib/apiHelpers';
import { geminiClient, GEMINI_MODEL_NAME } from '../../../../lib/gemini';
import { appendChatEntry } from '../../../../lib/aiChatHistory';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = (await request.json().catch(() => null)) || {};
  const userMessage = (data.message || '').trim();
  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const userId = session.userId;

  let aiText;
  try {
    const response = await geminiClient.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: userMessage,
    });
    aiText = response.text;
  } catch (e) {
    return NextResponse.json({ error: `AI request failed: ${e.message || e}` }, { status: 502 });
  }

  const timestamp = new Date().toISOString();
  appendChatEntry(userId, { role: 'user', text: userMessage, timestamp });
  appendChatEntry(userId, { role: 'ai', text: aiText, timestamp });

  return NextResponse.json({ success: true, reply: aiText });
}
