import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/api_client.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/api/dev_session_client.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';
import 'package:stackbase_mobile/core/models/library.dart';
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

        // Seed metadata for this fresh identity so the read mapping is checked
        // against non-empty real rows, not only an empty library.
        await dio.post<Map<String, dynamic>>(
          'folders',
          data: {'name': 'Mobile live folder'},
        );
        await dio.post<Map<String, dynamic>>(
          'tags',
          data: {'name': 'mobile-live'},
        );
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

      test('reads the library namespace through the shared contract', () async {
        final summary = await api.fetchLibrarySummary();
        expect(summary.categories, hasLength(LibraryCategory.values.length));
        expect(summary.totals.files, greaterThanOrEqualTo(0));

        final folders = await api.fetchFolders();
        final tags = await api.fetchTags();
        final files = await api.fetchFiles(limit: 10);
        expect(folders.items, isA<List<FolderSummary>>());
        expect(tags.items, isA<List<TagListItem>>());
        expect(folders.items, isNotEmpty);
        expect(folders.items.single.name, 'Mobile live folder');
        expect(tags.items, isNotEmpty);
        expect(summary.totals.folders, greaterThanOrEqualTo(1));
        expect(summary.totals.tags, greaterThanOrEqualTo(1));
        expect(files.limit, 10);
        expect(files.items.length, lessThanOrEqualTo(10));
        expect(files.hasMore, isFalse);

        final insights = await api.fetchInsights();
        expect(insights.categories, hasLength(LibraryCategory.values.length));
        expect(insights.totals.files, summary.totals.files);
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
