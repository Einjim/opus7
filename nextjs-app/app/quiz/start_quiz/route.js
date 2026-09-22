// Ported from app.py:
//   @app.route('/quiz/start_quiz', methods=['POST'])
//   def start_quiz(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';
import { shuffleArray } from '../../../lib/apiHelpers';

export async function POST(request) {
  const data = await request.json();
  const quizName = data.quiz;
  const category = data.category;

  const questions = await withConnection(async (client) => {
    const result = category
      ? await client.query('SELECT * FROM quizzes WHERE name = $1 AND category = $2', [
          quizName,
          category,
        ])
      : await client.query('SELECT * FROM quizzes WHERE name = $1', [quizName]);
    return result.rows;
  });

  if (questions.length === 0) {
    return NextResponse.json(
      { message: `No questions found for ${quizName}`, quiz: quizName },
      { status: 404 }
    );
  }

  const formattedQuestions = questions.map((q) => {
    let options;
    try {
      options = JSON.parse(q.option);
    } catch {
      options = String(q.option || '')
        .split(',')
        .map((opt) => opt.trim());
    }
    shuffleArray(options);
    return { ...q, option: JSON.stringify(options) };
  });

  shuffleArray(formattedQuestions);

  return NextResponse.json({
    message: `Starting ${quizName}`,
    quiz: quizName,
    category: category,
    questions: formattedQuestions,
  });
}
