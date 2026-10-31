import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:sodium/sodium_sumo.dart';

import '../models/vault.dart';
import 'crypto_error.dart';
import 'encoding.dart';
import 'sodium_service.dart';
import 'vault.dart';

/// The file half of `stackbase/1`
/// (docs/architecture/encryption-format.md): XChaCha20-Poly1305 secretstream
/// chunks behind a 24-byte header, with the ciphertext and plaintext hashed
/// while they are produced. The arithmetic mirrors
/// `packages/contracts/src/uploads.ts` exactly.
const String fileManifestFormat = 'stackbase-file';
const int fileManifestVersion = 1;
const String fileCipher = 'xchacha20poly1305-secretstream';
const int minPlaintextChunkSize = 64 * 1024;
const int maxPlaintextChunkSize = 8 * 1024 * 1024;
const int defaultPlaintextChunkSize = 1024 * 1024;
const int secretstreamHeaderBytes = 24;
const int secretstreamABytes = 17;

int totalChunksFor(int plaintextSize, int chunkSize) =>
    math.max(1, (plaintextSize / chunkSize).ceil());

int ciphertextSizeFor(int plaintextSize, int chunkSize) =>
    secretstreamHeaderBytes +
    plaintextSize +
    totalChunksFor(plaintextSize, chunkSize) * secretstreamABytes;

int ciphertextChunkLength(
  EncryptionManifest manifest,
  int chunkNumber,
) {
  final totalChunks = manifest.chunking.totalChunks;
  final plaintextBytes = chunkNumber == totalChunks - 1
      ? manifest.plaintextSize -
            (totalChunks - 1) * manifest.chunking.plaintextChunkSize
      : manifest.chunking.plaintextChunkSize;
  return plaintextBytes + secretstreamABytes;
}

class ManifestChunking {
  const ManifestChunking({
    required this.plaintextChunkSize,
    required this.totalChunks,
  });

  final int plaintextChunkSize;
  final int totalChunks;

  factory ManifestChunking.fromJson(Map<String, dynamic> json) {
    _requireKeys(json, const {'plaintextChunkSize', 'totalChunks'}, 'chunking');
    return ManifestChunking(
      plaintextChunkSize: _integer(json, 'plaintextChunkSize', 'chunking'),
      totalChunks: _integer(json, 'totalChunks', 'chunking'),
    );
  }

  Map<String, dynamic> toJson() => {
    'plaintextChunkSize': plaintextChunkSize,
    'totalChunks': totalChunks,
  };
}

/// What the client sends when it creates an upload: the full manifest except
/// the two hashes, which are only known after the whole file is streamed.
class UploadManifest {
  const UploadManifest({
    required this.format,
    required this.version,
    required this.cipher,
    required this.chunking,
    required this.plaintextSize,
    required this.ciphertextSize,
    required this.streamHeader,
    required this.wrappedKey,
  });

  final String format;
  final int version;
  final String cipher;
  final ManifestChunking chunking;
  final int plaintextSize;
  final int ciphertextSize;
  final String streamHeader;
  final WrappedKey wrappedKey;

  factory UploadManifest.fromJson(Map<String, dynamic> json) {
    _requireKeys(json, const {
      'format',
      'version',
      'cipher',
      'chunking',
      'plaintextSize',
      'ciphertextSize',
      'streamHeader',
      'wrappedKey',
    }, 'manifest');
    return UploadManifest(
      format: _string(json, 'format', 'manifest'),
      version: _integer(json, 'version', 'manifest'),
      cipher: _string(json, 'cipher', 'manifest'),
      chunking: ManifestChunking.fromJson(
        _map(json, 'chunking', 'manifest'),
      ),
      plaintextSize: _integer(json, 'plaintextSize', 'manifest'),
      ciphertextSize: _integer(json, 'ciphertextSize', 'manifest'),
      streamHeader: _string(json, 'streamHeader', 'manifest'),
      wrappedKey: WrappedKey.fromJson(_map(json, 'wrappedKey', 'manifest')),
    );
  }

