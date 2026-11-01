import '../crypto/file_format.dart';
import 'library.dart';

/// Strict Dart mirrors of the upload and version contracts. The server is
/// authoritative; an unknown status or malformed manifest fails parsing rather
/// than becoming a guessed state.
enum UploadJobStatus {
  queued,
  preparing,
  encrypting,
  transferring,
  finalizing,
  paused,
  retrying,
  failed,
  needsSourceFile,
  reconciliationRequired,
  completed,
  cancelled,
}

UploadJobStatus uploadJobStatusFromWire(String value) {
  return switch (value) {
    'queued' => UploadJobStatus.queued,
    'preparing' => UploadJobStatus.preparing,
    'encrypting' => UploadJobStatus.encrypting,
    'transferring' => UploadJobStatus.transferring,
    'finalizing' => UploadJobStatus.finalizing,
    'paused' => UploadJobStatus.paused,
    'retrying' => UploadJobStatus.retrying,
    'failed' => UploadJobStatus.failed,
    'needs_source_file' => UploadJobStatus.needsSourceFile,
    'reconciliation_required' => UploadJobStatus.reconciliationRequired,
    'completed' => UploadJobStatus.completed,
    'cancelled' => UploadJobStatus.cancelled,
    _ => throw FormatException('Unknown upload status: $value'),
  };
}

class UploadJob {
  const UploadJob({
    required this.id,
    required this.fileId,
    required this.idempotencyKey,
    required this.fileName,
    required this.sourceFingerprint,
    required this.status,
    required this.sourceSizeBytes,
    required this.encryptedSizeBytes,
    required this.chunkSizeBytes,
    required this.totalChunks,
    required this.receivedChunks,
    required this.receivedChunkNumbers,
    required this.retryCount,
    required this.lastErrorCode,
    required this.createdAt,
    required this.updatedAt,
    required this.completedAt,
    required this.cancelledAt,
  });

  final String id;
  final String? fileId;
  final String idempotencyKey;
  final String? fileName;
  final String? sourceFingerprint;
  final UploadJobStatus status;
  final int sourceSizeBytes;
  final int? encryptedSizeBytes;
  final int chunkSizeBytes;
  final int totalChunks;
  final int receivedChunks;
  final List<int> receivedChunkNumbers;
  final int retryCount;
  final String? lastErrorCode;
  final String createdAt;
  final String updatedAt;
  final String? completedAt;
  final String? cancelledAt;

  factory UploadJob.fromJson(Map<String, dynamic> json) {
    final numbers = json['receivedChunkNumbers'];
    if (numbers is! List) {
      throw const FormatException('Upload job is missing received chunks.');
    }
    return UploadJob(
      id: _string(json, 'id'),
      fileId: _stringOrNull(json, 'fileId'),
      idempotencyKey: _string(json, 'idempotencyKey'),
      fileName: _stringOrNull(json, 'fileName'),
      sourceFingerprint: _stringOrNull(json, 'sourceFingerprint'),
      status: uploadJobStatusFromWire(_string(json, 'status')),
      sourceSizeBytes: _int(json, 'sourceSizeBytes'),
      encryptedSizeBytes: _intOrNull(json, 'encryptedSizeBytes'),
      chunkSizeBytes: _int(json, 'chunkSizeBytes'),
      totalChunks: _int(json, 'totalChunks'),
      receivedChunks: _int(json, 'receivedChunks'),
      receivedChunkNumbers: [
        for (final number in numbers)
          if (number is int)
            number
          else
            throw const FormatException('Upload chunk number is not an integer.'),
      ],
      retryCount: _int(json, 'retryCount'),
      lastErrorCode: _stringOrNull(json, 'lastErrorCode'),
      createdAt: _string(json, 'createdAt'),
      updatedAt: _string(json, 'updatedAt'),
      completedAt: _stringOrNull(json, 'completedAt'),
      cancelledAt: _stringOrNull(json, 'cancelledAt'),
    );
  }

  bool get isFinished =>
      status == UploadJobStatus.completed || status == UploadJobStatus.cancelled;

  bool get canRetry =>
      status == UploadJobStatus.failed ||
      status == UploadJobStatus.needsSourceFile ||
      status == UploadJobStatus.paused;

  UploadJob copyWith({UploadJobStatus? status, int? receivedChunks}) {
    return UploadJob(
      id: id,
      fileId: fileId,
      idempotencyKey: idempotencyKey,
      fileName: fileName,
      sourceFingerprint: sourceFingerprint,
      status: status ?? this.status,
      sourceSizeBytes: sourceSizeBytes,
      encryptedSizeBytes: encryptedSizeBytes,
      chunkSizeBytes: chunkSizeBytes,
      totalChunks: totalChunks,
      receivedChunks: receivedChunks ?? this.receivedChunks,
      receivedChunkNumbers: receivedChunkNumbers,
      retryCount: retryCount,
      lastErrorCode: lastErrorCode,
      createdAt: createdAt,
      updatedAt: updatedAt,
      completedAt: completedAt,
      cancelledAt: cancelledAt,
    );
  }
}

class CreateUploadRequest {
  const CreateUploadRequest({
    required this.idempotencyKey,
    required this.name,
    required this.mimeType,
    required this.folderId,
    required this.manifest,
    required this.sourceFingerprint,
  });

  final String idempotencyKey;
  final String name;
  final String mimeType;
  final String? folderId;
  final UploadManifest manifest;
  final String sourceFingerprint;

  Map<String, dynamic> toJson() => {
    'idempotencyKey': idempotencyKey,
    'name': name,
    'mimeType': mimeType,
    'folderId': folderId,
    'manifest': manifest.toJson(),
    'sourceFingerprint': sourceFingerprint,
  };
}

