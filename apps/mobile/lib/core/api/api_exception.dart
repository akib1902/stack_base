import 'dart:convert';

import 'package:dio/dio.dart';

/// Normalised API/network failure. Callers branch on [code], never on the
/// server message, exactly like the web client.
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.details,
    this.requestId,
  });

  final String code;
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;
  final String? requestId;

  bool get isAuthFailure => code == 'AUTH_REQUIRED' || statusCode == 401;

  bool get isNetworkFailure =>
      code == 'NETWORK_UNAVAILABLE' || code == 'TIMEOUT';

  factory ApiException.fromDio(DioException error) {
    final response = error.response;
    final requestId =
        response?.requestOptions.extra['requestId'] as String?;

    final envelope = _envelope(response?.data);
    if (envelope != null) {
      return ApiException(
        code: envelope.code,
        message: envelope.message,
        statusCode: response?.statusCode,
        details: envelope.details,
        requestId: requestId,
      );
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return ApiException(
          code: 'TIMEOUT',
          message: 'The server did not respond in time.',
          requestId: requestId,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          code: 'NETWORK_UNAVAILABLE',
          message:
              'The API is unreachable. Check your connection and the '
              'configured API address.',
          requestId: requestId,
        );
      case DioExceptionType.badCertificate:
        return ApiException(
          code: 'TLS_ERROR',
          message: 'The API certificate could not be verified.',
          requestId: requestId,
        );
      case DioExceptionType.cancel:
        return const ApiException(
          code: 'CANCELLED',
          message: 'The request was cancelled.',
        );
      case DioExceptionType.badResponse:
        final status = response?.statusCode;
        if (status == 401) {
          return ApiException(
            code: 'AUTH_REQUIRED',
            message: 'Your session is no longer valid.',
            statusCode: status,
            requestId: requestId,
          );
        }
        if (status == 403) {
          return ApiException(
            code: 'FORBIDDEN',
            message: 'You do not have access to this resource.',
            statusCode: status,
            requestId: requestId,
          );
        }
        if (status == 429) {
          return ApiException(
            code: 'RATE_LIMITED',
            message: 'Too many requests. Try again shortly.',
            statusCode: status,
            requestId: requestId,
          );
        }
        return ApiException(
          code: status != null && status >= 500
              ? 'INTERNAL_ERROR'
              : 'HTTP_ERROR',
          message: status != null && status >= 500
              ? 'The server could not complete the request.'
              : 'The request was rejected by the server.',
          statusCode: status,
          requestId: requestId,
        );
      case DioExceptionType.unknown:
        return ApiException(
          code: 'NETWORK_ERROR',
          message: 'The request failed before a response was received.',
          requestId: requestId,
        );
    }
  }

  /// Human-readable guidance used by banners and sheets. The code remains the
  /// source of truth for behaviour.
  String get userMessage {
    switch (code) {
      case 'AUTH_REQUIRED':
        return 'Your session expired. Sign in again to continue.';
      case 'FORBIDDEN':
        return 'This account does not have access to that item.';
      case 'VALIDATION_ERROR':
        return message;
      case 'FILE_TOO_LARGE':
        return 'That file is larger than this server allows.';
      case 'VAULT_ALREADY_EXISTS':
        return 'This account already has an encryption vault. Unlock it instead of creating a new one.';
      case 'STORAGE_DISCONNECTED':
        return 'Storage is disconnected. Reconnect it on the web app.';
      case 'STORAGE_RECONCILIATION_REQUIRED':
        return 'Storage needs operator attention before files can change.';
      case 'TELEGRAM_RATE_LIMIT':
        return 'Telegram asked us to slow down. Retry in a moment.';
      case 'RATE_LIMITED':
        return 'Too many requests. Wait a moment, then retry.';
      case 'DATABASE_UNAVAILABLE':
      case 'INTERNAL_ERROR':
        return 'The server is having trouble. Try again shortly.';
      case 'NETWORK_UNAVAILABLE':
        return 'You are offline or the API is unreachable.';
      case 'TIMEOUT':
        return 'The request timed out. Check the connection and retry.';
      case 'TLS_ERROR':
        return 'The API certificate is not trusted.';
      case 'CANCELLED':
        return 'The request was cancelled.';
      default:
        return message.isEmpty ? 'The request failed.' : message;
    }
  }

  @override
  String toString() =>
      'ApiException($code${statusCode == null ? '' : ' $statusCode'}): '
      '$message';
}

class _Envelope {
  const _Envelope(this.code, this.message, this.details);

  final String code;
  final String message;
  final Map<String, dynamic>? details;
}

_Envelope? _envelope(Object? data) {
  Object? decoded = data;
  if (data is String && data.isNotEmpty) {
    try {
      decoded = jsonDecode(data);
    } catch (_) {
      return null;
    }
  }
  if (decoded is! Map) return null;
  final error = decoded['error'];
  if (error is! Map) return null;
  final code = error['code'];
  final message = error['message'];
  if (code is! String || message is! String) return null;
  final details = error['details'];
  return _Envelope(
    code,
    message,
    details is Map ? Map<String, dynamic>.from(details) : null,
  );
}