  Map<String, dynamic> toJson() => {
    'format': format,
    'version': version,
    'cipher': cipher,
    'chunking': chunking.toJson(),
    'plaintextSize': plaintextSize,
    'ciphertextSize': ciphertextSize,
    'streamHeader': streamHeader,
    'wrappedKey': wrappedKey.toJson(),
  };
}

class EncryptionManifest {
  const EncryptionManifest({
    required this.format,
    required this.version,
    required this.cipher,
    required this.chunking,
    required this.plaintextSize,
    required this.ciphertextSize,
    required this.ciphertextHash,
    required this.plaintextFingerprint,
    required this.streamHeader,
    required this.wrappedKey,
  });

  final String format;
  final int version;
  final String cipher;
  final ManifestChunking chunking;
  final int plaintextSize;
  final int ciphertextSize;
  final String ciphertextHash;
  final String plaintextFingerprint;
  final String streamHeader;
  final WrappedKey wrappedKey;

  factory EncryptionManifest.fromJson(Map<String, dynamic> json) {
    _requireKeys(json, const {
      'format',
      'version',
      'cipher',
      'chunking',
      'plaintextSize',
      'ciphertextSize',
      'ciphertextHash',
      'plaintextFingerprint',
      'streamHeader',
      'wrappedKey',
    }, 'manifest');
    return EncryptionManifest(
      format: _string(json, 'format', 'manifest'),
      version: _integer(json, 'version', 'manifest'),
      cipher: _string(json, 'cipher', 'manifest'),
      chunking: ManifestChunking.fromJson(
        _map(json, 'chunking', 'manifest'),
      ),
      plaintextSize: _integer(json, 'plaintextSize', 'manifest'),
      ciphertextSize: _integer(json, 'ciphertextSize', 'manifest'),
      ciphertextHash: _string(json, 'ciphertextHash', 'manifest'),
      plaintextFingerprint: _string(
        json,
        'plaintextFingerprint',
        'manifest',
      ),
      streamHeader: _string(json, 'streamHeader', 'manifest'),
      wrappedKey: WrappedKey.fromJson(_map(json, 'wrappedKey', 'manifest')),
    );
  }

  factory EncryptionManifest.fromUpload(
    UploadManifest upload, {
    required String ciphertextHash,
    required String plaintextFingerprint,
  }) => EncryptionManifest(
    format: upload.format,
    version: upload.version,
    cipher: upload.cipher,
    chunking: upload.chunking,
    plaintextSize: upload.plaintextSize,
    ciphertextSize: upload.ciphertextSize,
    ciphertextHash: ciphertextHash,
    plaintextFingerprint: plaintextFingerprint,
    streamHeader: upload.streamHeader,
    wrappedKey: upload.wrappedKey,
  );

  UploadManifest toUploadManifest() => UploadManifest(
    format: format,
    version: version,
    cipher: cipher,
    chunking: chunking,
    plaintextSize: plaintextSize,
    ciphertextSize: ciphertextSize,
    streamHeader: streamHeader,
    wrappedKey: wrappedKey,
  );

  EncryptionManifest copyWith({
    WrappedKey? wrappedKey,
    String? streamHeader,
    String? ciphertextHash,
    String? plaintextFingerprint,
  }) => EncryptionManifest(
    format: format,
    version: version,
    cipher: cipher,
    chunking: chunking,
    plaintextSize: plaintextSize,
    ciphertextSize: ciphertextSize,
    ciphertextHash: ciphertextHash ?? this.ciphertextHash,
    plaintextFingerprint: plaintextFingerprint ?? this.plaintextFingerprint,
    streamHeader: streamHeader ?? this.streamHeader,
    wrappedKey: wrappedKey ?? this.wrappedKey,
  );

  Map<String, dynamic> toJson() => {
    ...toUploadManifest().toJson(),
    'ciphertextHash': ciphertextHash,
    'plaintextFingerprint': plaintextFingerprint,
  };
}

