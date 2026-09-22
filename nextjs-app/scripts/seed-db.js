#!/usr/bin/env node
// Ported from app.py's init_db(), insert_quiz_data(), and
// insert_scheduled_quizzes(), which ran automatically at module import
// time -- i.e. once per gunicorn worker startup.
//
// There's no equivalent "runs once when the server starts" moment on
// Vercel: route handlers are invoked per-request, and running schema DDL
// as a side effect of random user traffic isn't a good idea in a
// serverless deployment. So this is a separate, explicit script instead:
// run it once after setting DATABASE_URL (`npm run db:seed`), and again
// any time you edit scripts/seed-data/quiz_questions.json. Everything
// here is exactly as idempotent as the original (CREATE TABLE IF NOT
// EXISTS, ON CONFLICT upserts), so re-running it is always safe.
//
// NOTE: the original creates the `islands` and `questions` tables (used
// by /quiz/progress and /quiz/question/<island_id>) but never seeds any
// rows into them anywhere in app.py either -- that data apparently gets
// populated some other way (directly in the DB). This script matches
// that: it creates both tables and leaves them empty, same as the
// original.

try {
  process.loadEnvFile?.('.env');
} catch {
  // no .env file present -- fine locally if env vars are set another way,
  // and expected on Vercel, which injects them directly.
}

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Set it in .env or your environment and re-run.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users
     (id SERIAL PRIMARY KEY,
     email TEXT,
     first_name TEXT,
     last_name TEXT,
     phone TEXT,
     birthday TEXT,
     username TEXT UNIQUE,
     password TEXT,
     bio TEXT,
     profile_picture TEXT,
     coins INTEGER DEFAULT 10000,
     gems INTEGER DEFAULT 500,
     streaks INTEGER DEFAULT 0,
     last_streak_date TEXT,
     hp INTEGER DEFAULT 5,
     age INTEGER,
     verified_email INTEGER DEFAULT 0,
     verified_phonenumber INTEGER DEFAULT 0)`,

  `CREATE TABLE IF NOT EXISTS quizzes
     (id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     category TEXT NOT NULL,
     year INTEGER,
     question TEXT NOT NULL,
     option TEXT NOT NULL,
     correct_option TEXT NOT NULL,
     question_tag TEXT,
     image TEXT)`,

  `CREATE TABLE IF NOT EXISTS comments
     (id SERIAL PRIMARY KEY,
     question_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
     comment_text TEXT NOT NULL,
     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS question_votes
     (id SERIAL PRIMARY KEY,
     question_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     vote_type TEXT NOT NULL,
     UNIQUE (question_id, user_id))`,

  `CREATE TABLE IF NOT EXISTS reply_votes
     (id SERIAL PRIMARY KEY,
     comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     vote_type TEXT NOT NULL,
     UNIQUE (comment_id, user_id))`,

  `CREATE TABLE IF NOT EXISTS quiz_results
     (id SERIAL PRIMARY KEY,
     uid_submitquiz INTEGER REFERENCES users(id) ON DELETE SET NULL,
     quiz_name TEXT NOT NULL,
     category TEXT NOT NULL,
     total_questions INTEGER,
     number_of_correct_answers INTEGER,
     number_of_incorrect_answers INTEGER,
     number_of_unanswered_questions INTEGER,
     correct_answers TEXT,
     incorrect_answers TEXT,
     unanswered_questions TEXT,
     start_time TEXT,
     duration INTEGER,
     score REAL)`,

  `CREATE TABLE IF NOT EXISTS multiplayer_games
     (roomid SERIAL PRIMARY KEY,
     quizname TEXT NOT NULL,
     creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     joiner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
     created_time TIMESTAMP NOT NULL,
     is_open INTEGER NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS messages
     (id SERIAL PRIMARY KEY,
     sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     message TEXT NOT NULL,
     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS teacherboard
     (id SERIAL PRIMARY KEY,
     teacher_name TEXT NOT NULL,
     categories TEXT NOT NULL DEFAULT 'زیست',
     course_name TEXT NOT NULL,
     year INTEGER,
     video_url TEXT,
     description TEXT,
     upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,

  `CREATE TABLE IF NOT EXISTS islands
     (id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     "order" INTEGER NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS user_progress
     (id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
     completed_islands TEXT DEFAULT '[]')`,

  `CREATE TABLE IF NOT EXISTS questions
     (id SERIAL PRIMARY KEY,
     island_id INTEGER REFERENCES islands(id) ON DELETE CASCADE,
     question TEXT NOT NULL,
     correct_answer TEXT NOT NULL,
     option2 TEXT NOT NULL,
     option3 TEXT NOT NULL,
     option4 TEXT NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS video_views
     (id SERIAL PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     video_id INTEGER NOT NULL REFERENCES teacherboard(id) ON DELETE CASCADE,
     watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE (user_id, video_id))`,

  `CREATE TABLE IF NOT EXISTS scheduled_quizzes
     (id SERIAL PRIMARY KEY,
     quiz_name TEXT NOT NULL,
     description TEXT,
     start_time TIMESTAMP NOT NULL,
     end_time TIMESTAMP NOT NULL,
     is_active BOOLEAN DEFAULT TRUE,
     UNIQUE (quiz_name, start_time))`,
];

const SCHEDULED_QUIZZES_TO_SEED = [
  [
    'کنکور 1403 تیر',
    'آزمون آزمایشی سراسری - فرصت ویژه برای همه!',
    '2025-07-11 22:05:00',
    '2025-07-12 23:00:00',
  ],
];

async function initDb(client) {
  for (const statement of CREATE_TABLE_STATEMENTS) {
    await client.query(statement);
  }
  console.log(`Created/verified ${CREATE_TABLE_STATEMENTS.length} tables.`);
}

async function insertQuizData(client) {
  const questionsPath = path.join(__dirname, 'seed-data', 'quiz_questions.json');
  let questions;
  try {
    questions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  } catch (e) {
    console.error(`Could not load quiz questions from ${questionsPath}:`, e.message);
    return;
  }

  for (const q of questions) {
    await client.query(
      `INSERT INTO quizzes (id, name, category, year, question, option, correct_option, question_tag, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         year = EXCLUDED.year,
         question = EXCLUDED.question,
         option = EXCLUDED.option,
         correct_option = EXCLUDED.correct_option,
         question_tag = EXCLUDED.question_tag,
         image = EXCLUDED.image`,
      [
        q.id,
        q.name,
        q.category,
        q.year ?? null,
        q.question,
        JSON.stringify(q.options),
        q.correct_option,
        q.question_tag ?? null,
        q.image ?? null,
      ]
    );
  }
  console.log(`Loaded ${questions.length} quiz question(s) from ${questionsPath}.`);
}

async function insertScheduledQuizzes(client) {
  for (const [quizName, description, startStr, endStr] of SCHEDULED_QUIZZES_TO_SEED) {
    await client.query(
      `INSERT INTO scheduled_quizzes (quiz_name, description, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (quiz_name, start_time) DO NOTHING`,
      [quizName, description, startStr, endStr]
    );
  }
  console.log('Scheduled quizzes have been configured.');
}

async function main() {
  const client = await pool.connect();
  try {
    await initDb(client);
    await insertQuizData(client);
    await insertScheduledQuizzes(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
