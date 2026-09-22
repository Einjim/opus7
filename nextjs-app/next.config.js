/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The original app serves its main page at the literal URL `/quiz/`
  // (trailing slash), and that page's own unmodified relative asset
  // links (`href="styles.css"`, etc.) only resolve correctly at that
  // exact URL. Next's default trailing-slash normalization actively
  // fights this (it strips trailing slashes, including rewriting
  // Location headers on redirects -- which turns proxy.js's own
  // `/quiz` -> `/quiz/` redirect into a `/quiz` -> `/quiz` no-op and an
  // infinite loop). This opts out of that default so proxy.js can own
  // trailing-slash handling for this one path itself.
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
