// Ported from app.py:
//   @app.route('/quiz/update_profile_picture', methods=['POST'])
//   def update_profile_picture(): ...
// (see app/create-account/route.js for the note on Vercel Blob replacing
// local-disk storage for uploads)

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { unauthorized, secureFilename } from '../../../lib/apiHelpers';

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) return unauthorized();

  const formData = await request.formData();
  const file = formData.get('profile_picture');

  if (!file || typeof file !== 'object' || file.size === 0) {
    return NextResponse.json({ error: 'No profile picture file provided' }, { status: 400 });
  }

  const userId = session.userId;
  const filename = secureFilename(`${userId}_${Date.now()}_${file.name}`);
  const blob = await put(`profile_pictures/${filename}`, file, {
    access: 'public',
    addRandomSuffix: true,
  });
  const profilePictureUrl = blob.url;

  await withConnection(async (client) => {
    await client.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [
      profilePictureUrl,
      userId,
    ]);
  });

  return NextResponse.json({ success: true, profile_picture: profilePictureUrl });
}
