// Ported from app.py:
//   @app.route('/quiz/get_quizzes_by_category/<category>', methods=['GET'])
//   def get_quizzes_by_category(category): ...
// Generic route used by math.js/biology.js/chemistry.js/physics.js. The
// original had four copy-pasted per-subject versions of this same query;
// those were already dropped in the source app.py (their only frontend
// callers were dead/unreachable JS files) in favor of this one generic
// route, so there's nothing further to consolidate here.

import { NextResponse } from 'next/server';
import { withConnection } from '../../../../lib/db';

export async function GET(request, { params }) {
  const { category } = await params;

  const names = await withConnection(async (client) => {
    const result = await client.query('SELECT DISTINCT name FROM quizzes WHERE category = $1', [
      category,
    ]);
    return result.rows.map((quiz) => quiz.name);
  });

  return NextResponse.json(names);
}
