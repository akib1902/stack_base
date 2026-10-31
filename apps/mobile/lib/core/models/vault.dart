import '../crypto/encoding.dart';

/// Strict client-side mirrors of `packages/contracts/src/encryption.ts`.
/// Unknown fields are rejected: a newer server format must fail loudly rather
/// than be half-understood.

const String vaultFormat = 'stackbase-vault';
const int vaultFormatVersion = 1;
const String vaultFormatVersionName = 'stackbase/1';
const String recoveryVerifierPlaintext = 'stackbase/1 vault-recovery-verifier';
const int argon2idOpsLimit = 3;
const int argon2idMemLimitBytes = 64 * 1024 * 1024;
const int argon2idMinMemLimitBytes = 8 * 1024 * 1024;
const int argon2idMaxMemLimitBytes = 1024 * 1024 * 1024;
const int argon2idSaltBytes = 16;
const int secretboxNonceBytes = 24;
const int secretboxKeyBytes = 32;
const int secretboxMacBytes = 16;
const int wrappedKeyBytes = secretboxKeyBytes + secretboxMacBytes;

class VaultKdf {
  const VaultKdf({
    required this.algorithm,
    required this.opsLimit,
    required this.memLimitBytes,
    required this.salt,
  });

  final String algorithm;
  final int opsLimit;
  final int memLimitBytes;
  final String salt;

  factory VaultKdf.fromJson(Map<String, dynamic> json) {
    _requireExactKeys(json, const {
      'algorithm',
      'opsLimit',
      'memLimitBytes',
      'salt',
    }, 'kdf');
    final algorithm = _string(json, 'algorithm', 'kdf');
    final opsLimit = _integer(json, 'opsLimit', 'kdf');
    final memLimitBytes = _integer(json, 'memLimitBytes', 'kdf');
    final salt = _string(json, 'salt', 'kdf');
    if (algorithm != 'argon2id13') {
      throw const FormatException('Unsupported vault KDF algorithm.');
    }
    if (opsLimit < 1 || opsLimit > 10) {
      throw const FormatException('Vault KDF opsLimit is outside the contract.');
    }
    if (memLimitBytes < argon2idMinMemLimitBytes ||
        memLimitBytes > argon2idMaxMemLimitBytes) {
      throw const FormatException('Vault KDF memory limit is outside the contract.');
    }
    if (fromBase64(salt).length != argon2idSaltBytes) {
      throw const FormatException('Vault salt must be 16 bytes.');
    }
    return VaultKdf(
      algorithm: algorithm,
      opsLimit: opsLimit,
      memLimitBytes: memLimitBytes,
      salt: salt,
    );
  }

  Map<String, dynamic> toJson() => {
    'algorithm': algorithm,
    'opsLimit': opsLimit,
    'memLimitBytes': memLimitBytes,
    'salt': salt,
  };
}

class WrappedKey {
  const WrappedKey({
    required this.algorithm,
    required this.nonce,
    required this.ciphertext,
  });

  final String algorithm;
  final String nonce;
  final String ciphertext;

  factory WrappedKey.fromJson(Map<String, dynamic> json) {
    _requireExactKeys(json, const {
      'algorithm',
      'nonce',
      'ciphertext',
    }, 'wrapped key');
    final algorithm = _string(json, 'algorithm', 'wrapped key');
    final nonce = _string(json, 'nonce', 'wrapped key');
    final ciphertext = _string(json, 'ciphertext', 'wrapped key');
    if (algorithm != 'xsalsa20poly1305') {
      throw const FormatException('Unsupported key-wrapping algorithm.');
    }
    if (fromBase64(nonce).length != secretboxNonceBytes ||
        fromBase64(ciphertext).length != wrappedKeyBytes) {
      throw const FormatException('Wrapped key lengths are outside the contract.');
    }
    return WrappedKey(
      algorithm: algorithm,
      nonce: nonce,
      ciphertext: ciphertext,
    );
  }

  Map<String, dynamic> toJson() => {
    'algorithm': algorithm,
    'nonce': nonce,
    'ciphertext': ciphertext,
  };
}

/// The recovery verifier hashes the same shape as a wrapped key but carries a
/// 51-byte ciphertext (35-byte plaintext plus the Poly1305 tag).
class RecoveryVerifier {
  const RecoveryVerifier({
    required this.algorithm,
    required this.nonce,
    required this.ciphertext,
  });

