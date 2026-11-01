import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mime/mime.dart';
import 'package:uuid/uuid.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/crypto/crypto_error.dart';
import '../../../core/crypto/file_format.dart';
import '../../../core/crypto/sodium_service.dart';
import '../../../core/models/transfers.dart';
import '../../../core/providers.dart';
import '../../cloud_files/presentation/cloud_controller.dart';
import '../../encryption/presentation/vault_controller.dart';
import '../data/transfer_store.dart';

enum TransferItemStatus {
  queued,
  encrypting,
  transferring,
  finalizing,
  paused,
  completed,
  failed,
  cancelled,
}

@immutable
class TransferItem {
  const TransferItem({
    required this.id,
    required this.name,
    required this.sourceSizeBytes,
    required this.status,
    required this.percent,
    required this.detail,
    required this.error,
    required this.uploadId,
    required this.fileId,
    required this.totalChunks,
    required this.receivedChunks,
    required this.ciphertextBytes,
    required this.ciphertextSizeBytes,
    required this.canRetry,
  });

  final String id;
  final String name;
  final int sourceSizeBytes;
  final TransferItemStatus status;
  final int percent;
  final String detail;
  final String? error;
  final String? uploadId;
  final String? fileId;
  final int totalChunks;
  final int receivedChunks;
  final int ciphertextBytes;
  final int ciphertextSizeBytes;
  final bool canRetry;

  bool get isActive =>
      status == TransferItemStatus.queued ||
      status == TransferItemStatus.encrypting ||
      status == TransferItemStatus.transferring ||
      status == TransferItemStatus.finalizing;

  bool get isFinished =>
      status == TransferItemStatus.completed ||
      status == TransferItemStatus.cancelled;

  bool get showsProgress =>
      isActive ||
      status == TransferItemStatus.paused ||
      status == TransferItemStatus.failed;

  TransferItem copyWith({
    String? name,
    int? sourceSizeBytes,
    TransferItemStatus? status,
    int? percent,
    String? detail,
    String? error,
    bool clearError = false,
    String? uploadId,
    String? fileId,
    int? totalChunks,
    int? receivedChunks,
    int? ciphertextBytes,
    int? ciphertextSizeBytes,
    bool? canRetry,
  }) {
    return TransferItem(
      id: id,
      name: name ?? this.name,
      sourceSizeBytes: sourceSizeBytes ?? this.sourceSizeBytes,
      status: status ?? this.status,
      percent: percent ?? this.percent,
      detail: detail ?? this.detail,
      error: clearError ? null : (error ?? this.error),
      uploadId: uploadId ?? this.uploadId,
      fileId: fileId ?? this.fileId,
      totalChunks: totalChunks ?? this.totalChunks,
      receivedChunks: receivedChunks ?? this.receivedChunks,
      ciphertextBytes: ciphertextBytes ?? this.ciphertextBytes,
      ciphertextSizeBytes: ciphertextSizeBytes ?? this.ciphertextSizeBytes,
      canRetry: canRetry ?? this.canRetry,
    );
  }
}

@immutable
class TransferState {
  const TransferState({
    required this.items,
    required this.restoring,
    required this.restoreError,
  });

  const TransferState.empty()
    : this(items: const [], restoring: false, restoreError: false);

  final List<TransferItem> items;
  final bool restoring;
  final bool restoreError;

  int get activeCount => items.where((item) => item.isActive).length;

  TransferState copyWith({
    List<TransferItem>? items,
    bool? restoring,
    bool? restoreError,
  }) {
    return TransferState(
      items: items ?? this.items,
      restoring: restoring ?? this.restoring,
      restoreError: restoreError ?? this.restoreError,
    );
  }
}

class TransferException implements Exception {
  const TransferException(this.message);

  final String message;

  @override
  String toString() => message;
}

final transferStoreProvider = Provider<TransferStore>((ref) {
  final session = ref.watch(authControllerProvider).value?.session;
  if (session == null) {
    throw StateError('Transfers require a signed-in account.');
  }
  return TransferStore(accountId: session.userId);
});

final transferControllerProvider =
    AsyncNotifierProvider<TransferController, TransferState>(
      TransferController.new,
    );

