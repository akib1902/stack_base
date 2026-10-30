import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';

import '../support/fixtures.dart';

void main() {
  group('AppConfig', () {
    test('rejects a missing API base URL', () {
      final config = testConfig(api: '');
      expect(config.isConfigured, isFalse);
      expect(config.problems.single, contains('API_BASE_URL'));
    });

    test('auto selects development sessions in debug builds', () {
      final config = testConfig();
      expect(config.isConfigured, isTrue);
      expect(config.resolvedAuthMode, AuthMode.dev);
      expect(config.devAuthEnabled, isTrue);
      expect(config.apiV1Base.toString(), 'http://127.0.0.1:8787/api/v1/');
      expect(config.healthUri.toString(), 'http://127.0.0.1:8787/health');
    });

    test('strips a trailing /api/v1 from API_BASE_URL', () {
      final config = testConfig(api: 'https://drive.example.test/api/v1');
      expect(config.apiV1Base.toString(), 'https://drive.example.test/api/v1/');
      expect(config.healthUri.toString(), 'https://drive.example.test/health');
    });

    test('keeps a deployment path prefix', () {
      final config = testConfig(api: 'https://example.test/stackbase/');
      expect(
        config.apiV1Base.toString(),
        'https://example.test/stackbase/api/v1/',
      );
      expect(config.healthUri.toString(), 'https://example.test/stackbase/health');
    });

    test('rejects release builds over cleartext HTTP', () {
      final config = testConfig(
        isDebug: false,
        api: 'http://drive.example.test',
      );
      expect(config.isConfigured, isFalse);
      expect(config.problems, anyElement(contains('https')));
    });

    test('rejects development auth in release builds', () {
      final config = testConfig(
        isDebug: false,
        api: 'https://drive.example.test',
        authMode: 'dev',
      );
      expect(config.isConfigured, isFalse);
      expect(config.problems.single, contains('development-only'));
    });

    test('requires a Supabase key when auth mode is supabase', () {
      final config = testConfig(
        authMode: 'supabase',
        supabaseUrl: 'https://project.supabase.co',
      );
      expect(config.isConfigured, isFalse);
      expect(config.problems.single, contains('SUPABASE_PUBLISHABLE_KEY'));
    });

    test('accepts explicit Supabase configuration', () {
      final config = testConfig(
        authMode: 'supabase',
        supabaseUrl: 'https://project.supabase.co',
        supabaseKey: 'sb_publishable_test',
      );
      expect(config.isConfigured, isTrue);
      expect(config.resolvedAuthMode, AuthMode.supabase);
      expect(config.devAuthEnabled, isFalse);
    });

    test('auto selects Supabase when both values are present', () {
      final config = testConfig(
        authMode: 'auto',
        supabaseUrl: 'https://project.supabase.co',
        supabaseKey: 'sb_publishable_test',
      );
      expect(config.resolvedAuthMode, AuthMode.supabase);
    });

    test('rejects credentials in the API URL', () {
      final config = testConfig(api: 'https://user:secret@example.test');
      expect(config.isConfigured, isFalse);
      expect(config.problems.single, contains('credentials'));
    });

    test('rejects a path on the web origin', () {
      final config = testConfig(webOrigin: 'https://example.test/app');
      expect(config.isConfigured, isFalse);
      expect(config.problems.single, contains('without a path'));
    });
  });
}
