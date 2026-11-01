import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../../../core/api/api_client.dart';
import '../../../core/crypto/encoding.dart';
import '../../../core/crypto/file_format.dart';
import '../../../core/crypto/sodium_service.dart';
import '../../../core/models/library.dart';
import '../../../core/providers.dart';

class DownloadException implements Exception {
  const DownloadException(this.message);

  final String message;

  @override
  String toString() => message;
}

class DownloadedFile {
  const DownloadedFile({
    required this.path,
    required this.name,
    required this.sizeBytes,
    required this.versionNumber,
  });

  final String path;
  final String name;
  final int sizeBytes;
  final int versionNumber;
}

final downloadServiceProvider = Provider<DownloadService>((ref) {
  return DownloadService(api: ref.watch(apiClientProvider));
});

/// Downloads one immutable version, verifies the complete stream before any
/// plaintext is written, and stores the decrypted copy in app-private storage.
/// The API never receives a key; it only serves ciphertext.
class DownloadService {
  DownloadService({required ApiClient api}) : _api = api;

  final ApiClient _api;
  final _uuid = const Uuid();

  Future<DownloadedFile> download({
    required FileSummary file,
    required Uint8List vaultKey,
  }) async {
    if (vaultKey.length != 32) {
      throw const DownloadException('The vault key is not available.');
    }
    final versions = await _api.fetchVersions(file.id);
    final available = versions.items
        .where((version) => version.isAvailable)
        .toList()
      ..sort((a, b) => b.versionNumber.compareTo(a.versionNumber));
    if (available.isEmpty) {
      throw const DownloadException(
        'This file has no available encrypted version yet.',
      );
    }
    final version = available.first;
    final response = await _api.downloadVersion(
      fileId: file.id,
      versionId: version.id,
    );
    if (response.formatVersion != null &&
        response.formatVersion != 'stackbase/1') {
      throw const DownloadException(
        'This file uses an encryption format this app does not understand.',
      );
    }

    final tempDirectory = await getTemporaryDirectory();
    final ciphertextFile = File(
      p.join(tempDirectory.path, 'stackbase-download-${_uuid.v4()}.part'),
    );
    final sink = ciphertextFile.openWrite();
    final digestSink = _DigestSink();
    final input = sha256.startChunkedConversion(digestSink);
    var received = 0;
    try {
      await for (final chunk in response.stream) {
        sink.add(chunk);
        input.add(chunk);
        received += chunk.length;
      }
      await sink.flush();
      await sink.close();
      input.close();

      if (response.contentLength != null &&
          received != response.contentLength) {
        throw DownloadException(
          'The download ended after $received of '
          '${response.contentLength} bytes. Nothing was decrypted.',
        );
      }
      final actualHash = digestSink.value?.toString();
      if (actualHash == null) {
        throw const DownloadException(
          'The download could not be hashed, so it was rejected.',
        );
      }
      if (response.ciphertextHash != null &&
          response.ciphertextHash != actualHash) {
        throw const DownloadException(
          'The download does not match the server checksum. Nothing was '
          'decrypted.',
        );
      }
      if (version.manifest.ciphertextHash != actualHash) {
        throw const DownloadException(
          'The download does not match the version manifest. Nothing was '
          'decrypted.',
        );
      }

      final ciphertext = await ciphertextFile.readAsBytes();
      final crypto = FileCrypto(await SodiumService.instance());
      final plaintext = await crypto.decryptBytes(
        manifest: version.manifest,
        vaultKey: vaultKey,
        ciphertext: ciphertext,
      );
      try {
        final directory = await _downloadsDirectory();
        final target = await _uniqueTarget(directory, file.name);
        await target.writeAsBytes(plaintext, flush: true);
        return DownloadedFile(
          path: target.path,
          name: p.basename(target.path),
          sizeBytes: plaintext.length,
          versionNumber: version.versionNumber,
        );
      } finally {
        zeroBytes(plaintext);
        zeroBytes(ciphertext);
      }
    } on DownloadException {
      rethrow;
    } on FormatException catch (error) {
      throw DownloadException(
        'The encrypted version metadata is damaged: ${error.message}',
      );
    } finally {
      try {
        await sink.close();
      } catch (_) {
        // Already closed in the success path.
      }
      try {
        if (await ciphertextFile.exists()) await ciphertextFile.delete();
      } catch (_) {
        // A private temp file may be reclaimed by the OS.
      }
    }
  }

  Future<Directory> _downloadsDirectory() async {
    final documents = await getApplicationDocumentsDirectory();
    final directory = Directory(p.join(documents.path, 'StackBase'));
    await directory.create(recursive: true);
    return directory;
  }

  Future<File> _uniqueTarget(Directory directory, String originalName) async {
    final safe = p
        .basename(originalName.isEmpty ? 'download' : originalName)
        .replaceAll(RegExp(r'[<>:"/\\|?*\x00-\x1f]'), '_');
    final name = safe.isEmpty ? 'download' : safe;
    final extension = p.extension(name);
    final stem = p.basenameWithoutExtension(name);
    var candidate = File(p.join(directory.path, name));
    var counter = 1;
    while (await candidate.exists()) {
      candidate = File(
        p.join(directory.path, '$stem (${counter++})$extension'),
      );
    }
    return candidate;
  }
}

class _DigestSink implements Sink<Digest> {
  Digest? value;

  @override
  void add(Digest data) => value = data;

  @override
  void close() {}
}