/// Owns the on-device queue. Ciphertext is written to app-private staging
/// before the server job exists, so a process death never forces a new stream
/// and a resume sends only the chunks the server has not confirmed.
class TransferController extends AsyncNotifier<TransferState> {
  final _uuid = const Uuid();
  final List<_Work> _pending = [];
  final Map<String, _Work> _work = {};
  final Map<String, StagedUpload> _records = {};
  final Map<String, UploadJob> _jobs = {};
  bool _running = false;
  TransferStore? _store;
  FileCrypto? _crypto;

  @override
  Future<TransferState> build() async {
    final store = ref.watch(transferStoreProvider);
    _store = store;
    _work.clear();
    _records.clear();
    _jobs.clear();
    _pending.clear();

    final records = await store.load();
    var restoreError = false;
    List<UploadJob> jobs = const [];
    try {
      jobs = (await ref.read(apiClientProvider).listUploads()).items;
    } on ApiException {
      restoreError = true;
    } catch (_) {
      restoreError = true;
    }

    final byKey = {for (final job in jobs) job.idempotencyKey: job};
    final items = <TransferItem>[];
    final restoredIds = <String>{};

    for (final record in records) {
      final job = byKey[record.idempotencyKey];
      if (job?.status == UploadJobStatus.completed) {
        await store.delete(record.localId, record.stagingFileName);
        continue;
      }
      _records[record.localId] = record;
      if (job != null) {
        _jobs[record.localId] = job;
      }
      restoredIds.add(record.idempotencyKey);
      final received = job?.receivedChunkNumbers.length ?? 0;
      final total = record.manifest.chunking.totalChunks;
      items.add(
        TransferItem(
          id: record.localId,
          name: record.name,
          sourceSizeBytes: record.sourceSizeBytes,
          status: TransferItemStatus.paused,
          percent: job == null
              ? 0
              : (50 + (received / total) * 48).round().clamp(50, 98),
          detail: job == null
              ? 'Encrypted locally. Resume to create the server job.'
              : '$received of $total chunks confirmed. Ready to continue.',
          error: job?.status == UploadJobStatus.reconciliationRequired
              ? 'The server stopped inside storage verification.'
              : null,
          uploadId: job?.id,
          fileId: job?.fileId,
          totalChunks: total,
          receivedChunks: received,
          ciphertextBytes: 0,
          ciphertextSizeBytes: record.manifest.ciphertextSize,
          canRetry: job?.status != UploadJobStatus.reconciliationRequired,
        ),
      );
    }

    for (final job in jobs) {
      if (restoredIds.contains(job.idempotencyKey) || job.isFinished) continue;
      items.add(
        TransferItem(
          id: job.id,
          name: job.fileName ?? 'Interrupted upload',
          sourceSizeBytes: job.sourceSizeBytes,
          status: TransferItemStatus.failed,
          percent: ((job.receivedChunks / job.totalChunks) * 100)
              .round()
              .clamp(0, 99),
          detail: 'The encrypted staging file is no longer on this device.',
          error:
              'Cancel this job and choose the source file again. A different '
              'stream cannot be stitched onto the existing chunks.',
          uploadId: job.id,
          fileId: job.fileId,
          totalChunks: job.totalChunks,
          receivedChunks: job.receivedChunks,
          ciphertextBytes: 0,
          ciphertextSizeBytes: job.encryptedSizeBytes ?? 0,
          canRetry: false,
        ),
      );
    }

    return TransferState(
      items: items,
      restoring: false,
      restoreError: restoreError,
    );
  }

  Future<void> enqueue(XFile file, {String? folderId}) async {
    final key = _vaultKey();
    if (key == null) {
      throw const TransferException(
        'Unlock the vault before uploading. The key never leaves this device.',
      );
    }
    final size = await file.length();
    if (size < 0) {
      throw const TransferException('The selected file could not be read.');
    }
    final id = _uuid.v4();
    final name = file.name.isEmpty ? 'file' : file.name;
    final mimeType = lookupMimeType(name) ?? 'application/octet-stream';
    final work = _Work(
      localId: id,
      idempotencyKey: _uuid.v4(),
      source: file,
      name: name,
      mimeType: mimeType,
      folderId: folderId,
      sourceSizeBytes: size,
    );
    _work[id] = work;
    _addItem(
      TransferItem(
        id: id,
        name: name,
        sourceSizeBytes: size,
        status: TransferItemStatus.queued,
        percent: 0,
        detail: 'Queued for local encryption.',
        error: null,
        uploadId: null,
        fileId: null,
        totalChunks: 1,
        receivedChunks: 0,
        ciphertextBytes: 0,
        ciphertextSizeBytes: 0,
        canRetry: false,
      ),
    );
    _pending.add(work);
    unawaited(_pump());
  }

