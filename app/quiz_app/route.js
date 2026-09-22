// Ported from app.py:
//   @app.route('/quiz_app')
//   def quiz_app():
//       if 'user_id' not in session:
//           return redirect(url_for('signin_page'))
//       return redirect(url_for('quiz_index'))

import { NextResponse } from 'next/server';
import { getSession } from '../../lib/session';

export async function GET(request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }
  return NextResponse.redirect(new URL('/quiz/', request.url));
}
