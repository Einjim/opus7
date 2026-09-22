// Ported from app.py:
//   @app.route('/')
//   def index():
//       return render_template('signup.html')

import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.join(process.cwd(), 'html-pages', 'signup.html'), 'utf-8');

export async function GET() {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
