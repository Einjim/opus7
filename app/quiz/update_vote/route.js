// Ported from app.py:
//   @app.route('/quiz/update_vote', methods=['POST'])
//   def update_vote(): ...

import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/session';
import { unauthorized } from '../../../lib/apiHelpers';
import { handleVote } from '../../../lib/voting';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const data = await request.json();
  const result = await handleVote('question_votes', 'question_id', data.question_id, session.userId, data.vote_type);
  return NextResponse.json(result);
}