/// Client-side mirror of the server's manifest validation (format section 4).
/// A manifest that fails here is never used for encryption or decryption.
void assertManifestUsable(EncryptionManifest manifest) {
  Never invalid(String detail) =>
      throw CryptoException(CryptoErrorCode.invalidManifest, detail);

  if (manifest.format != fileManifestFormat) {
    throw CryptoException(
      CryptoErrorCode.unsupportedManifest,
      'Unsupported manifest format "${manifest.format}".',
    );
  }
  if (manifest.version != fileManifestVersion) {
    throw CryptoException(
      CryptoErrorCode.unsupportedManifest,
      'Unsupported manifest version ${manifest.version}.',
    );
  }
  if (manifest.cipher != fileCipher) {
    throw CryptoException(
      CryptoErrorCode.unsupportedManifest,
      'Unsupported cipher "${manifest.cipher}".',
    );
  }
  if (manifest.chunking.plaintextChunkSize < minPlaintextChunkSize ||
      manifest.chunking.plaintextChunkSize > maxPlaintextChunkSize) {
    invalid('plaintextChunkSize is outside the pinned range');
  }
  if (manifest.plaintextSize < 0) {
    invalid('plaintextSize is negative');
  }
  if (manifest.chunking.totalChunks !=
      totalChunksFor(
        manifest.plaintextSize,
        manifest.chunking.plaintextChunkSize,
      )) {
    invalid('totalChunks does not match plaintextSize');
  }
  if (manifest.ciphertextSize !=
      ciphertextSizeFor(
        manifest.plaintextSize,
        manifest.chunking.plaintextChunkSize,
      )) {
    invalid('ciphertextSize does not match the stream layout');
  }
  if (!isLowercaseSha256Hex(manifest.ciphertextHash)) {
    invalid('ciphertextHash is not a lowercase hex SHA-256');
  }
  if (!isLowercaseSha256Hex(manifest.plaintextFingerprint)) {
    invalid('plaintextFingerprint is not a lowercase hex SHA-256');
  }
  try {
    if (fromBase64(manifest.streamHeader).length != secretstreamHeaderBytes) {
      invalid('streamHeader is not 24 bytes');
    }
    if (fromBase64(manifest.wrappedKey.ciphertext).length != wrappedKeyBytes) {
      invalid('wrappedKey.ciphertext is not 48 bytes');
    }
    if (fromBase64(manifest.wrappedKey.nonce).length != secretboxNonceBytes) {
      invalid('wrappedKey.nonce is not 24 bytes');
    }
  } on FormatException {
    invalid('a base64 field could not be decoded');
  }
  if (manifest.wrappedKey.algorithm != 'xsalsa20poly1305') {
    invalid('unsupported key-wrapping algorithm');
  }
}

/// A read-only source of plaintext. `Blob`/file adapters implement this in M4;
/// tests use [BytesPlaintextSource].
abstract interface class PlaintextSource {
  int get size;

  Future<Uint8List> read(int start, int end);
}

class BytesPlaintextSource implements PlaintextSource {
  BytesPlaintextSource(Uint8List bytes) : _bytes = bytes;

  final Uint8List _bytes;

  @override
  int get size => _bytes.length;

  @override
  Future<Uint8List> read(int start, int end) async =>
      Uint8List.fromList(_bytes.sublist(start, end));
}

class EncryptedChunk {
  const EncryptedChunk({
    required this.chunkNumber,
    required this.data,
    required this.checksum,
  });

  final int chunkNumber;

  /// Exactly `plaintextChunkBytes + 17` bytes; the header is not a chunk.
  final Uint8List data;

  /// Lowercase hex SHA-256 of [data], sent as `x-chunk-checksum`.
  final String checksum;
}

class FileHashes {
  const FileHashes({
    required this.ciphertextHash,
    required this.plaintextFingerprint,
  });

