import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../models/me_response.dart';
import '../models/setup_status.dart';
import '../models/user_settings.dart';
import 'api_exception.dart';

/// Typed access to the endpoints Mobile Milestone 1 uses.
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

  Future<Map<String, dynamic>> _getJson(String path) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(path);
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
