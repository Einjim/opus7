// Ported from app.py:
//   @app.route('/quiz/')
//   def quiz_index():
//       if 'user_id' not in session:
//           return redirect(url_for('signin_page'))
//       return send_from_directory(BASE_DIR, 'index.html')
//
// Flask's route was declared *with* a trailing slash, so a request to
// `/quiz` (no slash) 308-redirects to `/quiz/` before anything else runs.
// That trailing slash isn't cosmetic here: index.html's own relative
// asset links (`href="styles.css"`, `loadScript('/quiz/profile.js')`,
// etc.) only resolve correctly when the page's own URL ends in `/quiz/`.
// This middleware reproduces both the redirect and the auth gate; the
// authenticated request is then rewritten to the static copy of
// index.html at public/quiz/index.html (Next.js's normal static file
// serving handles every other /quiz/<path> asset automatically, since
// those are unchanged copies of the original files -- see public/quiz/).

import { NextResponse } from 'next/server';
import { getUserIdFromCookieValue, SESSION_COOKIE_NAME } from './lib/session';

// Proxy (the successor to Middleware) always runs on the Node.js runtime,
// so lib/session.js's use of Node's `crypto` module to hash
// FLASK_SECRET_KEY works here with no extra config -- unlike the old
// Middleware convention, which defaulted to the Edge runtime and doesn't
// support `crypto`.

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/quiz') {
    return NextResponse.redirect(new URL('/quiz/', request.url), 308);
  }

  if (pathname === '/quiz/') {
    const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const userId = await getUserIdFromCookieValue(cookieValue);
    if (!userId) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    const url = request.nextUrl.clone();
    url.pathname = '/quiz/index.html';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/quiz', '/quiz/'],
};