  Future<void> resume(String itemId) async {
    final current = _item(itemId);
    if (current == null || current.isActive) return;
    final record = _records[itemId];
    var work = _work[itemId];
    if (record == null) {
      if (current.uploadId != null) {
        throw const TransferException(
          'The encrypted staging file is gone. Cancel this job and choose the '
          'file again.',
        );
      }
      throw const TransferException('This transfer has no local source.');
    }
    work ??= _Work(
      localId: record.localId,
      idempotencyKey: record.idempotencyKey,
      name: record.name,
      mimeType: record.mimeType,
      folderId: record.folderId,
      sourceSizeBytes: record.sourceSizeBytes,
      record: record,
    );
    work
      ..cancelRequested = false
      ..pauseRequested = false;
    _work[itemId] = work;
    _setItem(
      itemId,
      (item) => item.copyWith(
        status: TransferItemStatus.queued,
        detail: 'Checking the server job…',
        clearError: true,
        canRetry: false,
      ),
    );
    _pending.add(work);
    await _pump();
  }

  /// Pauses at the next chunk boundary. During the one-pass encryption it sets
  /// the flag and stops before creating/continuing the server job.
  Future<void> pause(String itemId) async {
    final item = _item(itemId);
    if (item == null) return;
    final work = _work[itemId];
    if (work != null) work.pauseRequested = true;
    _pending.removeWhere((candidate) => candidate.localId == itemId);
    if (item.uploadId != null && !item.isActive) {
      try {
        await ref.read(apiClientProvider).pauseUpload(item.uploadId!);
      } on ApiException {
        // The local row still pauses; the server will sweep an abandoned job.
      }
    }
    _setItem(
      itemId,
      (item) => item.copyWith(
        status: TransferItemStatus.paused,
        detail: item.isActive
            ? 'Pausing after the current chunk. Staged bytes are kept.'
            : 'Paused. Staged bytes are kept.',
        clearError: true,
        canRetry: true,
      ),
    );
  }

  Future<void> cancel(String itemId) async {
    final item = _item(itemId);
    if (item == null) return;
    final wasActive = item.isActive;
    final work = _work[itemId];
    if (work != null) work.cancelRequested = true;
    _pending.removeWhere((candidate) => candidate.localId == itemId);
    final record = _records[itemId];
    final uploadId = item.uploadId;
    if (uploadId != null) {
      try {
        await ref.read(apiClientProvider).cancelUpload(uploadId);
      } on ApiException {
        // The local cleanup below remains the source of truth.
      }
    }
    // An active run owns its open staging file; it cleans up at the next chunk
    // boundary. Deleting underneath it would turn a cancel into a failure.
    if (!wasActive) {
      if (record != null) {
        await _store?.delete(record.localId, record.stagingFileName);
      }
      _records.remove(itemId);
      _jobs.remove(itemId);
      _work.remove(itemId);
    }
    _setItem(
      itemId,
      (item) => item.copyWith(
        status: TransferItemStatus.cancelled,
        percent: 0,
        detail: 'Cancelled. The staged ciphertext was removed.',
        clearError: true,
        canRetry: false,
      ),
    );
  }

  void dismiss(String itemId) {
    _setItemRemove(itemId);
  }