  final String ciphertextHash;
  final String plaintextFingerprint;
}

class EncryptedFile {
  const EncryptedFile({
    required this.manifest,
    required this.ciphertext,
    required this.chunks,
    required this.hashes,
  });

  final EncryptionManifest manifest;
  final Uint8List ciphertext;
  final List<EncryptedChunk> chunks;
  final FileHashes hashes;
}

/// A single encryption pass over one file version. The stream is single-use;
/// [hashes] completes only when [encrypt] has been consumed to the end.
class EncryptionSession {
  EncryptionSession._({
    required this.manifest,
    required this.totalChunks,
    required this.streamHeader,
    required this.encrypt,
    required this.hashes,
  });

  final UploadManifest manifest;
  final int totalChunks;
  final Uint8List streamHeader;
  final Stream<EncryptedChunk> encrypt;
  final Future<FileHashes> hashes;
}

class FileCrypto {
  FileCrypto(this._sodium) : _vault = VaultCrypto(_sodium);

  final SodiumService _sodium;
  final VaultCrypto _vault;

  /// Starts an encryption session: generates the data key, wraps it with the
  /// vault key, initialises the secretstream and fixes the manifest header.
  Future<EncryptionSession> startEncryption({
    required PlaintextSource source,
    required Uint8List vaultKey,
    int chunkSize = defaultPlaintextChunkSize,
  }) async {
    if (vaultKey.length != secretboxKeyBytes) {
      throw ArgumentError.value(vaultKey.length, 'vaultKey', 'must be 32 bytes');
    }
    if (chunkSize < minPlaintextChunkSize ||
        chunkSize > maxPlaintextChunkSize) {
      throw CryptoException(
        CryptoErrorCode.invalidManifest,
        'Chunk size must be between $minPlaintextChunkSize and '
            '$maxPlaintextChunkSize bytes.',
      );
    }

    final totalChunks = totalChunksFor(source.size, chunkSize);
    final dataKey = _sodium.newKey();
    final dataKeyBytes = dataKey.extractBytes();
    final plaintextHasher = Sha256Hasher();
    final ciphertextHasher = Sha256Hasher();
    final hashesCompleter = Completer<FileHashes>();

    final cipherStream = _sodium.raw.crypto.secretStream.pushEx(
      key: dataKey,
      messageStream: _plaintextMessages(
        source: source,
        chunkSize: chunkSize,
        totalChunks: totalChunks,
        hasher: plaintextHasher,
      ),
    );
    final iterator = StreamIterator<SecretStreamCipherMessage>(cipherStream);

    if (!await iterator.moveNext()) {
      dataKey.dispose();
      zeroBytes(dataKeyBytes);
      throw const CryptoException(
        CryptoErrorCode.encryptionFailed,
        'The encrypted stream did not produce a header.',
      );
    }
    final header = Uint8List.fromList(iterator.current.message);
    if (header.length != secretstreamHeaderBytes) {
      dataKey.dispose();
      zeroBytes(dataKeyBytes);
      throw const CryptoException(
        CryptoErrorCode.encryptionFailed,
        'The encrypted stream produced an invalid header.',
      );
    }
    ciphertextHasher.add(header);

    final wrappedKey = await _vault.wrapDataKey(vaultKey, dataKeyBytes);
    zeroBytes(dataKeyBytes);

    final manifest = UploadManifest(
      format: fileManifestFormat,
      version: fileManifestVersion,
      cipher: fileCipher,
      chunking: ManifestChunking(
        plaintextChunkSize: chunkSize,
        totalChunks: totalChunks,
      ),
      plaintextSize: source.size,
      ciphertextSize: ciphertextSizeFor(source.size, chunkSize),
      streamHeader: toBase64(header),
      wrappedKey: wrappedKey,
    );

    var started = false;
    Stream<EncryptedChunk> encrypt() async* {
      if (started) {
        throw StateError('This encryption session already produced its chunks.');
      }
      started = true;
      var chunkNumber = 0;
      try {
        while (await iterator.moveNext()) {
          final data = Uint8List.fromList(iterator.current.message);
          ciphertextHasher.add(data);
          yield EncryptedChunk(
            chunkNumber: chunkNumber,
            data: data,
            checksum: toHex(sha256.convert(data).bytes),
          );
          chunkNumber += 1;
        }
        if (chunkNumber != totalChunks) {
          throw const CryptoException(
            CryptoErrorCode.encryptionFailed,
            'The encrypted stream ended at the wrong chunk count.',
          );
        }
        final hashes = FileHashes(
          ciphertextHash: ciphertextHasher.finish(),
          plaintextFingerprint: plaintextHasher.finish(),
        );
        if (!hashesCompleter.isCompleted) hashesCompleter.complete(hashes);
      } catch (error, stackTrace) {
        if (!hashesCompleter.isCompleted) {
          hashesCompleter.completeError(error, stackTrace);
        }
        rethrow;
      } finally {
        dataKey.dispose();
      }
    }

    return EncryptionSession._(
      manifest: manifest,
      totalChunks: totalChunks,
      streamHeader: header,
      encrypt: encrypt(),
      hashes: hashesCompleter.future,
    );
  }

