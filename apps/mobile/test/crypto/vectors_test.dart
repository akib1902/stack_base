import 'dart:convert';

import 'package:crypto/crypto.dart' show sha256;
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sodium/sodium_sumo.dart' show CryptoPwhashAlgorithm;
import 'package:stackbase_mobile/core/crypto/crypto_error.dart';
import 'package:stackbase_mobile/core/crypto/encoding.dart';
import 'package:stackbase_mobile/core/crypto/file_format.dart';
import 'package:stackbase_mobile/core/crypto/share.dart';
import 'package:stackbase_mobile/core/crypto/sodium_service.dart';
import 'package:stackbase_mobile/core/crypto/vault.dart';
import 'package:stackbase_mobile/core/models/vault.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, dynamic> vectors;
  late Map<String, dynamic> interop;
  late SodiumService sodium;
  late VaultCrypto vaultCrypto;
  late FileCrypto fileCrypto;

  setUpAll(() async {
    vectors = await _loadJson('assets/vectors/stackbase-1.json');
    interop = await _loadJson('assets/vectors/interop-web-to-flutter.json');
    sodium = await SodiumService.instance();
    vaultCrypto = VaultCrypto(sodium);
    fileCrypto = FileCrypto(sodium);
  });

  Map<String, dynamic> vaultVector() =>
      Map<String, dynamic>.from(vectors['vault'] as Map);

  Map<String, dynamic> fileVector() =>
      Map<String, dynamic>.from(vectors['file'] as Map);

  Uint8List vaultKey() => fromHex(vaultVector()['vaultKeyHex'] as String);

  group('vault vector (stackbase/1)', () {
    test('derives the pinned Argon2id KEK', () {
      final vault = vaultVector();
      final kdf = Map<String, dynamic>.from(vault['kdf'] as Map);
      final key = sodium.raw.crypto.pwhash.callStr(
        outLen: 32,
        password: vault['passphrase'] as String,
        salt: fromBase64(kdf['salt'] as String),
        opsLimit: kdf['opsLimit'] as int,
        memLimit: kdf['memLimitBytes'] as int,
        alg: CryptoPwhashAlgorithm.argon2id13,
      );
      try {
        expect(toHex(key.extractBytes()), vault['kekHex']);
      } finally {
        key.dispose();
      }
    });

    test('unlocks to the pinned vault key', () async {
      final vault = vaultVector();
      final record = VaultRecord.fromJson(
        Map<String, dynamic>.from(vault['record'] as Map),
      );
      final key = await vaultCrypto.unlockVault(
        record,
        vault['passphrase'] as String,
      );
      try {
        expect(toHex(key), vault['vaultKeyHex']);
      } finally {
        zeroBytes(key);
      }
    });

    test('rejects the wrong passphrase', () async {
      final vault = vaultVector();
      final record = VaultRecord.fromJson(
        Map<String, dynamic>.from(vault['record'] as Map),
      );
      await expectLater(
        vaultCrypto.unlockVault(record, 'this is not the passphrase'),
        _cryptoError(CryptoErrorCode.wrongPassphrase),
      );
    });

    test('rejects a replaced recovery verifier', () async {
      final vault = vaultVector();
      final recordJson = jsonDecode(jsonEncode(vault['record']))
          as Map<String, dynamic>;
      final verifier = Map<String, dynamic>.from(
        recordJson['recoveryVerifier'] as Map,
      );
      verifier['ciphertext'] =
          '${(verifier['ciphertext'] as String).substring(0, 64)}AAAA';
      recordJson['recoveryVerifier'] = verifier;

      await expectLater(
        vaultCrypto.unlockVault(
          VaultRecord.fromJson(recordJson),
          vault['passphrase'] as String,
        ),
        _cryptoError(CryptoErrorCode.wrongVaultKey),
      );
    });

    test('creates a schema-valid vault and unlocks it again', () async {
      final created = await vaultCrypto.createVault(
        'a passphrase long enough to use',
        profile: const VaultKdfProfile(
          opsLimit: 3,
          memLimitBytes: 8 * 1024 * 1024,
        ),
      );
      try {
        expect(created.request.kdf.algorithm, 'argon2id13');
        expect(fromBase64(created.request.kdf.salt).length, 16);
        expect(fromBase64(created.request.wrappedVaultKey.ciphertext).length, 48);
        expect(fromBase64(created.request.recoveryVerifier.ciphertext).length, 51);

        final record = VaultRecord(
          format: vaultFormat,
          version: vaultFormatVersion,
          kdf: created.request.kdf,
          wrappedVaultKey: created.request.wrappedVaultKey,
          recoveryVerifier: created.request.recoveryVerifier,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        );
        final reopened = await vaultCrypto.unlockVault(
          record,
          'a passphrase long enough to use',
        );
        try {
          expect(toHex(reopened), toHex(created.vaultKey));
        } finally {
          zeroBytes(reopened);
        }
      } finally {
        zeroBytes(created.vaultKey);
      }
    });

    test('refuses a passphrase that is too short', () async {
      await expectLater(
        vaultCrypto.createVault('too short'),
        _cryptoError(CryptoErrorCode.invalidPassphrase),
      );
    });

    test('the default 64 MiB profile completes within the budget', () async {
      final stopwatch = Stopwatch()..start();
      final created = await vaultCrypto.createVault(
        'a 64 MiB profile passphrase',
      );
      final elapsed = stopwatch.elapsed;
      try {
        final reopened = await vaultCrypto.unlockVault(
          VaultRecord(
            format: vaultFormat,
            version: vaultFormatVersion,
            kdf: created.request.kdf,
            wrappedVaultKey: created.request.wrappedVaultKey,
            recoveryVerifier: created.request.recoveryVerifier,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          ),
          'a 64 MiB profile passphrase',
        );
        zeroBytes(reopened);
      } finally {
        zeroBytes(created.vaultKey);
      }
      // That is a broad ceiling for a slow emulator, not a performance claim.
      expect(elapsed, lessThan(const Duration(seconds: 30)));
    });
  });

  group('file vector (stackbase/1)', () {
    EncryptionManifest manifest() => EncryptionManifest.fromJson(
      Map<String, dynamic>.from(fileVector()['manifest'] as Map),
    );

    Uint8List ciphertext() =>
        fromBase64(fileVector()['ciphertextBase64'] as String);

    test('pins the committed bytes', () {
      final file = fileVector();
      final plain = fromBase64(file['plaintextBase64'] as String);
      expect(
        sha256.convert(fromBase64(file['ciphertextBase64'] as String)).toString(),
        file['ciphertextSha256'],
      );
      expect(sha256.convert(plain).toString(), file['plaintextSha256']);
      expect(
        toBase64(ciphertext().sublist(0, 24)),
        file['streamHeaderBase64'],
      );
    });

    test('decrypts the committed ciphertext to the pinned plaintext', () async {
      final file = fileVector();
      final decrypted = await fileCrypto.decryptBytes(
        manifest: manifest(),
        vaultKey: vaultKey(),
        ciphertext: ciphertext(),
      );
      expect(
        toHex(decrypted),
        toHex(fromBase64(file['plaintextBase64'] as String)),
      );
    });

    test('rejects a flipped ciphertext byte', () async {
      final tampered = Uint8List.fromList(ciphertext());
      tampered[tampered.length - 5] ^= 0x01;
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest(),
          vaultKey: vaultKey(),
          ciphertext: tampered,
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
    });

    test('rejects a truncated or extended stream', () async {
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest(),
          vaultKey: vaultKey(),
          ciphertext: ciphertext().sublist(0, ciphertext().length - 1),
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest(),
          vaultKey: vaultKey(),
          ciphertext: concatBytes([
            ciphertext(),
            Uint8List.fromList(const [1]),
          ]),
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
    });

    test('rejects a header that does not match the manifest', () async {
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest().copyWith(
            streamHeader: toBase64(Uint8List(24)),
          ),
          vaultKey: vaultKey(),
          ciphertext: ciphertext(),
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
    });

    test('rejects a ciphertext that does not match its recorded hash', () async {
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest().copyWith(ciphertextHash: '0' * 64),
          vaultKey: vaultKey(),
          ciphertext: ciphertext(),
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
    });

    test('rejects a data key wrapped under a different vault key', () async {
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest(),
          vaultKey: Uint8List(32),
          ciphertext: ciphertext(),
        ),
        _cryptoError(CryptoErrorCode.wrongVaultKey),
      );
    });

    test('rejects manifests that break the pinned layout', () {
      expect(() => assertManifestUsable(manifest()), returnsNormally);

      final broken = EncryptionManifest.fromJson({
        ...manifest().toJson(),
        'ciphertextSize': manifest().ciphertextSize - 1,
      });
      expect(
        () => assertManifestUsable(broken),
        throwsA(isA<CryptoException>()),
      );

      final unsupported = EncryptionManifest.fromJson({
        ...manifest().toJson(),
        'cipher': 'aes-gcm',
      });
      expect(
        () => assertManifestUsable(unsupported),
        _cryptoError(CryptoErrorCode.unsupportedManifest),
      );
    });
  });

  group('round-trip and authenticity', () {
    const chunkSize = 64 * 1024;
    final key = Uint8List.fromList(
      List<int>.generate(32, (index) => (index * 7 + 1) & 0xff),
    );

    test('round-trips every boundary size', () async {
      for (final size in <int>[
        0,
        1,
        100,
        chunkSize - 1,
        chunkSize,
        chunkSize + 1,
        2 * chunkSize + 5,
      ]) {
        final plaintext = Uint8List.fromList(
          List<int>.generate(size, (index) => (index * 13 + 5) & 0xff),
        );
        final encrypted = await fileCrypto.encryptBytes(
          plaintext: plaintext,
          vaultKey: key,
          chunkSize: chunkSize,
        );
        expect(
          encrypted.manifest.chunking.totalChunks,
          totalChunksFor(size, chunkSize),
        );
        expect(
          encrypted.manifest.ciphertextSize,
          ciphertextSizeFor(size, chunkSize),
        );
        expect(encrypted.ciphertext.length, ciphertextSizeFor(size, chunkSize));
        expect(
          encrypted.manifest.ciphertextHash,
          fileCrypto.fingerprintBytes(encrypted.ciphertext),
        );
        expect(
          encrypted.manifest.plaintextFingerprint,
          fileCrypto.fingerprintBytes(plaintext),
        );
        for (final chunk in encrypted.chunks) {
          expect(
            chunk.checksum,
            fileCrypto.fingerprintBytes(chunk.data),
          );
        }
        final decrypted = await fileCrypto.decryptBytes(
          manifest: encrypted.manifest,
          vaultKey: key,
          ciphertext: encrypted.ciphertext,
        );
        expect(decrypted, equals(plaintext));
      }
    });

    test('round-trips the default 1 MiB chunk loop', () async {
      final plaintext = Uint8List.fromList(
        List<int>.generate(
          2 * 1024 * 1024 + 17,
          (index) => (index * 19 + 9) & 0xff,
        ),
      );
      final encrypted = await fileCrypto.encryptBytes(
        plaintext: plaintext,
        vaultKey: key,
      );
      expect(encrypted.manifest.chunking.plaintextChunkSize, 1024 * 1024);
      expect(encrypted.manifest.chunking.totalChunks, 3);
      final decrypted = await fileCrypto.decryptBytes(
        manifest: encrypted.manifest,
        vaultKey: key,
        ciphertext: encrypted.ciphertext,
      );
      expect(decrypted, plaintext);
    });

    test('rejects reordered, dropped and corrupted chunks', () async {
      final plaintext = Uint8List.fromList(
        List<int>.generate(2 * chunkSize + 7, (index) => index & 0xff),
      );
      final encrypted = await fileCrypto.encryptBytes(
        plaintext: plaintext,
        vaultKey: key,
        chunkSize: chunkSize,
      );
      final manifest = encrypted.manifest;
      expect(manifest.chunking.totalChunks, 3);

      final chunks = <Uint8List>[];
      var offset = secretstreamHeaderBytes;
      for (var index = 0; index < manifest.chunking.totalChunks; index += 1) {
        final length = ciphertextChunkLength(manifest, index);
        chunks.add(encrypted.ciphertext.sublist(offset, offset + length));
        offset += length;
      }

      final reordered = concatBytes([
        encrypted.ciphertext.sublist(0, secretstreamHeaderBytes),
        chunks[1],
        chunks[0],
        chunks[2],
      ]);
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest,
          vaultKey: key,
          ciphertext: reordered,
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );

      final dropped = encrypted.ciphertext.sublist(
        0,
        encrypted.ciphertext.length -
            ciphertextChunkLength(manifest, manifest.chunking.totalChunks - 1),
      );
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest,
          vaultKey: key,
          ciphertext: dropped,
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );

      final corrupted = Uint8List.fromList(encrypted.ciphertext);
      corrupted[secretstreamHeaderBytes +
              ciphertextChunkLength(manifest, 0) +
              5] ^= 0x01;
      await expectLater(
        fileCrypto.decryptBytes(
          manifest: manifest,
          vaultKey: key,
          ciphertext: corrupted,
        ),
        _cryptoError(CryptoErrorCode.decryptionFailed),
      );
    });

    test('share capability decrypts without exposing the vault key', () async {
      final plaintext = Uint8List.fromList(
        List<int>.generate(70_000, (index) => (index * 3 + 11) & 0xff),
      );
      final encrypted = await fileCrypto.encryptBytes(
        plaintext: plaintext,
        vaultKey: key,
        chunkSize: chunkSize,
      );
      final capability = await createShareCapability(
        vaultKey: key,
        manifest: encrypted.manifest,
        sodium: sodium,
      );
      expect(capability.secret.length, 43);

      final decrypted = await decryptSharedBytes(
        manifest: encrypted.manifest,
        wrappedKey: capability.wrappedKey,
        secret: capability.secret,
        ciphertext: encrypted.ciphertext,
        sodium: sodium,
      );
      expect(decrypted, equals(plaintext));

      await expectLater(
        decryptSharedBytes(
          manifest: encrypted.manifest,
          wrappedKey: capability.wrappedKey,
          secret: 'not-a-valid-share-secret',
          ciphertext: encrypted.ciphertext,
          sodium: sodium,
        ),
        _cryptoError(CryptoErrorCode.invalidShareKey),
      );
    });
  });

  group('web interoperability', () {
    test('decrypts the committed multi-chunk web ciphertext', () async {
      final manifest = EncryptionManifest.fromJson(
        Map<String, dynamic>.from(interop['manifest'] as Map),
      );
      final ciphertext = fromBase64(interop['ciphertextBase64'] as String);
      final plaintext = await fileCrypto.decryptBytes(
        manifest: manifest,
        vaultKey: fromHex(interop['vaultKeyHex'] as String),
        ciphertext: ciphertext,
      );
      expect(manifest.chunking.totalChunks, 2);
      expect(
        fileCrypto.fingerprintBytes(plaintext),
        interop['plaintextSha256'],
      );
    });
  });
}

Future<Map<String, dynamic>> _loadJson(String path) async {
  final raw = await rootBundle.loadString(path);
  return jsonDecode(raw) as Map<String, dynamic>;
}

Matcher _cryptoError(CryptoErrorCode code) => throwsA(
  isA<CryptoException>().having((error) => error.code, 'code', code),
);
