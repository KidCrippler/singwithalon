// Viewer session ID resolution.
//
// A viewer's session ID groups their queue requests and authorizes removing their
// own entries. Precedence:
//   1. X-Session-Id header  — the client's stable per-room UUID (localStorage).
//      This is deployment-independent and immune to cross-origin cookie loss
//      (mobile Safari/ITP), which otherwise fragments one phone into many sessions.
//   2. singalong_viewer_session cookie — legacy fallback for older clients.
//   3. Freshly generated ID — only when neither is supplied (caller should then
//      set the cookie so a cookie-only client stays stable across requests).

export interface ResolvedSessionId {
  sessionId: string;
  // true only when both header and cookie were absent (caller should set the cookie)
  isNew: boolean;
}

export function generateSessionId(): string {
  return `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function resolveSessionId(
  headerSessionId: string | undefined,
  cookieSessionId: string | undefined,
  generate: () => string = generateSessionId
): ResolvedSessionId {
  const fromHeader = headerSessionId?.trim();
  if (fromHeader) {
    return { sessionId: fromHeader, isNew: false };
  }

  if (cookieSessionId) {
    return { sessionId: cookieSessionId, isNew: false };
  }

  return { sessionId: generate(), isNew: true };
}
