import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../models/library.dart';
import '../models/me_response.dart';
import '../models/setup_status.dart';
import '../models/user_settings.dart';
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
