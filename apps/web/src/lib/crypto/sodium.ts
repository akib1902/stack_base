import sodium from 'libsodium-wrappers-sumo';

/**
 * The sumo build carries Argon2id and the secretstream API; the base build does
 * not. It is loaded lazily and initialised once per page/worker, so no crypto
 * code runs during module import (the API itself has no side effects either).
 */
export type Sodium = typeof sodium;

let loading: Promise<Sodium> | null = null;

export async function getSodium(): Promise<Sodium> {
  loading ??= sodium.ready.then(() => sodium);
  return loading;
}

/** Test/CLI seam: lets a caller await readiness without importing the build twice. */
export function resetSodiumForTests(): void {
  loading = null;
}
