import 'package:dio/dio.dart';

import 'api_exception.dart';

class DevSessionResponse {
  const DevSessionResponse({
    required this.accessToken,
    required this.expiresAt,
    required this.userId,
    required this.email,
  });

  final String accessToken;
  final DateTime expiresAt;
  final String userId;
  final String email;

  factory DevSessionResponse.fromJson(Map<String, dynamic> json) {
    final token = json['accessToken'];
    final expiresAt = json['expiresAt'];
    final user = json['user'];
    if (token is! String || expiresAt is! String || user is! Map) {
      throw const FormatException('Malformed dev session response.');
    }
    final id = user['id'];
    final email = user['email'];
    if (id is! String || email is! String) {
      throw const FormatException('Malformed dev session user.');
    }
    return DevSessionResponse(
      accessToken: token,
      expiresAt: DateTime.parse(expiresAt).toUtc(),
      userId: id,
      email: email,
    );
  }
}

/// Unauthenticated client for the development-only session route.
class DevSessionClient {
  DevSessionClient(this._dio);

  final Dio _dio;

  Future<DevSessionResponse> createSession(String email) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        'dev/session',
        data: {'email': email.trim().toLowerCase()},
        options: Options(extra: const {'skipAuth': true}),
      );
      final data = response.data;
      if (data == null) {
        throw const ApiException(
          code: 'INTERNAL_ERROR',
          message: 'The dev session response was empty.',
        );
      }
      return DevSessionResponse.fromJson(data);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    } on FormatException catch (error) {
      throw ApiException(
        code: 'INTERNAL_ERROR',
        message: 'The dev session response was malformed: ${error.message}',
      );
    }
  }
}
