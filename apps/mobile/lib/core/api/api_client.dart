import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../models/ciphertext_download.dart';
import '../models/library.dart';
import '../models/transfers.dart';
import '../models/me_response.dart';
import '../models/setup_status.dart';
import '../models/user_settings.dart';
import '../models/vault.dart';
import 'api_exception.dart';

/// Typed access to the StackBase API. Milestone 2 adds the read-only library
/// endpoints; uploads, versions, trash and shares remain later milestones.
class ApiClient {
  ApiClient({required Dio dio, required AppConfig config})
    : _dio = dio,
      _config = config;

  final Dio _dio;
  final AppConfig _config;

  Future<MeResponse> fetchMe() async {
    final data = await _getJson('me');
    return _parse(data, MeResponse.fromJson);
  }

  Future<SetupStatusResponse> fetchSetupStatus() async {
    final data = await _getJson('setup/status');
    return _parse(data, SetupStatusResponse.fromJson);
  }

  Future<UserSettings> updateSettings(UserSettingsUpdate update) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        'me/settings',
        data: update.toJson(),
        options: Options(contentType: Headers.jsonContentType),
      );
      final parsed = _parse(response.data, UserSettings.fromJson);
      return parsed;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Malformed settings response: ${error.message}',
      );
    }
  }

  /// Full library summary: totals, nine category buckets, recent and largest.
  Future<LibrarySummaryResponse> fetchLibrarySummary() async {
    final data = await _getJson('library/summary');
    return _parse(data, LibrarySummaryResponse.fromJson);
  }

  Future<FolderListResponse> fetchFolders() async {
    final data = await _getJson('folders');
    return _parse(data, FolderListResponse.fromJson);
  }

  Future<TagListResponse> fetchTags() async {
    final data = await _getJson('tags');
    return _parse(data, TagListResponse.fromJson);
  }

  /// One page of the server's file list. The cache sync pages through this
  /// until `hasMore` is false; the UI itself filters the synced snapshot.
  Future<FileListResponse> fetchFiles({
    String? query,
    LibraryCategory? category,
    String? folderId,
    bool favoritesOnly = false,
    String? tagId,
    FileSort? sort,
    int limit = 100,
    int offset = 0,
  }) async {
    final params = <String, dynamic>{
      'limit': limit.toString(),
      'offset': offset.toString(),
    };
    final term = query?.trim();
    if (term != null && term.isNotEmpty) params['q'] = term;
    if (category != null) params['category'] = category.wireValue;
    if (folderId != null) params['folderId'] = folderId;
    if (favoritesOnly) params['favorite'] = 'true';
    if (tagId != null) params['tagId'] = tagId;
    if (sort != null) params['sort'] = sort.wireValue;

    final data = await _getJson('files', queryParameters: params);
    return _parse(data, FileListResponse.fromJson);
  }

  /// Storage insights. Computed by the server from real aggregates; the app
  /// presents them read-only in Milestone 2.
  Future<StorageInsightsResponse> fetchInsights() async {
    final data = await _getJson('insights');
    return _parse(data, StorageInsightsResponse.fromJson);
  }

  // -------------------------------------------------------------------------
  // Encrypted uploads and immutable versions
  // -------------------------------------------------------------------------

  Future<CreateUploadResponse> createUpload(CreateUploadRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'uploads',
        data: request.toJson(),
        options: Options(contentType: Headers.jsonContentType),
      );
      return _parse<CreateUploadResponse>(
        response.data,
        CreateUploadResponse.fromJson,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// Sends exactly one ciphertext chunk. The 24-byte stream header is already
  /// part of the staged file but is never sent as a chunk.
  Future<UploadJob> putUploadChunk({
    required String uploadId,
    required int chunkNumber,
    required Uint8List data,
    required String checksum,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        'uploads/${Uri.encodeComponent(uploadId)}/chunks/$chunkNumber',
        data: data,
        options: Options(
          contentType: 'application/octet-stream',
          headers: {'x-chunk-checksum': checksum},
        ),
      );
      return _parse<UploadChunkResponse>(
        response.data,
        UploadChunkResponse.fromJson,
      ).upload;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<FinalizeUploadResponse> finalizeUpload({
    required String uploadId,
    required String ciphertextHash,
    required String plaintextFingerprint,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'uploads/${Uri.encodeComponent(uploadId)}/finalize',
        data: {
          'ciphertextHash': ciphertextHash,
          'plaintextFingerprint': plaintextFingerprint,
        },
        options: Options(contentType: Headers.jsonContentType),
      );
      return _parse<FinalizeUploadResponse>(
        response.data,
        FinalizeUploadResponse.fromJson,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<UploadListResponse> listUploads() async {
    final data = await _getJson('uploads');
    return _parse(data, UploadListResponse.fromJson);
  }

  Future<UploadJob> pauseUpload(String uploadId) =>
      _uploadAction(uploadId, 'pause');

  Future<UploadJob> resumeUpload(String uploadId) =>
      _uploadAction(uploadId, 'resume');

  Future<UploadJob> retryUpload(String uploadId) =>
      _uploadAction(uploadId, 'retry');

  Future<UploadJob> cancelUpload(String uploadId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'uploads/${Uri.encodeComponent(uploadId)}/cancel',
        options: Options(contentType: Headers.jsonContentType),
      );
      return _parse<UploadJob>(response.data, (json) {
        final upload = json['upload'];
        if (upload is! Map) {
          throw const FormatException('Cancel response has no upload.');
        }
        return UploadJob.fromJson(Map<String, dynamic>.from(upload));
      });
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<UploadJob> _uploadAction(String uploadId, String action) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'uploads/${Uri.encodeComponent(uploadId)}/$action',
        options: Options(contentType: Headers.jsonContentType),
      );
      return _parse<UploadJob>(response.data, (json) {
        final upload = json['upload'];
        if (upload is! Map) {
          throw const FormatException('Upload action response has no upload.');
        }
        return UploadJob.fromJson(Map<String, dynamic>.from(upload));
      });
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  Future<FileVersionListResponse> fetchVersions(String fileId) async {
    final data = await _getJson(
      'files/${Uri.encodeComponent(fileId)}/versions',
    );
    return _parse(data, FileVersionListResponse.fromJson);
  }

  /// Opens the authenticated ciphertext stream. The caller writes it to a
  /// private temp file, verifies the declared length/hash, then decrypts.
  Future<CiphertextDownload> downloadVersion({
    required String fileId,
    required String versionId,
  }) async {
    try {
      final response = await _dio.get<ResponseBody>(
        'files/${Uri.encodeComponent(fileId)}/versions/'
        '${Uri.encodeComponent(versionId)}/download',
        options: Options(
          responseType: ResponseType.stream,
          headers: {'accept': 'application/octet-stream'},
          extra: const {'noRetry': true},
        ),
      );
      final body = response.data;
      if (body == null) {
        throw const ApiException(
          code: 'INTERNAL_ERROR',
          message: 'The server returned an empty download.',
        );
      }
      final headers = response.headers.map;
      return CiphertextDownload(
        stream: body.stream,
        contentLength: body.contentLength,
        ciphertextHash: headers['x-stackbase-ciphertext-hash']?.first,
        formatVersion: headers['x-stackbase-format']?.first,
      );
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// The account's vault record, or null when no vault has been created yet.
  /// Only ciphertext and non-secret KDF parameters are returned.
  Future<VaultRecord?> fetchVault() async {
    final data = await _getJson('encryption/vault');
    return _parseVaultEnvelope(data);
  }

  /// One-time vault creation. A second attempt returns 409
  /// `VAULT_ALREADY_EXISTS`; the caller must not replace the existing record.
  Future<VaultRecord> createVault(CreateVaultRequest request) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'encryption/vault',
        data: request.toJson(),
        options: Options(contentType: Headers.jsonContentType),
      );
      final vault = _parseVaultEnvelope(response.data);
      if (vault == null) {
        throw const ApiException(
          code: 'INTERNAL_ERROR',
          message: 'The server did not return the created vault.',
        );
      }
      return vault;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Malformed vault response: ${error.message}',
      );
    }
  }

  /// Unversioned readiness endpoint. Uses an absolute URL so the `/api/v1`
  /// base path is not prepended.
  Future<HealthResponse> fetchHealth() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        _config.healthUri.toString(),
        options: Options(
          extra: const {'noRetry': true},
          responseType: ResponseType.json,
        ),
      );
      final parsed = _parse(response.data, HealthResponse.fromJson);
      return parsed;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Malformed health response: ${error.message}',
      );
    }
  }

  Future<Map<String, dynamic>> _getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
      );
      final data = response.data;
      if (data == null) {
        throw const ApiException(
          code: 'INTERNAL_ERROR',
          message: 'The server returned an empty response.',
        );
      }
      return data;
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  VaultRecord? _parseVaultEnvelope(Map<String, dynamic>? data) {
    if (data == null) {
      throw const ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The server returned an empty vault response.',
      );
    }
    final value = data['vault'];
    if (value == null) return null;
    if (value is! Map) {
      throw const ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The vault response did not match the contract.',
      );
    }
    try {
      return VaultRecord.fromJson(Map<String, dynamic>.from(value));
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Malformed vault record: ${error.message}',
      );
    }
  }

  T _parse<T>(
    Map<String, dynamic>? data,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    if (data == null) {
      throw const ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The server returned an empty response.',
      );
    }
    try {
      return fromJson(data);
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'Malformed response: ${error.message}',
      );
    } on TypeError {
      throw const ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The server response did not match the contract.',
      );
    }
  }
}