  void clearFinished() {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        items: current.items
            .where((item) => !item.isFinished)
            .toList(growable: false),
      ),
    );
  }

  Future<void> _pump() async {
    if (_running) return;
    _running = true;
    try {
      while (_pending.isNotEmpty) {
        final work = _pending.removeAt(0);
        if (work.cancelRequested) continue;
        await _process(work);
      }
    } finally {
      _running = false;
    }
  }

  Future<void> _process(_Work work) async {
    try {
      final key = _vaultKey();
      if (key == null) {
        throw const TransferException(
          'The vault locked before the upload could continue.',
        );
      }
      if (work.job == null) {
        await _ensureJobReady(work);
      }
      final record = work.record ?? await _encrypt(work, key);
      work.record = record;
      _records[work.localId] = record;
      await _store?.save(record);
      if (work.cancelRequested) {
        await _cancelLocal(work);
        return;
      }
      if (work.pauseRequested) {
        _setItem(
          work.localId,
          (item) => item.copyWith(
            status: TransferItemStatus.paused,
            detail:
                'Encrypted locally. Resume to create or continue the server job.',
            canRetry: true,
          ),
        );
        return;
      }
      await _upload(work, record, key);
    } on _Cancelled {
      await _cancelLocal(work);
    } catch (error) {
      await _handleFailure(work, error);
    }
  }

  Future<void> _handleFailure(_Work work, Object error) async {
    if (work.cancelRequested) {
      await _cancelLocal(work);
      return;
    }
    if (error is TransferException) {
      _fail(work.localId, error.message);
      return;
    }
    if (error is CryptoException) {
      _fail(work.localId, error.message);
      return;
    }
    if (error is ApiException) {
      _fail(
        work.localId,
        error.code == 'AUTH_REQUIRED'
            ? 'Your session expired. Sign in again to retry this upload.'
            : error.userMessage,
      );
      return;
    }
    if (error is SocketException) {
      _fail(
        work.localId,
        'The network dropped. The staged ciphertext is safe; Retry continues '
        'from the confirmed chunks.',
      );
      return;
    }
    if (error is FormatException) {
      _fail(work.localId, error.message);
      return;
    }
    if (error is FileSystemException) {
      _fail(
        work.localId,
        'Local storage failed: ${error.message}. The staging file may be gone.',
      );
      return;
    }
    _fail(
      work.localId,
      'The upload stopped unexpectedly. Staged bytes were kept when possible.',
    );
  }

  Future<StagedUpload> _encrypt(_Work work, Uint8List vaultKey) async {
    final sourceFile = work.source;
    if (sourceFile == null) {
      throw const TransferException(
        'The source file is no longer selected, but no staged ciphertext was '
        'found.',
      );
    }
    final store = _store;
    if (store == null) {
      throw const TransferException('Local transfer storage is unavailable.');
    }
    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.encrypting,
        percent: 2,
        detail: 'Encrypting on this device…',
      ),
    );

    final crypto = _crypto ??= FileCrypto(await SodiumService.instance());
    final staging = await store.createStagingFile(work.localId);
    final sink = staging.openWrite();
    var closed = false;
    try {
      final session = await crypto.startEncryption(
        source: _XFilePlaintextSource(
          file: sourceFile,
          size: work.sourceSizeBytes,
        ),
        vaultKey: vaultKey,
      );
      sink.add(session.streamHeader);
      var chunkNumber = 0;
      await for (final chunk in session.encrypt) {
        if (work.cancelRequested) throw const _Cancelled();
        sink.add(chunk.data);
        chunkNumber += 1;
        _setItem(
          work.localId,
          (item) => item.copyWith(
            totalChunks: session.totalChunks,
            ciphertextSizeBytes: session.manifest.ciphertextSize,
            percent: (2 + (chunkNumber / session.totalChunks) * 48).round(),
            detail:
                'Encrypting chunk $chunkNumber of ${session.totalChunks}…',
          ),
        );
      }
      final hashes = await session.hashes;
      await sink.flush();
      await sink.close();
      closed = true;
      if (chunkNumber != session.totalChunks) {
        throw const TransferException(
          'Encryption ended at the wrong chunk count.',
        );
      }
      final manifest = EncryptionManifest.fromUpload(
        session.manifest,
        ciphertextHash: hashes.ciphertextHash,
        plaintextFingerprint: hashes.plaintextFingerprint,
      );
      final record = StagedUpload(
        localId: work.localId,
        idempotencyKey: work.idempotencyKey,
        name: work.name,
        mimeType: work.mimeType,
        folderId: work.folderId,
        sourceSizeBytes: work.sourceSizeBytes,
        manifest: manifest,
        stagingFileName: staging.uri.pathSegments.last,
        createdAt: DateTime.now().toUtc(),
      );
      await store.save(record);
      _setItem(
        work.localId,
        (item) => item.copyWith(
          status: TransferItemStatus.transferring,
          percent: 50,
          totalChunks: manifest.chunking.totalChunks,
          ciphertextSizeBytes: manifest.ciphertextSize,
          detail: 'Encrypted locally. Creating the upload…',
        ),
      );
      return record;
    } catch (_) {
      if (!closed) {
        try {
          await sink.close();
        } catch (_) {
          // Best effort.
        }
      }
      if (!work.pauseRequested) {
        try {
          if (await staging.exists()) await staging.delete();
        } catch (_) {
          // The record was never written, so an orphan cannot be resumed.
        }
      }
      rethrow;
    }
  }

  Future<void> _ensureJobReady(_Work work) async {
    final existing = _jobs[work.localId];
    if (existing == null || existing.isFinished) return;
    final api = ref.read(apiClientProvider);
    final reopened = switch (existing.status) {
      UploadJobStatus.paused => await api.resumeUpload(existing.id),
      UploadJobStatus.failed ||
      UploadJobStatus.needsSourceFile => await api.retryUpload(existing.id),
      UploadJobStatus.reconciliationRequired => throw const TransferException(
        'The server needs storage reconciliation before this job can continue.',
      ),
      _ => existing,
    };
    _jobs[work.localId] = reopened;
    work.job = reopened;
  }

  Future<void> _upload(
    _Work work,
    StagedUpload record,
    Uint8List vaultKey,
  ) async {
    final store = _store;
    if (store == null) {
      throw const TransferException('Local transfer storage is unavailable.');
    }
    final file = await store.stagingFile(record);
    if (!await file.exists()) {
      throw const TransferException(
        'The staged ciphertext is missing. Cancel and choose the file again.',
      );
    }
    final api = ref.read(apiClientProvider);
    var job = work.job ?? _jobs[work.localId];
    if (job == null) {
      final created = await api.createUpload(
        CreateUploadRequest(
          idempotencyKey: record.idempotencyKey,
          name: record.name,
          mimeType: record.mimeType,
          folderId: record.folderId,
          manifest: record.manifest.toUploadManifest(),
          sourceFingerprint: record.manifest.plaintextFingerprint,
        ),
      );
      job = created.upload;
      work
        ..job = job
        ..fileId = created.file.id;
      _jobs[work.localId] = job;
      _setItem(
        work.localId,
        (item) => item.copyWith(
          uploadId: job!.id,
          fileId: created.file.id,
          detail: 'Upload created. Sending encrypted chunks…',
        ),
      );
    }
    final activeJob = job;
    if (activeJob.status == UploadJobStatus.completed) {
      await _complete(work, record);
      return;
    }
    final uploadId = activeJob.id;

    final received = activeJob.receivedChunkNumbers.toSet();
    var confirmed = received.length;
    var sentBytes = 0;
    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.transferring,
        uploadId: uploadId,
        totalChunks: record.manifest.chunking.totalChunks,
        receivedChunks: confirmed,
        ciphertextSizeBytes: record.manifest.ciphertextSize,
        percent: (50 + (confirmed / record.manifest.chunking.totalChunks) * 48)
            .round()
            .clamp(50, 98),
        detail:
            '$confirmed of ${record.manifest.chunking.totalChunks} chunks '
            'already stored.',
      ),
    );

    final random = await file.open(mode: FileMode.read);
    try {
      for (
        var number = 0;
        number < record.manifest.chunking.totalChunks;
        number += 1
      ) {
        if (work.cancelRequested) throw const _Cancelled();
        if (work.pauseRequested) {
          await _pauseServer(work, uploadId);
          return;
        }
        final length = ciphertextChunkLength(record.manifest, number);
        final int offset =
            secretstreamHeaderBytes +
            number *
                (record.manifest.chunking.plaintextChunkSize +
                    secretstreamABytes);
        await random.setPosition(offset);
        final data = await random.read(length);
        if (data.length != length) {
          throw const TransferException(
            'The staged ciphertext ended early. Cancel and upload again.',
          );
        }
        if (!received.contains(number)) {
          final updated = await api.putUploadChunk(
            uploadId: uploadId,
            chunkNumber: number,
            data: data,
            checksum: sha256.convert(data).toString(),
          );
          _jobs[work.localId] = updated;
          work.job = updated;
          confirmed = updated.receivedChunks;
          sentBytes += data.length;
        }
        _setItem(
          work.localId,
          (item) => item.copyWith(
            receivedChunks: confirmed,
            ciphertextBytes: sentBytes,
            percent:
                (50 + (confirmed / record.manifest.chunking.totalChunks) * 48)
                    .round()
                    .clamp(50, 98),
            detail:
                '$confirmed of ${record.manifest.chunking.totalChunks} chunks '
                'confirmed by the server.',
          ),
        );
      }
    } finally {
      await random.close();
    }

    if (work.cancelRequested) throw const _Cancelled();
    if (work.pauseRequested) {
      await _pauseServer(work, uploadId);
      return;
    }

    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.finalizing,
        percent: 99,
        detail: 'Verifying the assembled stream…',
      ),
    );
    final finalized = await api.finalizeUpload(
      uploadId: uploadId,
      ciphertextHash: record.manifest.ciphertextHash,
      plaintextFingerprint: record.manifest.plaintextFingerprint,
    );
    _jobs[work.localId] = finalized.upload;
    await _complete(work, record, versionId: finalized.version.id);
  }

  Future<void> _pauseServer(_Work work, String uploadId) async {
    try {
      final job = await ref.read(apiClientProvider).pauseUpload(uploadId);
      _jobs[work.localId] = job;
    } on ApiException {
      // The local staging record still allows a retry.
    }
    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.paused,
        detail: 'Paused. Stored chunks are kept and will resume.',
        clearError: true,
        canRetry: true,
      ),
    );
  }

  Future<void> _complete(
    _Work work,
    StagedUpload record, {
    String? versionId,
  }) async {
    await _store?.delete(record.localId, record.stagingFileName);
    _records.remove(work.localId);
    _work.remove(work.localId);
    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.completed,
        percent: 100,
        detail: 'Encrypted, uploaded and stored.',
        clearError: true,
        canRetry: false,
        uploadId: work.job?.id ?? item.uploadId,
      ),
    );
    if (versionId != null) {
      _work.remove(work.localId);
    }
    ref.invalidate(cloudLibraryProvider);
  }

  Future<void> _cancelLocal(_Work work) async {
    final record = _records[work.localId];
    if (record != null) {
      await _store?.delete(record.localId, record.stagingFileName);
    }
    _records.remove(work.localId);
    _jobs.remove(work.localId);
    _work.remove(work.localId);
    _setItem(
      work.localId,
      (item) => item.copyWith(
        status: TransferItemStatus.cancelled,
        percent: 0,
        detail: 'Cancelled. The staged ciphertext was removed.',
        clearError: true,
        canRetry: false,
      ),
    );
  }

  void _fail(String itemId, String message) {
    _setItem(
      itemId,
      (item) => item.copyWith(
        status: TransferItemStatus.failed,
        detail: item.uploadId == null
            ? 'Not uploaded. Retry re-encrypts from the selected source.'
            : 'Not stored. Retry keeps the chunks that already arrived.',
        error: message,
        canRetry: _records.containsKey(itemId) || _work[itemId]?.source != null,
      ),
    );
  }

  Uint8List? _vaultKey() {
    final key = ref.read(vaultControllerProvider.notifier).vaultKey;
    if (key == null || key.length != 32) return null;
    return key;
  }

  TransferItem? _item(String itemId) {
    final current = state.value;
    if (current == null) return null;
    for (final item in current.items) {
      if (item.id == itemId) return item;
    }
    return null;
  }

  void _addItem(TransferItem item) {
    final current = state.value ?? const TransferState.empty();
    state = AsyncData(
      current.copyWith(items: [item, ...current.items]),
    );
  }

  void _setItem(
    String itemId,
    TransferItem Function(TransferItem item) update,
  ) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        items: [
          for (final item in current.items)
            if (item.id == itemId) update(item) else item,
        ],
      ),
    );
  }

  void _setItemRemove(String itemId) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        items: current.items
            .where((item) => item.id != itemId)
            .toList(growable: false),
      ),
    );
  }
}