  /// Encrypts all chunks into memory. M4 will stream to staging instead.
  Future<EncryptedFile> encryptBytes({
    required Uint8List plaintext,
    required Uint8List vaultKey,
    int chunkSize = defaultPlaintextChunkSize,
  }) async {
    final session = await startEncryption(
      source: BytesPlaintextSource(plaintext),
      vaultKey: vaultKey,
      chunkSize: chunkSize,
    );
    final chunks = await session.encrypt.toList();
    final hashes = await session.hashes;
    final ciphertext = concatBytes([
      session.streamHeader,
      for (final chunk in chunks) chunk.data,
    ]);
    return EncryptedFile(
      manifest: EncryptionManifest.fromUpload(
        session.manifest,
        ciphertextHash: hashes.ciphertextHash,
        plaintextFingerprint: hashes.plaintextFingerprint,
      ),
      ciphertext: ciphertext,
      chunks: chunks,
      hashes: hashes,
    );
  }

  /// Decrypts and verifies one complete version. Plaintext is returned only
  /// after the stream layout, every chunk tag, the SHA-256 of the ciphertext,
  /// the plaintext size and the plaintext fingerprint all match.
  Future<Uint8List> decryptBytes({
    required EncryptionManifest manifest,
    required Uint8List vaultKey,
    required Uint8List ciphertext,
  }) async {
    assertManifestUsable(manifest);
    if (ciphertext.length != manifest.ciphertextSize) {
      throw const CryptoException(
        CryptoErrorCode.decryptionFailed,
        'The encrypted stream is not the declared length.',
      );
    }

    final header = Uint8List.fromList(
      ciphertext.sublist(0, secretstreamHeaderBytes),
    );
    if (!equalBytes(header, fromBase64(manifest.streamHeader))) {
      throw const CryptoException(
        CryptoErrorCode.decryptionFailed,
        'The stream header does not match the stored manifest.',
      );
    }

    final chunks = <SecretStreamCipherMessage>[
      SecretStreamCipherMessage(header),
      for (var index = 0; index < manifest.chunking.totalChunks; index += 1)
        SecretStreamCipherMessage(
          Uint8List.fromList(
            ciphertext.sublist(
              secretstreamHeaderBytes +
                  index * (manifest.chunking.plaintextChunkSize +
                      secretstreamABytes),
              secretstreamHeaderBytes +
                  index * (manifest.chunking.plaintextChunkSize +
                      secretstreamABytes) +
                  ciphertextChunkLength(manifest, index),
            ),
          ),
        ),
    ];

    final dataKeyBytes = await _vault.unwrapDataKey(
      vaultKey,
      manifest.wrappedKey,
    );
    final dataKey = _sodium.keyFromBytes(dataKeyBytes);
    try {
      final plains = await _sodium.raw.crypto.secretStream
          .pullEx(
            cipherStream: Stream.fromIterable(chunks),
            key: dataKey,
          )
          .toList();

      if (plains.length != manifest.chunking.totalChunks) {
        throw const CryptoException(
          CryptoErrorCode.decryptionFailed,
          'The encrypted stream ended at the wrong chunk count.',
        );
      }
      for (var index = 0; index < plains.length; index += 1) {
        final expected = index == plains.length - 1
            ? SecretStreamMessageTag.finalPush
            : SecretStreamMessageTag.message;
        if (plains[index].tag != expected) {
          throw const CryptoException(
            CryptoErrorCode.decryptionFailed,
            'The encrypted stream is truncated or has extra chunks.',
          );
        }
      }

      final plaintext = concatBytes(plains.map((message) => message.message));
      if (plaintext.length != manifest.plaintextSize) {
        throw const CryptoException(
          CryptoErrorCode.decryptionFailed,
          'The decrypted size does not match the declared plaintext size.',
        );
      }
      if (toHex(sha256.convert(plaintext).bytes) !=
          manifest.plaintextFingerprint) {
        throw const CryptoException(
          CryptoErrorCode.decryptionFailed,
          'The decrypted content does not match its fingerprint.',
        );
      }
      if (toHex(sha256.convert(ciphertext).bytes) != manifest.ciphertextHash) {
        throw const CryptoException(
          CryptoErrorCode.decryptionFailed,
          'The encrypted stream does not match its recorded SHA-256.',
        );
      }
      return plaintext;
    } on CryptoException {
      rethrow;
    } on SodiumException {
      throw const CryptoException(
        CryptoErrorCode.decryptionFailed,
        'The encrypted stream failed its integrity check, so nothing was decrypted.',
      );
    } catch (_) {
      throw const CryptoException(
        CryptoErrorCode.decryptionFailed,
        'The encrypted stream failed its integrity check, so nothing was decrypted.',
      );
    } finally {
      dataKey.dispose();
      zeroBytes(dataKeyBytes);
    }
  }

