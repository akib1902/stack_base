import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/api_client.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/api/dio_factory.dart';
import 'package:stackbase_mobile/core/models/user_settings.dart';

import '../support/fixtures.dart';
import '../support/scripted_http_adapter.dart';

void main() {
  group('ApiClient', () {
    test('parses /me against the contract fixture', () async {
      final config = testConfig(api: 'https://api.example.test');
      final dio = Dio(BaseOptions(baseUrl: config.apiV1Base.toString()));
      final adapter = ScriptedHttpAdapter([
        ScriptedReply(200, meFixture.toJson()),
      ]);
      dio.httpClientAdapter = adapter;

      final client = ApiClient(dio: dio, config: config);
      final me = await client.fetchMe();

      expect(me.user.email, 'owner@example.test');
      expect(me.settings.defaultSort, FileSort.updatedAt);
      expect(adapter.requests.single.path, 'me');
    });

    test('sends a partial settings PATCH with no null fields', () async {
      final config = testConfig(api: 'https://api.example.test');
      final dio = Dio(BaseOptions(baseUrl: config.apiV1Base.toString()));
      final adapter = ScriptedHttpAdapter([
        ScriptedReply(200, meFixture.settings.toJson()),
      ]);
      dio.httpClientAdapter = adapter;

      final client = ApiClient(dio: dio, config: config);
      await client.updateSettings(
        const UserSettingsUpdate(theme: ServerTheme.graphite),
      );

      expect(adapter.requests.single.method, 'PATCH');
      expect(adapter.requests.single.data, {'theme': 'graphite'});
    });

    test('maps a server envelope failure', () async {
      final config = testConfig(api: 'https://api.example.test');
      final dio = Dio(BaseOptions(baseUrl: config.apiV1Base.toString()));
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(404, {
          'error': {'code': 'FILE_NOT_FOUND', 'message': 'Gone.'},
        }),
      ]);
      dio.httpClientAdapter = adapter;

      final client = ApiClient(dio: dio, config: config);
      await expectLater(
        client.fetchMe(),
        throwsA(
          isA<ApiException>().having((e) => e.code, 'code', 'FILE_NOT_FOUND'),
        ),
      );
    });
  });

  group('AuthInterceptor', () {
    test('refreshes once and retries with the new token', () async {
      final config = testConfig(api: 'https://api.example.test');
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(401, {
          'error': {'code': 'AUTH_REQUIRED', 'message': 'Expired.'},
        }),
        ScriptedReply(200, meFixture.toJson()),
      ]);
      var refreshCalls = 0;
      var expiredCalls = 0;

      final dio = createApiDio(
        config: config,
        accessToken: () async => 'old-token',
        refreshToken: () async {
          refreshCalls++;
          return 'new-token';
        },
        onSessionExpired: () => expiredCalls++,
      );
      dio.httpClientAdapter = adapter;

      final response = await dio.get<Map<String, dynamic>>('me');
      expect(response.statusCode, 200);
      expect(response.data?['user']['email'], 'owner@example.test');
      expect(refreshCalls, 1);
      expect(expiredCalls, 0);
      expect(adapter.requests, hasLength(2));
      expect(adapter.requests[0].headers['authorization'], 'Bearer old-token');
      expect(adapter.requests[1].headers['authorization'], 'Bearer new-token');
    });

    test('does not loop when the refreshed token is rejected', () async {
      final config = testConfig(api: 'https://api.example.test');
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(401, {
          'error': {'code': 'AUTH_REQUIRED', 'message': 'Expired.'},
        }),
        const ScriptedReply(401, {
          'error': {'code': 'AUTH_REQUIRED', 'message': 'Still expired.'},
        }),
      ]);
      var refreshCalls = 0;
      var expiredCalls = 0;

      final dio = createApiDio(
        config: config,
        accessToken: () async => 'old-token',
        refreshToken: () async {
          refreshCalls++;
          return 'new-token';
        },
        onSessionExpired: () => expiredCalls++,
      );
      dio.httpClientAdapter = adapter;

      await expectLater(
        dio.get<Map<String, dynamic>>('me'),
        throwsA(isA<DioException>()),
      );
      expect(refreshCalls, 1);
      expect(expiredCalls, 1);
      expect(adapter.requests, hasLength(2));
    });

    test('skips auth on the dev-session route', () async {
      final config = testConfig(api: 'https://api.example.test');
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(401, {
          'error': {'code': 'AUTH_REQUIRED', 'message': 'No.'},
        }),
      ]);
      var expiredCalls = 0;
      final dio = createApiDio(
        config: config,
        accessToken: () async => 'old-token',
        refreshToken: () async => 'new-token',
        onSessionExpired: () => expiredCalls++,
      );
      dio.httpClientAdapter = adapter;

      await expectLater(
        dio.post<Map<String, dynamic>>(
          'dev/session',
          data: {'email': 'owner@example.test'},
          options: Options(extra: const {'skipAuth': true}),
        ),
        throwsA(isA<DioException>()),
      );
      expect(expiredCalls, 0);
      expect(adapter.requests.single.headers['authorization'], isNull);
    });
  });

  group('RetryInterceptor', () {
    test('retries an idempotent GET after a 5xx', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'));
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(500, '{"error":"temporary"}'),
        const ScriptedReply(200, '{"ok":true}'),
      ]);
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(
        RetryInterceptor(
          dio,
          baseDelay: Duration.zero,
          random: Random(2),
        ),
      );

      final response = await dio.get<Map<String, dynamic>>('health');
      expect(response.statusCode, 200);
      expect(adapter.requests, hasLength(2));
    });

    test('does not retry a POST', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'));
      final adapter = ScriptedHttpAdapter([
        const ScriptedReply(500, '{"error":"temporary"}'),
      ]);
      dio.httpClientAdapter = adapter;
      dio.interceptors.add(
        RetryInterceptor(
          dio,
          baseDelay: Duration.zero,
          random: Random(2),
        ),
      );

      await expectLater(
        dio.post<Map<String, dynamic>>('uploads'),
        throwsA(isA<DioException>()),
      );
      expect(adapter.requests, hasLength(1));
    });
  });
}
