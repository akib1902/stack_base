import 'dart:async';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:sodium/sodium_sumo.dart';

import '../models/vault.dart';
import 'crypto_error.dart';
import 'encoding.dart';
import 'sodium_service.dart';

/// Vault key hierarchy of `stackbase/1`
/// (docs/architecture/encryption-format.md): Argon2id13 derives a KEK from the
/// passphrase, the KEK wraps a random 32-byte vault key, and every file version
/// gets its own data key wrapped by the vault key.
///
/// The vault key returned by [createVault] and [unlockVault] is caller-owned
/// Dart memory. Callers must zero it on lock/sign-out; it is never persisted.
class VaultCrypto {
  VaultCrypto(this._sodium);

  final SodiumService _sodium;

  static const int minPassphraseLength = 12;

  static void assertPassphraseUsable(String passphrase) {
    if (passphrase.length < minPassphraseLength) {
      throw const CryptoException(
        CryptoErrorCode.invalidPassphrase,
        'Use a passphrase with at least 12 characters.',
      );
    }
  }

  /// Creates a new vault with a random salt and vault key. Only the request
  /// (ciphertext and non-secret parameters) may be sent to the API.
  Future<CreatedVault> createVault(
    String passphrase, {
    VaultKdfProfile profile = defaultVaultKdfProfile,
  }) async {
    assertPassphraseUsable(passphrase);
    final salt = _sodium.randomBytes(argon2idSaltBytes);
    final kekBytes = await _deriveKek(
      passphrase,
      salt,
      profile.opsLimit,
      profile.memLimitBytes,
    );
    final kek = _sodium.keyFromBytes(kekBytes);
    final vaultKey = _sodium.newKey();
    final vaultKeyBytes = vaultKey.extractBytes();

    try {
      final request = CreateVaultRequest(
        kdf: VaultKdf(
          algorithm: 'argon2id13',
          opsLimit: profile.opsLimit,
          memLimitBytes: profile.memLimitBytes,
          salt: toBase64(salt),
        ),
        wrappedVaultKey: _seal(vaultKeyBytes, kek),
        recoveryVerifier: _recoveryVerifier(vaultKey),
      );
      return CreatedVault(
        request: request,
        vaultKey: Uint8List.fromList(vaultKeyBytes),
      );
    } finally {
      zeroBytes(vaultKeyBytes);
      vaultKey.dispose();
      kek.dispose();
      zeroBytes(kekBytes);
    }
  }

  /// Rebuilds the KEK, opens the wrapped vault key and checks the recovery
  /// verifier. A wrong passphrase fails the secretbox MAC inside
  /// `crypto_secretbox_open_easy`; the verifier proves the recovered key is the
  /// one the vault was created with.
  Future<Uint8List> unlockVault(
    VaultRecord record,
    String passphrase,
  ) async {
    final salt = fromBase64(record.kdf.salt);
    final kekBytes = await _deriveKek(
      passphrase,
      salt,
      record.kdf.opsLimit,
      record.kdf.memLimitBytes,
    );
    final kek = _sodium.keyFromBytes(kekBytes);

    try {
      Uint8List vaultKeyBytes;
      try {
        vaultKeyBytes = _sodium.raw.crypto.secretBox.openEasy(
          cipherText: fromBase64(record.wrappedVaultKey.ciphertext),
          nonce: fromBase64(record.wrappedVaultKey.nonce),
          key: kek,
        );
      } catch (_) {
        throw const CryptoException(
          CryptoErrorCode.wrongPassphrase,
          'That passphrase does not unlock this vault.',
        );
      }

      if (vaultKeyBytes.length != secretboxKeyBytes) {
        zeroBytes(vaultKeyBytes);
        throw const CryptoException(
          CryptoErrorCode.wrongPassphrase,
          'That passphrase does not unlock this vault.',
        );
      }

      final vaultKey = _sodium.keyFromBytes(vaultKeyBytes);
      try {
        final verifier = _sodium.raw.crypto.secretBox.openEasy(
          cipherText: fromBase64(record.recoveryVerifier.ciphertext),
          nonce: fromBase64(record.recoveryVerifier.nonce),
          key: vaultKey,
        );
        if (!equalBytes(verifier, utf8Bytes(recoveryVerifierPlaintext))) {
          zeroBytes(vaultKeyBytes);
          throw const CryptoException(
            CryptoErrorCode.wrongVaultKey,
            'The recovered key does not match this vault.',
          );
        }
      } catch (error) {
        if (error is CryptoException) rethrow;
        zeroBytes(vaultKeyBytes);
        throw const CryptoException(
          CryptoErrorCode.wrongVaultKey,
          'The recovered key does not match this vault.',
        );
      } finally {
        vaultKey.dispose();
      }

      return vaultKeyBytes;
    } finally {
      kek.dispose();
      zeroBytes(kekBytes);
    }
  }

