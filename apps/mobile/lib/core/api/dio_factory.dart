import 'dart:developer' as developer;
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../config/app_config.dart';

const _clientName = 'stackbase-mobile/0.1.0';

/// Creates the single Dio instance used for authenticated API traffic.
Dio createApiDio({
  required AppConfig config,
  required Future<String?> Function() accessToken,
  required Future<String?> Function() refreshToken,
  required void Function() onSessionExpired,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiV1Base.toString(),
      connectTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 60),
      receiveTimeout: const Duration(seconds: 60),
      responseType: ResponseType.json,
      headers: const {'accept': 'application/json'},
    ),
  );

  dio.interceptors.addAll([
    RequestContextInterceptor(),
    RetryInterceptor(dio),
    AuthInterceptor(
      dio,
      accessToken: accessToken,
      refreshToken: refreshToken,
      onSessionExpired: onSessionExpired,
    ),
    if (kDebugMode) DiagnosticsInterceptor(),
  ]);
  return dio;
}

/// Dio for the one unauthenticated development endpoint.
Dio createDevSessionDio(AppConfig config) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiV1Base.toString(),
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      responseType: ResponseType.json,
      headers: const {'accept': 'application/json'},
    ),
  );
  dio.interceptors.addAll([
    RequestContextInterceptor(),
    RetryInterceptor(dio),
    if (kDebugMode) DiagnosticsInterceptor(),
  ]);
  return dio;
}

/// Adds a per-attempt request id and a non-secret client marker.
class RequestContextInterceptor extends Interceptor {
  RequestContextInterceptor({Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra.putIfAbsent('requestId', _uuid.v4);
    options.headers.putIfAbsent('x-request-id', () => options.extra['requestId']);
    options.headers.putIfAbsent('x-stackbase-client', () => _clientName);
    handler.next(options);
  }
}

/// Retries idempotent reads on transport failures, 429 and 5xx only.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(
    this._dio, {
    this.maxAttempts = 2,
    this.baseDelay = const Duration(milliseconds: 400),
    Random? random,
  }) : _random = random ?? Random();

  final Dio _dio;
  final int maxAttempts;
  final Duration baseDelay;
  final Random _random;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (!_isRetryable(err)) {
      handler.next(err);
      return;
    }
    final attempt = (err.requestOptions.extra['retryAttempt'] as int?) ?? 0;
    if (attempt >= maxAttempts) {
      handler.next(err);
      return;
    }

    final backoff = baseDelay * pow(2, attempt).toInt();
    final jitter = Duration(milliseconds: _random.nextInt(250));
    await Future<void>.delayed(backoff + jitter);

    final options = err.requestOptions;
    options.extra['retryAttempt'] = attempt + 1;
    try {
      final response = await _dio.fetch<dynamic>(options);
      handler.resolve(response);
    } on DioException catch (nextError) {
      handler.next(nextError);
    } catch (error, stackTrace) {
      handler.next(
        DioException(
          requestOptions: options,
          error: error,
          stackTrace: stackTrace,
        ),
      );
    }
  }

  bool _isRetryable(DioException err) {
    final options = err.requestOptions;
    if (options.method != 'GET' && options.method != 'HEAD') return false;
    if (options.extra['noRetry'] == true) return false;

    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
      case DioExceptionType.unknown:
        return true;
      case DioExceptionType.badResponse:
        final status = err.response?.statusCode;
        return status == 429 || (status != null && status >= 500);
      case DioExceptionType.badCertificate:
      case DioExceptionType.cancel:
        return false;
    }
  }
}

/// Attaches the bearer token and performs exactly one refresh-and-retry on
/// `401 AUTH_REQUIRED`. The repository makes the refresh single-flight.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(
    this._dio, {
    required this.accessToken,
    required this.refreshToken,
    required this.onSessionExpired,
  });

  final Dio _dio;
  final Future<String?> Function() accessToken;
  final Future<String?> Function() refreshToken;
  final void Function() onSessionExpired;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.extra['skipAuth'] == true) {
      handler.next(options);
      return;
    }
    final token = await accessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    final status = err.response?.statusCode;
    final isAuthError = status == 401;
    final skipsAuth =
        options.extra['skipAuth'] == true ||
        options.path.contains('dev/session');
    if (!isAuthError || skipsAuth) {
      handler.next(err);
      return;
    }

    if (options.extra['authRetried'] == true) {
      onSessionExpired();
      handler.next(err);
      return;
    }

    String? token;
    try {
      token = await refreshToken();
    } catch (_) {
      token = null;
    }
    if (token == null || token.isEmpty) {
      onSessionExpired();
      handler.next(err);
      return;
    }

    final retry = options.copyWith(
      extra: {...options.extra, 'authRetried': true},
      headers: {...options.headers, 'authorization': 'Bearer $token'},
    );
    try {
      final response = await _dio.fetch<dynamic>(retry);
      handler.resolve(response);
    } on DioException catch (nextError) {
      if (nextError.response?.statusCode == 401) {
        onSessionExpired();
      }
      handler.next(nextError);
    } catch (error, stackTrace) {
      handler.next(
        DioException(
          requestOptions: retry,
          error: error,
          stackTrace: stackTrace,
        ),
      );
    }
  }
}

/// Logs method, path, status and timing only. Never headers or bodies.
class DiagnosticsInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra['startedAt'] = DateTime.now();
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    _log(response.requestOptions, response.statusCode);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _log(err.requestOptions, err.response?.statusCode, error: err.type.name);
    handler.next(err);
  }

  void _log(RequestOptions options, int? status, {String? error}) {
    final started = options.extra['startedAt'];
    final elapsed = started is DateTime
        ? DateTime.now().difference(started).inMilliseconds
        : null;
    developer.log(
      '${options.method} ${options.uri.path} -> ${status ?? 'no status'}'
      '${elapsed == null ? '' : ' ${elapsed}ms'}'
      '${error == null ? '' : ' ($error)'} '
      '[${options.extra['requestId']}]',
      name: 'stackbase.api',
    );
  }
}
