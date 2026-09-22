// Ported from app.py:
//   @app.route('/quiz/videos/<path:filename>')
//   def serve_video(filename): return send_from_directory(VIDEO_UPLOAD_FOLDER, filename)
//
// Pre-existing videos are copied into public/quiz/videos/... and served
// directly by Next.js's static file handling -- those requests never
// reach this route at all (static files always take priority). This
// handler only ever runs for filenames that AREN'T a static file, i.e.
// videos uploaded after the migration, whose `video_url` is a
// percent-encoded full Vercel Blob URL (see app/quiz/upload_video). It
// decodes that and redirects the browser straight to Blob storage.

export async function GET(request, { params }) {
  const { filename } = await params;
  const joined = filename.join('/');

  try {
    const decoded = decodeURIComponent(joined);
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return Response.redirect(decoded, 307);
    }
  } catch {
    // not valid percent-encoding -- fall through to 404
  }

  return new Response('Not Found', { status: 404 });
}