  /// Wraps one file version's data key under the vault key.
  Future<WrappedKey> wrapDataKey(Uint8List vaultKey, Uint8List dataKey) {
    _requireKeyLength(vaultKey);
    _requireKeyLength(dataKey);
    final wrappingKey = _sodium.keyFromBytes(vaultKey);
    try {
      return Future.value(_seal(dataKey, wrappingKey));
    } finally {
      wrappingKey.dispose();
    }
  }

  /// Re-wraps an existing data key under an arbitrary wrapping key. Used by the
  /// share capability, where the wrapping key is the link secret.
  WrappedKey sealDataKey(Uint8List dataKey, Uint8List wrappingKey) {
    _requireKeyLength(dataKey);
    _requireKeyLength(wrappingKey);
    final key = _sodium.keyFromBytes(wrappingKey);
    try {
      return _seal(dataKey, key);
    } finally {
      key.dispose();
    }
  }

  Future<Uint8List> unwrapDataKey(
    Uint8List vaultKey,
    WrappedKey wrappedKey,
  ) async {
    _requireKeyLength(vaultKey);
    final key = _sodium.keyFromBytes(vaultKey);
    try {
      final dataKey = _sodium.raw.crypto.secretBox.openEasy(
        cipherText: fromBase64(wrappedKey.ciphertext),
        nonce: fromBase64(wrappedKey.nonce),
        key: key,
      );
      if (dataKey.length != secretboxKeyBytes) {
        zeroBytes(dataKey);
        throw const CryptoException(
          CryptoErrorCode.wrongVaultKey,
          'The wrapped data key has the wrong length.',
        );
      }
      return dataKey;
    } catch (error) {
      if (error is CryptoException) rethrow;
      throw const CryptoException(
        CryptoErrorCode.wrongVaultKey,
        'This vault key does not open the file data key.',
      );
    } finally {
      key.dispose();
    }
  }

  WrappedKey _seal(Uint8List message, SecureKey key) {
    final nonce = _sodium.randomBytes(secretboxNonceBytes);
    final ciphertext = _sodium.raw.crypto.secretBox.easy(
      message: message,
      nonce: nonce,
      key: key,
    );
    return WrappedKey(
      algorithm: 'xsalsa20poly1305',
      nonce: toBase64(nonce),
      ciphertext: toBase64(ciphertext),
    );
  }

  RecoveryVerifier _recoveryVerifier(SecureKey vaultKey) {
    final nonce = _sodium.randomBytes(secretboxNonceBytes);
    final ciphertext = _sodium.raw.crypto.secretBox.easy(
      message: utf8Bytes(recoveryVerifierPlaintext),
      nonce: nonce,
      key: vaultKey,
    );
    return RecoveryVerifier(
      algorithm: 'xsalsa20poly1305',
      nonce: toBase64(nonce),
      ciphertext: toBase64(ciphertext),
    );
  }

  Future<Uint8List> _deriveKek(
    String passphrase,
    Uint8List salt,
    int opsLimit,
    int memLimitBytes,
  ) {
    final saltCopy = Uint8List.fromList(salt);
    return Isolate.run(
      () => _deriveKekSync(passphrase, saltCopy, opsLimit, memLimitBytes),
    );
  }

  void _requireKeyLength(Uint8List key) {
    if (key.length != secretboxKeyBytes) {
      throw ArgumentError.value(key.length, 'key', 'must be 32 bytes');
    }
  }
}

/// Runs Argon2id in a fresh isolate so a 64 MiB derivation never blocks the UI.
/// The result is a Dart-owned copy; the native key is disposed before returning.
Future<Uint8List> _deriveKekSync(
  String passphrase,
  Uint8List salt,
  int opsLimit,
  int memLimitBytes,
) async {
  final sodium = await SodiumSumoInit.init();
  final key = sodium.crypto.pwhash.callStr(
    outLen: secretboxKeyBytes,
    password: passphrase,
    salt: salt,
    opsLimit: opsLimit,
    memLimit: memLimitBytes,
    alg: CryptoPwhashAlgorithm.argon2id13,
  );
  try {
    return key.extractBytes();
  } finally {
    key.dispose();
  }
}

class VaultKdfProfile {
  const VaultKdfProfile({
    required this.opsLimit,
    required this.memLimitBytes,
  });

  final int opsLimit;
  final int memLimitBytes;
}

const VaultKdfProfile defaultVaultKdfProfile = VaultKdfProfile(
  opsLimit: argon2idOpsLimit,
  memLimitBytes: argon2idMemLimitBytes,
);

class CreatedVault {
  const CreatedVault({required this.request, required this.vaultKey});

  final CreateVaultRequest request;
  final Uint8List vaultKey;
}