class _Work {
  _Work({
    required this.localId,
    required this.idempotencyKey,
    required this.name,
    required this.mimeType,
    required this.folderId,
    required this.sourceSizeBytes,
    this.source,
    this.record,
  });

  final String localId;
  final String idempotencyKey;
  final String name;
  final String mimeType;
  final String? folderId;
  final int sourceSizeBytes;
  XFile? source;
  StagedUpload? record;
  UploadJob? job;
  String? fileId;
  bool cancelRequested = false;
  bool pauseRequested = false;
}

class _Cancelled implements Exception {
  const _Cancelled();
}

/// Random-access adapter over a platform-picked file. Every read is bounded by
/// the pinned chunk size, so a large source is never loaded whole.
class _XFilePlaintextSource implements PlaintextSource {
  _XFilePlaintextSource({required this.file, required this.size});

  final XFile file;

  @override
  final int size;

  @override
  Future<Uint8List> read(int start, int end) async {
    final builder = BytesBuilder(copy: false);
    await for (final chunk in file.openRead(start, end)) {
      builder.add(chunk);
    }
    final bytes = builder.takeBytes();
    if (bytes.length != end - start) {
      throw const TransferException(
        'The source file changed or ended while it was being encrypted.',
      );
    }
    return bytes;
  }
}