  String fingerprintBytes(Uint8List bytes) => toHex(sha256.convert(bytes).bytes);
}

Stream<SecretStreamPlainMessage> _plaintextMessages({
  required PlaintextSource source,
  required int chunkSize,
  required int totalChunks,
  required Sha256Hasher hasher,
}) async* {
  for (var chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
    final start = chunkNumber * chunkSize;
    final end = math.min(source.size, start + chunkSize);
    final bytes = await source.read(start, end);
    if (bytes.length != end - start) {
      throw const CryptoException(
        CryptoErrorCode.encryptionFailed,
        'The source ended before the declared size.',
      );
    }
    hasher.add(bytes);
    yield SecretStreamPlainMessage(
      bytes,
      tag: chunkNumber == totalChunks - 1
          ? SecretStreamMessageTag.finalPush
          : SecretStreamMessageTag.message,
    );
  }
}

/// Streaming SHA-256 over arbitrary chunks, using the `crypto` package because
/// `sodium` does not expose `crypto_hash_sha256`.
class Sha256Hasher {
  final _DigestSink _sink = _DigestSink();
  late final ByteConversionSink _input = sha256.startChunkedConversion(_sink);

  void add(List<int> bytes) => _input.add(bytes);

  String finish() {
    _input.close();
    final digest = _sink.value;
    if (digest == null) {
      throw StateError('SHA-256 produced no digest.');
    }
    return digest.toString();
  }
}

class _DigestSink implements Sink<Digest> {
  Digest? value;

  @override
  void add(Digest data) => value = data;

  @override
  void close() {}
}

void _requireKeys(
  Map<String, dynamic> json,
  Set<String> expected,
  String what,
) {
  final actual = json.keys.toSet();
  if (actual.length != expected.length || !actual.containsAll(expected)) {
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
