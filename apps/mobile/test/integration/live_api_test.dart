import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/api_client.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/api/dev_session_client.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';
import 'package:stackbase_mobile/core/models/user_settings.dart';

/// Opt-in smoke test against a real local API. Run with:
///
///   flutter test test/integration/live_api_test.dart \
///     --dart-define=LIVE_API_BASE_URL=http://127.0.0.1:8787
///
/// The normal suite skips it, so CI never depends on a running server.
void main() {
  const base = String.fromEnvironment('LIVE_API_BASE_URL');
  final config = base.isEmpty
      ? null
      : AppConfig.fromEnvironment(
          const EnvironmentValues(
            apiBaseUrl: base,
            supabaseUrl: '',
            supabasePublishableKey: '',
            webPublicOrigin: '',
            authMode: 'dev',
          ),
          isDebug: true,
        );

  group(
    'live API contract',
    () {
      late DevSessionClient devClient;
      late ApiClient api;
      late String email;
      late DevSessionResponse session;

      setUpAll(() async {
        final apiConfig = config!;
        expect(apiConfig.isConfigured, isTrue, reason: 'live config invalid');

        devClient = DevSessionClient(
          Dio(
            BaseOptions(
              baseUrl: apiConfig.apiV1Base.toString(),
              responseType: ResponseType.json,
            ),
          ),
        );
        email =
            'mobile-live-${DateTime.now().millisecondsSinceEpoch}@example.test';
        session = await devClient.createSession(email);

        final dio = Dio(
          BaseOptions(
            baseUrl: apiConfig.apiV1Base.toString(),
            responseType: ResponseType.json,
            headers: {'authorization': 'Bearer ${session.accessToken}'},
          ),
        );
        api = ApiClient(dio: dio, config: apiConfig);
      });

      test('issues a real dev session and reads /me', () async {
        expect(session.email, email);
        expect(session.userId, isNotEmpty);

        final me = await api.fetchMe();
        expect(me.user.id, session.userId);
        expect(me.user.email, email);
      });

      test('reads setup status with the authenticated client', () async {
        final status = await api.fetchSetupStatus();
        expect(status.storage.provider, isNotNull);
        expect(status.library.files, greaterThanOrEqualTo(0));
      });

      test('writes and reads the account theme preference', () async {
        final updated = await api.updateSettings(
          const UserSettingsUpdate(theme: ServerTheme.graphite),
        );
        expect(updated.theme, ServerTheme.graphite);

        final reread = await api.fetchMe();
        expect(reread.settings.theme, ServerTheme.graphite);
      });

      test('rejects a request without a token', () async {
        final anonymous = ApiClient(
          dio: Dio(
            BaseOptions(
              baseUrl: config!.apiV1Base.toString(),
              responseType: ResponseType.json,
            ),
          ),
          config: config,
        );
        await expectLater(
          anonymous.fetchMe(),
          throwsA(
            isA<ApiException>().having(
              (error) => error.code,
              'code',
              'AUTH_REQUIRED',
            ),
          ),
        );
      });
    },
    skip: base.isEmpty
        ? 'Set LIVE_API_BASE_URL to run the real-API smoke test.'
        : false,
  );
}
