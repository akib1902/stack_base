import 'dart:typed_data';

import '../models/vault.dart';
import 'crypto_error.dart';
import 'encoding.dart';
import 'file_format.dart';
import 'sodium_service.dart';
import 'vault.dart';

/// Share capability (SRS A7.2 / ADR-019). A share stores the version's data key
/// wrapped under a fresh 32-byte secret that only ever appears in the URL
/// fragment. The API therefore holds no key that can open shared content; the
/// recipient unwraps the data key locally and decrypts the same `stackbase/1`
/// ciphertext.
const int shareSecretBytes = 32;

class ShareCapability {
  const ShareCapability({required this.secret, required this.wrappedKey});

  /// The fragment secret; never sent to the API.
  final String secret;

  /// The version's data key, wrapped under the fragment secret.
  final WrappedKey wrappedKey;
}

Future<ShareCapability> createShareCapability({
  required Uint8List vaultKey,
  required EncryptionManifest manifest,
  SodiumService? sodium,
}) async {
  final service = sodium ?? await SodiumService.instance();
  final vault = VaultCrypto(service);
  final dataKey = await vault.unwrapDataKey(vaultKey, manifest.wrappedKey);
  final shareKey = service.newKey();
  final shareKeyBytes = shareKey.extractBytes();

  try {
    final wrappedKey = vault.sealDataKey(dataKey, shareKeyBytes);
    return ShareCapability(
      secret: toBase64Url(shareKeyBytes),
      wrappedKey: wrappedKey,
    );
  } finally {
    zeroBytes(dataKey);
    zeroBytes(shareKeyBytes);
    shareKey.dispose();
  }
}

/// Decrypts a public share with the fragment secret. The share's own wrapped
/// key replaces the manifest's vault-wrapped key, so the rest of the pinned
/// format checks (chunk layout, stream header, ciphertext SHA-256) still apply.
Future<Uint8List> decryptSharedBytes({
  required EncryptionManifest manifest,
  required WrappedKey wrappedKey,
  required String secret,
  required Uint8List ciphertext,
  SodiumService? sodium,
}) async {
  Uint8List shareKey;
  try {
    shareKey = fromBase64Url(secret);
  } on FormatException {
    throw const CryptoException(
      CryptoErrorCode.invalidShareKey,
      'This share link does not contain a valid share key.',
    );
  }
  final service = sodium ?? await SodiumService.instance();
  try {
    return await FileCrypto(service).decryptBytes(
      manifest: manifest.copyWith(wrappedKey: wrappedKey),
      vaultKey: shareKey,
      ciphertext: ciphertext,
    );
  } finally {
    zeroBytes(shareKey);
  }
}
