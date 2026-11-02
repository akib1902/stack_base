/**
 * Read-only expiry check used by the proxy. It does not verify the token; the
 * API remains the authority. A malformed token is treated as expiring so the
 * proxy attempts a refresh rather than trusting it.
 */
export function tokenExpiresWithin(token: string, seconds: number, now = Date.now()): boolean {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return true;

  try {
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= now + seconds * 1000;
  } catch {
    return true;
  }
}