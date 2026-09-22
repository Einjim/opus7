// Postgres access, ported from the original Flask app's psycopg2
// ThreadedConnectionPool + get_db_connection() context manager.
//
// Node's `pg` Pool plays the same role psycopg2's pool did: a small set of
// already-open connections reused across requests instead of connecting
// fresh every time. On Vercel, a warm function instance reuses the same
// pool across invocations (via the global cache below), same as the
// original pool was reused across requests within one gunicorn worker.
//
// NOTE ON PLACEHOLDERS: psycopg2 uses `%s` positional placeholders; `pg`
// uses `$1, $2, ...`. Every query ported from app.py had its placeholders
// converted accordingly -- the SQL text and logic are otherwise unchanged.

import { Pool } from 'pg';

const DB_POOL_MAX_CONN = parseInt(process.env.DB_POOL_MAX_CONN || '20', 10);

function createPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: DB_POOL_MAX_CONN,
  });
}

// Cache the pool on `global` so Next.js's dev-mode module reloading (and
// repeated warm invocations of the same serverless instance) don't each
// spin up a brand new pool.
const globalForDb = globalThis;
export const pool = globalForDb.__konkoorDbPool || (globalForDb.__konkoorDbPool = createPool());

/**
 * Runs `fn` with a client checked out from the pool, wrapped in an explicit
 * BEGIN/COMMIT/ROLLBACK.
 *
 * This wrapping matters for fidelity, not just safety: psycopg2 connections
 * default to an *implicit* transaction that the original code committed
 * explicitly with `conn.commit()` (and never committed at all for
 * read-only routes, relying on the connection going back to the pool
 * un-committed). `pg` instead auto-commits every statement individually
 * unless a transaction is opened explicitly. Wrapping every call here in
 * BEGIN/COMMIT reproduces the original's atomicity for multi-statement
 * routes (e.g. submit_quiz_results' streak-update-then-insert) and is a
 * no-op for pure reads, so one helper matches both cases.
 *
 * On any error, the transaction is rolled back before the client goes back
 * to the pool -- mirroring the original's behavior of never returning a
 * connection to the pool with a dangling open transaction.
 *
 * Usage: await withConnection(async (client) => { ... client.query(...) ... })
 */
export async function withConnection(fn) {
  if (!pool) {
    throw new Error('DATABASE_URL is not set; cannot get a DB connection.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors, same as the original's `except psycopg2.Error: pass`
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * For the rare route that needs to return an HTTP response with a
 * different status *without* it being an error (e.g. "this email is
 * already taken" -> 400, not a 500). Throwing this from inside
 * withConnection still triggers its rollback (harmless -- nothing was
 * written yet in these cases) and the route handler catches it to build
 * the actual response.
 */
export class ApiEarlyReturn extends Error {
  constructor(status, body) {
    super('ApiEarlyReturn');
    this.status = status;
    this.body = body;
  }
}
