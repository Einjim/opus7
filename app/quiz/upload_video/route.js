// Ported from app.py:
//   @app.route('/quiz/upload_video', methods=['POST'])
//   def upload_video(): ...
//
// teacherboard.js (unmodified) builds video <src> as `/quiz/videos/${video.video_url}`,
// so `video_url` has to keep working as a single path segment appended to
// that prefix. Pre-existing videos keep their original bare filename
// (e.g. "mistake_reviews/x.mp4") and are served directly as static files.
// For new uploads, local disk isn't available on Vercel, so this uploads
// to Vercel Blob and stores the full Blob URL *percent-encoded* as a
// single segment -- see app/quiz/videos/[...filename]/route.js, which
// decodes it and redirects. This is the one place the stored data format
// actually differs from the original; everything the frontend does with
// that value is unaffected.

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { withConnection } from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { secureFilename } from '../../../lib/apiHelpers';

function timestampPrefix() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export async function POST(request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'User not logged in' }, { status: 401 });
  }

  const formData = await request.formData();
  const video = formData.get('video');
  if (!video || typeof video !== 'object' || video.size === 0) {
    return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
  }

  const filename = secureFilename(video.name);
  const uniqueFilename = `${timestampPrefix()}_${filename}`;

  const blob = await put(`videos/${uniqueFilename}`, video, { access: 'public' });
  const videoUrlValue = encodeURIComponent(blob.url);

  await withConnection(async (client) => {
    await client.query(
      `INSERT INTO teacherboard (teacher_name, categories, course_name, year, video_url, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        formData.get('teacher_name'),
        formData.get('categories') || 'زیست',
        formData.get('course_name'),
        formData.get('year'),
        videoUrlValue,
        formData.get('description'),
      ]
    );
  });

  return NextResponse.json({ message: 'Video uploaded successfully' }, { status: 200 });
}
