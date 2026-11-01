import 'dart:typed_data';

import 'package:crypto/crypto.dart' show sha256;
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:stackbase_mobile/core/api/api_client.dart';
import 'package:stackbase_mobile/core/api/dev_session_client.dart';
import 'package:stackbase_mobile/core/api/dio_factory.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';
import 'package:stackbase_mobile/core/crypto/encoding.dart';
import 'package:stackbase_mobile/core/crypto/file_format.dart';
import 'package:stackbase_mobile/core/crypto/sodium_service.dart';
import 'package:stackbase_mobile/core/crypto/vault.dart';
import 'package:stackbase_mobile/core/models/transfers.dart';
import 'package:stackbase_mobile/core/models/vault.dart';

/// End-to-end transport against the real local API (AUTH_MODE=dev):
/// create vault → encrypt → create job → send every ciphertext chunk → finalize
/// → list versions → download → verify → decrypt. It never sends plaintext or
/// the vault key and leaves the uploaded fixture in a fresh test account.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  const base = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8787',
  );

  testWidgets('uploads, finalizes and downloads an encrypted file', (
    tester,
  ) async {
    final config = AppConfig.fromEnvironment(
      const EnvironmentValues(
        apiBaseUrl: base,
        supabaseUrl: '',
        supabasePublishableKey: '',
        webPublicOrigin: '',
        authMode: 'dev',
      ),
      isDebug: true,
    );
    expect(config.isConfigured, isTrue, reason: config.problems.join(' '));

    final email =
        'mobile-m4-${DateTime.now().millisecondsSinceEpoch}@example.test';
    final session = await DevSessionClient(
      createDevSessionDio(config),
    ).createSession(email);
    final dio = Dio(
      BaseOptions(
        baseUrl: config.apiV1Base.toString(),
        responseType: ResponseType.json,
        headers: {'authorization': 'Bearer ${session.accessToken}'},
      ),
    );
    final api = ApiClient(dio: dio, config: config);

    final sodium = await SodiumService.instance();
    final vaultCrypto = VaultCrypto(sodium);
    final createdVault = await vaultCrypto.createVault(
      'mobile integration vault passphrase',
      profile: const VaultKdfProfile(
        opsLimit: 3,
        memLimitBytes: 8 * 1024 * 1024,
      ),
    );
    final plaintext = Uint8List(200_000);
    try {
      final record = await api.createVault(createdVault.request);
      expect(record.format, vaultFormat);

      const chunkSize = 64 * 1024;
      for (var index = 0; index < plaintext.length; index += 1) {
        plaintext[index] = (index * 17 + 3) & 0xff;
      }

      final crypto = FileCrypto(sodium);
      final encrypted = await crypto.encryptBytes(
        plaintext: plaintext,
        vaultKey: createdVault.vaultKey,
        chunkSize: chunkSize,
      );
      expect(encrypted.chunks, hasLength(4));
      expect(
        encrypted.manifest.ciphertextHash,
        sha256.convert(encrypted.ciphertext).toString(),
      );

      final created = await api.createUpload(
        CreateUploadRequest(
          idempotencyKey:
              'mobile-m4-${DateTime.now().microsecondsSinceEpoch}',
          name: 'mobile-integration.bin',
          mimeType: 'application/octet-stream',
          folderId: null,
          manifest: encrypted.manifest.toUploadManifest(),
          sourceFingerprint: encrypted.manifest.plaintextFingerprint,
        ),
      );
      // The API may report queued or transferring immediately depending on
      // whether the job has already started. It must never be completed yet.
      expect(created.upload.isFinished, isFalse);
      expect(created.file.contentStatus.name, 'pending');

      final alreadyReceived = created.upload.receivedChunkNumbers.toSet();
      for (final chunk in encrypted.chunks) {
        if (alreadyReceived.contains(chunk.chunkNumber)) continue;
        final updated = await api.putUploadChunk(
          uploadId: created.upload.id,
          chunkNumber: chunk.chunkNumber,
          data: chunk.data,
          checksum: chunk.checksum,
        );
        expect(
          updated.receivedChunks,
          greaterThanOrEqualTo(chunk.chunkNumber + 1),
        );
      }

      final finalized = await api.finalizeUpload(
        uploadId: created.upload.id,
        ciphertextHash: encrypted.manifest.ciphertextHash,
        plaintextFingerprint: encrypted.manifest.plaintextFingerprint,
      );
      expect(finalized.upload.status, UploadJobStatus.completed);
      expect(finalized.file.contentStatus.name, 'ready');
      expect(finalized.version.ciphertextHash, encrypted.manifest.ciphertextHash);

      final versions = await api.fetchVersions(created.file.id);
      expect(versions.items, hasLength(1));
      expect(versions.items.single.isAvailable, isTrue);
      expect(versions.items.single.manifest.ciphertextHash,
          encrypted.manifest.ciphertextHash);

      final download = await api.downloadVersion(
        fileId: created.file.id,
        versionId: versions.items.single.id,
      );
      final builder = BytesBuilder(copy: false);
      await for (final chunk in download.stream) {
        builder.add(chunk);
      }
      final ciphertext = builder.takeBytes();
      try {
        expect(ciphertext.length, encrypted.ciphertext.length);
        expect(
          sha256.convert(ciphertext).toString(),
          encrypted.manifest.ciphertextHash,
        );
        final downloadedPlaintext = await crypto.decryptBytes(
          manifest: versions.items.single.manifest,
          vaultKey: createdVault.vaultKey,
          ciphertext: ciphertext,
        );
        try {
          expect(downloadedPlaintext, plaintext);
        } finally {
          zeroBytes(downloadedPlaintext);
        }
      } finally {
        zeroBytes(ciphertext);
      }
    } finally {
      zeroBytes(createdVault.vaultKey);
      zeroBytes(plaintext);
    }
  });
}
