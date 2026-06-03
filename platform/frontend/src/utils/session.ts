// Per-room viewer session ID.
// Stable identifier for a viewer within a room, persisted in localStorage.
// Used to group a viewer's queue requests and to authorize removing their own entries.
// This is the source of truth for viewer identity — sent to the backend via the
// X-Session-Id header so it does not depend on cross-origin cookies (which mobile
// Safari/ITP may drop, fragmenting one phone into many sessions).

const SESSION_KEY_PREFIX = 'singalong:session:';

export function getRoomSessionId(username: string): string {
  const key = `${SESSION_KEY_PREFIX}${username}`;
  let storedSessionId = localStorage.getItem(key);

  if (!storedSessionId) {
    storedSessionId = crypto.randomUUID();
    localStorage.setItem(key, storedSessionId);
  }

  return storedSessionId;
}
