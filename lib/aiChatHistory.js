// Ported as-is from app.py's AI_CHAT_HISTORY_BY_USER: a per-user, in-process
// history capped at 200 entries. The original code's own comment already
// flagged this as "in-process memory (lost on restart, not shared across
// worker processes); for real persistence this should move to the database
// like everything else" -- that limitation carries over unchanged, and if
// anything is *more* visible on serverless, where instances come and go
// more often than a long-lived gunicorn worker. Moving this to Postgres
// (a simple ai_chat_history table) would be a natural follow-up but is a
// behavior change, so it was left exactly as the original had it.

const MAX_PER_USER = 200;

const globalForChat = globalThis;
const store =
  globalForChat.__konkoorAiChatHistory || (globalForChat.__konkoorAiChatHistory = new Map());

export function appendChatEntry(userId, entry) {
  const history = store.get(userId) || [];
  history.push(entry);
  if (history.length > MAX_PER_USER) {
    history.splice(0, history.length - MAX_PER_USER);
  }
  store.set(userId, history);
  return history;
}

export function getChatHistory(userId) {
  return store.get(userId) || [];
}
