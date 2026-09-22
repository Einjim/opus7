// Ported from app.py:
//   @app.route('/create-account/<int:user_id>')
//   def create_account_page(user_id):
//       return render_template('create_account.html', user_id=user_id)

import fs from 'fs';
import path from 'path';

const template = fs.readFileSync(
  path.join(process.cwd(), 'html-pages', 'create-account.html'),
  'utf-8'
);

export async function GET(request, { params }) {
  const { user_id } = await params;

  // Flask's `<int:user_id>` converter 404s on a non-integer segment.
  if (!/^\d+$/.test(user_id)) {
    return new Response('Not Found', { status: 404 });
  }

  const html = template.replace('__USER_ID__', user_id);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
