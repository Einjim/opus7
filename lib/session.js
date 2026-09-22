// Session handling, ported from Flask's signed-cookie session
// (`session['user_id']`, `app.secret_key`, `app.permanent_session_lifetime`).
//
// Flask signs a cookie with itsdangerous; there's no drop-in equivalent in
// Node, so this uses iron-session, which does the same job (an encrypted,
// tamper-proof cookie) with a well-maintained library instead of a
// hand-rolled signer.
//
// NOTE: this means existing users' browser cookies from the Flask app will
// not carry over -- the cookie *format* is different, not just re-signed.
// Everyone will simply need to sign in again once, which is the expected,
// one-time cost of swapping the whole backend stack. Nothing about their
// account (password, profile, coins, history, etc.) is affected, since all
// of that lives in Postgres, untouched.
//
// iron-session requires its `password` to be >= 32 characters. Rather than
// asking you to generate a brand new secret, we hash whatever
// FLASK_SECRET_KEY already is (any length) into a 64-character hex string,
// so the exact same .env value from the Flask app keeps working unchanged.

import { getIronSession, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const rawSecret = process.env.FLASK_SECRET_KEY || 'dev-only-fallback-change-me';
const sessionPassword = crypto.createHash('sha256').update(rawSecret).digest('hex');

export const SESSION_COOKIE_NAME = 'konkoor_session';
// 365 days, matching `app.permanent_session_lifetime = timedelta(days=365)`.
export const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const sessionOptions = {
  password: sessionPassword,
  cookieName: SESSION_COOKIE_NAME,
  ttl: SESSION_MAX_AGE_SECONDS,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: 'lax',
    httpOnly: true,
    path: '/',
  },
};

/**
 * Gets the current request's session inside a Route Handler or Server
 * Component. `session.userId` mirrors Flask's `session['user_id']`;
 * `session.save()` persists it (sets the cookie); `session.destroy()`
 * clears it.
 */
export async function getSession() {
  return getIronSession(await cookies(), sessionOptions);
}

/**
 * Reads and verifies the session cookie from a raw cookie string value,
 * for use in Middleware (which doesn't have access to next/headers'
 * cookies()). Returns the userId, or null if there's no valid session.
 */
export async function getUserIdFromCookieValue(cookieValue) {
  if (!cookieValue) return null;
  try {
    const data = await unsealData(cookieValue, { password: sessionPassword });
    return data.userId ?? null;
  } catch {
    return null;
  }
}
