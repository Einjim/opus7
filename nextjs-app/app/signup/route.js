// Ported from app.py:
//   @app.route('/signup', methods=['POST'])
//   def signup(): ...

import { NextResponse } from 'next/server';
import { withConnection, ApiEarlyReturn } from '../../lib/db';

export async function POST(request) {
  const data = await request.json();

  try {
    const userId = await withConnection(async (client) => {
      const emailCheck = await client.query(
        'SELECT 1 FROM users WHERE email = $1 AND verified_email = 1',
        [data.email]
      );
      if (emailCheck.rows.length > 0) {
        throw new ApiEarlyReturn(400, { error: 'This email is already verified and in use' });
      }

      const phoneCheck = await client.query(
        'SELECT 1 FROM users WHERE phone = $1 AND verified_phonenumber = 1',
        [data.phone]
      );
      if (phoneCheck.rows.length > 0) {
        throw new ApiEarlyReturn(400, { error: 'This phone number is already verified and in use' });
      }

      const insertResult = await client.query(
        `INSERT INTO users
           (email, first_name, last_name, phone, birthday, verified_email, verified_phonenumber)
         VALUES ($1, $2, $3, $4, $5, 0, 0) RETURNING id`,
        [data.email, data.firstName, data.lastName, data.phone, data.birthday]
      );
      return insertResult.rows[0].id;
    });

    return NextResponse.json({ message: 'Signup successful', userId }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiEarlyReturn) {
      return NextResponse.json(err.body, { status: err.status });
    }
    throw err;
  }
}
