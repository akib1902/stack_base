/**
 * Every client-side crypto failure that a user can act on is one of these codes,
 * so the UI can branch on `code` and never on message text.
 */
export type CryptoErrorCode =
  | 'INVALID_PASSPHRASE'
  | 'WRONG_PASSPHRASE'
  | 'WRONG_VAULT_KEY'
  | 'UNSUPPORTED_MANIFEST'
  | 'INVALID_MANIFEST'
  | 'DECRYPTION_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'INVALID_SHARE_KEY';

export class CryptoError extends Error {
  readonly code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string) {
    super(message);
    this.name = 'CryptoError';
    this.code = code;
  }
}

/** Support copy for each code, kept next to the codes themselves. */
export const CRYPTO_ERROR_COPY: Record<CryptoErrorCode, string> = {
  INVALID_PASSPHRASE: 'Use a longer passphrase.',
  WRONG_PASSPHRASE: 'That passphrase does not unlock this vault.',
  WRONG_VAULT_KEY: 'This vault key does not match the vault that encrypted the file.',
  UNSUPPORTED_MANIFEST:
    'This file was encrypted with a newer format than this app understands.',
  INVALID_MANIFEST: 'The stored encryption metadata is inconsistent or damaged.',
  DECRYPTION_FAILED:
    'The encrypted stream failed its integrity check, so nothing was decrypted.',
  ENCRYPTION_FAILED: 'The file could not be encrypted on this device.',
  INVALID_SHARE_KEY:
    'This share link is incomplete or damaged: the part after # is missing or invalid.',
};