class CreateUploadResponse {
  const CreateUploadResponse({required this.upload, required this.file});

  final UploadJob upload;
  final FileSummary file;

  factory CreateUploadResponse.fromJson(Map<String, dynamic> json) {
    return CreateUploadResponse(
      upload: UploadJob.fromJson(_map(json, 'upload')),
      file: FileSummary.fromJson(_map(json, 'file')),
    );
  }
}

class UploadChunkResponse {
  const UploadChunkResponse(this.upload);

  final UploadJob upload;

  factory UploadChunkResponse.fromJson(Map<String, dynamic> json) =>
      UploadChunkResponse(UploadJob.fromJson(_map(json, 'upload')));
}

class FinalizeUploadResponse {
  const FinalizeUploadResponse({
    required this.upload,
    required this.file,
    required this.version,
  });

  final UploadJob upload;
  final FileSummary file;
  final FileVersion version;

  factory FinalizeUploadResponse.fromJson(Map<String, dynamic> json) {
    return FinalizeUploadResponse(
      upload: UploadJob.fromJson(_map(json, 'upload')),
      file: FileSummary.fromJson(_map(json, 'file')),
      version: FileVersion.fromJson(_map(json, 'version')),
    );
  }
}

class UploadListResponse {
  const UploadListResponse(this.items);

  final List<UploadJob> items;

  factory UploadListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List) {
      throw const FormatException('Upload list is missing items.');
    }
    return UploadListResponse([
      for (final item in items)
        UploadJob.fromJson(Map<String, dynamic>.from(item as Map)),
    ]);
  }
}

class FileVersion {
  const FileVersion({
    required this.id,
    required this.fileId,
    required this.versionNumber,
    required this.sizeBytes,
    required this.ciphertextSizeBytes,
    required this.ciphertextHash,
    required this.encryptionFormatVersion,
    required this.manifest,
    required this.storageStatus,
    required this.createdAt,
  });

  final String id;
  final String fileId;
  final int versionNumber;
  final int sizeBytes;
  final int ciphertextSizeBytes;
  final String ciphertextHash;
  final String encryptionFormatVersion;
  final EncryptionManifest manifest;
  final String storageStatus;
  final String createdAt;

  bool get isAvailable => storageStatus == 'available';

  factory FileVersion.fromJson(Map<String, dynamic> json) {
    return FileVersion(
      id: _string(json, 'id'),
      fileId: _string(json, 'fileId'),
      versionNumber: _int(json, 'versionNumber'),
      sizeBytes: _int(json, 'sizeBytes'),
      ciphertextSizeBytes: _int(json, 'ciphertextSizeBytes'),
      ciphertextHash: _string(json, 'ciphertextHash'),
      encryptionFormatVersion: _string(json, 'encryptionFormatVersion'),
      manifest: EncryptionManifest.fromJson(_map(json, 'manifest')),
      storageStatus: _string(json, 'storageStatus'),
      createdAt: _string(json, 'createdAt'),
    );
  }
}

class FileVersionListResponse {
  const FileVersionListResponse(this.items);

  final List<FileVersion> items;

  factory FileVersionListResponse.fromJson(Map<String, dynamic> json) {
    final items = json['items'];
    if (items is! List) {
      throw const FormatException('Version list is missing items.');
    }
    return FileVersionListResponse([
      for (final item in items)
        FileVersion.fromJson(Map<String, dynamic>.from(item as Map)),
    ]);
  }
}

/// The local half of an upload. The ciphertext `.part` file is the resume
/// source; this record supplies the exact manifest and the stable idempotency
/// key after process death. It contains no plaintext or key material.
class StagedUpload {
  const StagedUpload({
    required this.localId,
    required this.idempotencyKey,
    required this.name,
    required this.mimeType,
    required this.folderId,
    required this.sourceSizeBytes,
    required this.manifest,
    required this.stagingFileName,
    required this.createdAt,
  });

  final String localId;
  final String idempotencyKey;
  final String name;
  final String mimeType;
  final String? folderId;
  final int sourceSizeBytes;
  final EncryptionManifest manifest;
  final String stagingFileName;
  final DateTime createdAt;

  factory StagedUpload.fromJson(Map<String, dynamic> json) {
    return StagedUpload(
      localId: _string(json, 'localId'),
      idempotencyKey: _string(json, 'idempotencyKey'),
      name: _string(json, 'name'),
      mimeType: _string(json, 'mimeType'),
      folderId: _stringOrNull(json, 'folderId'),
      sourceSizeBytes: _int(json, 'sourceSizeBytes'),
      manifest: EncryptionManifest.fromJson(_map(json, 'manifest')),
      stagingFileName: _string(json, 'stagingFileName'),
      createdAt: DateTime.parse(_string(json, 'createdAt')),
    );
  }

  Map<String, dynamic> toJson() => {
    'localId': localId,
    'idempotencyKey': idempotencyKey,
    'name': name,
    'mimeType': mimeType,
    'folderId': folderId,
    'sourceSizeBytes': sourceSizeBytes,
    'manifest': manifest.toJson(),
    'stagingFileName': stagingFileName,
    'createdAt': createdAt.toUtc().toIso8601String(),
  };
}

Map<String, dynamic> _map(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! Map) {
    throw FormatException('Response is missing $key.');
  }
  return Map<String, dynamic>.from(value);
}

String _string(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! String) throw FormatException('Response is missing $key.');
  return value;
}

String? _stringOrNull(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! String) throw FormatException('$key is not a string.');
  return value;
}

int _int(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is! int) throw FormatException('Response is missing $key.');
  return value;
}

int? _intOrNull(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is! int) throw FormatException('$key is not an integer.');
  return value;
}
