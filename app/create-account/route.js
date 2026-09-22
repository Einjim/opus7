// Ported from app.py:
//   @app.route('/create-account', methods=['POST'])
//   def create_account(): ...
//
// One real behavior change, called out in the project README: the
// original saved the uploaded profile picture to local disk
// (app.config['UPLOAD_FOLDER']). Vercel's functions don't have a
// persistent, writable disk, so this uploads to Vercel Blob instead and
// stores the returned URL -- same column, same purpose, different storage
// backend.

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { put } from '@vercel/blob';
import { withConnection, ApiEarlyReturn } from '../../lib/db';
import { getSession } from '../../lib/session';
import { secureFilename, withErrorHandling } from '../../lib/apiHelpers';

export const POST = withErrorHandling(async (request) => {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');
  const userId = formData.get('userId');
  const profilePicture = formData.get('profile_picture');

  try {
    await withConnection(async (client) => {
      const existing = await client.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (existing.rows.length > 0) {
        throw new ApiEarlyReturn(409, { error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let profilePictureUrl = null;
      if (profilePicture && typeof profilePicture === 'object' && profilePicture.size > 0) {
        const filename = secureFilename(`${userId}_${profilePicture.name}`);
        const blob = await put(`profile_pictures/${filename}`, profilePicture, {
          access: 'public',
          addRandomSuffix: true,
        });
        profilePictureUrl = blob.url;
      }

      await client.query(
        'UPDATE users SET username = $1, password = $2, profile_picture = $3 WHERE id = $4',
        [username, hashedPassword, profilePictureUrl, userId]
      );
    });
  } catch (err) {
    if (err instanceof ApiEarlyReturn) {
      return NextResponse.json(err.body, { status: err.status });
    }
    throw err;
  }

  // Log the user in immediately, same as the original.
  const session = await getSession();
  session.userId = parseInt(userId, 10);
  await session.save();

  return NextResponse.json(
    { message: 'Account created successfully', redirect: '/quiz_app' },
    { status: 200 }
  );
});
