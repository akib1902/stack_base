/// Every client-side crypto failure a user can act on is one of these codes, so
/// the UI branches on [CryptoException.code] and never on message text.
enum CryptoErrorCode {
  invalidPassphrase,
  wrongPassphrase,
  wrongVaultKey,
  unsupportedManifest,
  invalidManifest,
  decryptionFailed,
  encryptionFailed,
  invalidShareKey,
}

class CryptoException implements Exception {
  const CryptoException(this.code, this.message);

  final CryptoErrorCode code;
  final String message;

  @override
  String toString() => 'CryptoException(${code.name}): $message';
}

/// User-facing copy for each code, kept beside the codes themselves.
const Map<CryptoErrorCode, String> cryptoErrorCopy = {
  CryptoErrorCode.invalidPassphrase: 'Use a passphrase with at least 12 characters.',
  CryptoErrorCode.wrongPassphrase: 'That passphrase does not unlock this vault.',
  CryptoErrorCode.wrongVaultKey: 'This key does not match the vault that encrypted the file.',
  CryptoErrorCode.unsupportedManifest:
      'This file was encrypted with a format this app does not understand.',
  CryptoErrorCode.invalidManifest: 'The stored encryption metadata is inconsistent or damaged.',
  CryptoErrorCode.decryptionFailed:
      'The encrypted stream failed its integrity check, so nothing was decrypted.',
  CryptoErrorCode.encryptionFailed: 'The file could not be encrypted on this device.',
  CryptoErrorCode.invalidShareKey: 'This share link is incomplete or damaged.',
};