  final String algorithm;
  final String nonce;
  final String ciphertext;

  factory RecoveryVerifier.fromJson(Map<String, dynamic> json) {
    _requireExactKeys(json, const {
      'algorithm',
      'nonce',
      'ciphertext',
    }, 'recovery verifier');
    final algorithm = _string(json, 'algorithm', 'recovery verifier');
    final nonce = _string(json, 'nonce', 'recovery verifier');
    final ciphertext = _string(json, 'ciphertext', 'recovery verifier');
    if (algorithm != 'xsalsa20poly1305') {
      throw const FormatException('Unsupported verifier algorithm.');
    }
    if (fromBase64(nonce).length != secretboxNonceBytes ||
        fromBase64(ciphertext).length != 51) {
      throw const FormatException('Recovery verifier lengths are outside the contract.');
    }
    return RecoveryVerifier(
      algorithm: algorithm,
      nonce: nonce,
      ciphertext: ciphertext,
    );
  }

  Map<String, dynamic> toJson() => {
    'algorithm': algorithm,
    'nonce': nonce,
    'ciphertext': ciphertext,
  };
}

class VaultRecord {
  const VaultRecord({
    required this.format,
    required this.version,
    required this.kdf,
    required this.wrappedVaultKey,
    required this.recoveryVerifier,
    required this.createdAt,
    required this.updatedAt,
  });

  final String format;
  final int version;
  final VaultKdf kdf;
  final WrappedKey wrappedVaultKey;
  final RecoveryVerifier recoveryVerifier;
  final String createdAt;
  final String updatedAt;

  factory VaultRecord.fromJson(Map<String, dynamic> json) {
    _requireExactKeys(json, const {
      'format',
      'version',
      'kdf',
      'wrappedVaultKey',
      'recoveryVerifier',
      'createdAt',
      'updatedAt',
    }, 'vault');
    final format = _string(json, 'format', 'vault');
    final version = _integer(json, 'version', 'vault');
    if (format != vaultFormat || version != vaultFormatVersion) {
      throw const FormatException('Unsupported vault record format.');
    }
    return VaultRecord(
      format: format,
      version: version,
      kdf: VaultKdf.fromJson(_map(json, 'kdf', 'vault')),
      wrappedVaultKey: WrappedKey.fromJson(
        _map(json, 'wrappedVaultKey', 'vault'),
      ),
      recoveryVerifier: RecoveryVerifier.fromJson(
        _map(json, 'recoveryVerifier', 'vault'),
      ),
      createdAt: _string(json, 'createdAt', 'vault'),
      updatedAt: _string(json, 'updatedAt', 'vault'),
    );
  }

  Map<String, dynamic> toJson() => {
    'format': format,
    'version': version,
    'kdf': kdf.toJson(),
    'wrappedVaultKey': wrappedVaultKey.toJson(),
    'recoveryVerifier': recoveryVerifier.toJson(),
    'createdAt': createdAt,
    'updatedAt': updatedAt,
  };
}

class CreateVaultRequest {
  const CreateVaultRequest({
    required this.kdf,
    required this.wrappedVaultKey,
    required this.recoveryVerifier,
  });

  final VaultKdf kdf;
  final WrappedKey wrappedVaultKey;
  final RecoveryVerifier recoveryVerifier;

  Map<String, dynamic> toJson() => {
    'kdf': kdf.toJson(),
    'wrappedVaultKey': wrappedVaultKey.toJson(),
    'recoveryVerifier': recoveryVerifier.toJson(),
  };
}

void _requireExactKeys(
  Map<String, dynamic> json,
  Set<String> expected,
  String what,
) {
  final actual = json.keys.toSet();
  if (actual.length != expected.length ||
      !actual.containsAll(expected)) {
    throw FormatException('The $what record has unexpected fields.');
  }
}

String _string(Map<String, dynamic> json, String key, String what) {
  final value = json[key];
  if (value is! String) {
    throw FormatException('The $what record is missing $key.');
  }
  return value;
}

int _integer(Map<String, dynamic> json, String key, String what) {
  final value = json[key];
  if (value is! int) {
    throw FormatException('The $what record is missing $key.');
  }
  return value;
}

Map<String, dynamic> _map(
  Map<String, dynamic> json,
  String key,
  String what,
) {
  final value = json[key];
  if (value is! Map) {
    throw FormatException('The $what record is missing $key.');
  }
  return Map<String, dynamic>.from(value);
}
