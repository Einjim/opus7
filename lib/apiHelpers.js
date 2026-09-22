import { NextResponse } from 'next/server';

/**
 * Mirrors the `if 'user_id' not in session: return jsonify({...}), 401`
 * guard repeated at the top of most routes in app.py. Returns the
 * logged-in user's id, or null (having already sent the 401 response)
 * if there isn't one.
 *
 * Usage:
 *   const session = await getSession();
 *   if (!session.userId) return unauthorized();
 */
export function unauthorized(message = 'User not authenticated') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Equivalent of Werkzeug's secure_filename(): strips path separators and
 * anything else that isn't safe as a single filename segment, so an
 * uploaded file's original name can't be used for path traversal or to
 * inject odd characters into a storage key.
 */
export function secureFilename(name) {
  return String(name)
    .replace(/[/\\]/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    || 'file';
}

/**
 * In-place Fisher-Yates shuffle, equivalent to Python's random.shuffle().
 * Several routes shuffle question/option order before sending them out.
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Equivalent of Python's random.sample(population, k) -- k unique
 * elements chosen at random, without replacement, order not guaranteed
 * to match Python's but drawn the same way (uniformly, no repeats). */
export function randomSample(population, k) {
  const copy = shuffleArray([...population]);
  return copy.slice(0, k);
}

/** Equivalent of Python's date.today().isoformat() -- server-local date
 * as 'YYYY-MM-DD'. Several routes track daily streaks using this format. */
export function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between two 'YYYY-MM-DD' strings (a - b), parsed
 * at UTC midnight so the subtraction is never thrown off by DST. */
export function daysBetweenDateStrings(a, b) {
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  return Math.round((da - db) / 86400000);
}

/** Equivalent of Python's round(x, 2), avoiding float-precision artifacts
 * that a plain Math.round(x * 100) / 100 can introduce. */
export function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Equivalent of markupsafe's escape(): the same stored-XSS defense used
 * in add_comment() and send_message() before saving user-supplied text
 * that other pages later render via innerHTML. */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&#34;');
}
