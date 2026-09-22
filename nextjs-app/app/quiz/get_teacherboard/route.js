// Ported from app.py:
//   @app.route('/quiz/get_teacherboard', methods=['GET'])
//   def get_teacherboard(): ...

import { NextResponse } from 'next/server';
import { withConnection } from '../../../lib/db';

export async function GET() {
  const videos = await withConnection(async (client) => {
    const result = await client.query('SELECT * FROM teacherboard ORDER BY upload_date DESC');
    return result.rows;
  });

  return NextResponse.json(videos);
}
