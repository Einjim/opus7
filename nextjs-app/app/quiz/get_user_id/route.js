// Ported from app.py:
//   @app.route('/quiz/get_user_id', methods=['GET'])
//   def get_user_id(): ...

import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';

export async function GET() {
  const session = await getSession();
  if (session.userId) {
    return NextResponse.json({ success: true, user_id: session.userId });
  }
  return NextResponse.json({ success: false, error: 'User not logged in' }, { status: 401 });
}
