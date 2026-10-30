import 'package:flutter/foundation.dart';

/// Authentication transport selected at build time.
enum AuthMode {
  /// Supabase GoTrue with email and password.
  supabase,

  /// Development-only local sessions issued by `POST /api/v1/dev/session`.
  dev,
}

/// Compile-time values supplied with `--dart-define`.
@immutable
class EnvironmentValues {
  const EnvironmentValues({
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabasePublishableKey,
    required this.webPublicOrigin,
    required this.authMode,
  });

  factory EnvironmentValues.fromDartDefines() {
    return const EnvironmentValues(
      apiBaseUrl: String.fromEnvironment('API_BASE_URL'),
      supabaseUrl: String.fromEnvironment('SUPABASE_URL'),
      supabasePublishableKey: String.fromEnvironment(
        'SUPABASE_PUBLISHABLE_KEY',
      ),
      webPublicOrigin: String.fromEnvironment('WEB_PUBLIC_ORIGIN'),
      authMode: String.fromEnvironment('AUTH_MODE', defaultValue: 'auto'),
    );
  }

  final String apiBaseUrl;
  final String supabaseUrl;
  final String supabasePublishableKey;
  final String webPublicOrigin;
  final String authMode;
}

/// Validated application configuration.
///
/// A configuration problem is not allowed to crash the app: the setup screen
/// renders [problems] with the exact defines required to fix them.
@immutable
class AppConfig {
  const AppConfig._({
    required this.isDebug,
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabasePublishableKey,
    required this.webPublicOrigin,
    required this.resolvedAuthMode,
    required this.rawAuthMode,
    required this.rawApiBaseUrl,
    required this.problems,
  });

  factory AppConfig.fromEnvironment(
    EnvironmentValues env, {
    required bool isDebug,
  }) {
    final problems = <String>[];
    final api = _parseBaseUri(
      env.apiBaseUrl,
      field: 'API_BASE_URL',
      problems: problems,
      requireHttpsInRelease: !isDebug,
    );

    Uri? supabase;
    final supabaseUrl = env.supabaseUrl.trim();
    if (supabaseUrl.isNotEmpty) {
      supabase = _parseBaseUri(
        supabaseUrl,
        field: 'SUPABASE_URL',
        problems: problems,
        requireHttpsInRelease: !isDebug,
      );
    }

    Uri? webOrigin;
    final web = env.webPublicOrigin.trim();
    if (web.isNotEmpty) {
      webOrigin = _parseBaseUri(
        web,
        field: 'WEB_PUBLIC_ORIGIN',
        problems: problems,
        requireHttpsInRelease: !isDebug,
        allowPath: false,
      );
    }

    final rawAuth = env.authMode.trim().toLowerCase();
    final key = env.supabasePublishableKey.trim();

    AuthMode? resolved;
    switch (rawAuth) {
      case '':
      case 'auto':
        if (supabase != null && key.isNotEmpty) {
          resolved = AuthMode.supabase;
        } else if (isDebug) {
          resolved = AuthMode.dev;
        } else {
          problems.add(
            'AUTH_MODE=auto in a release build requires SUPABASE_URL and '
            'SUPABASE_PUBLISHABLE_KEY. Development sessions never run in '
            'release builds.',
          );
        }
      case 'supabase':
        resolved = AuthMode.supabase;
        if (supabase == null) {
          problems.add(
            'AUTH_MODE=supabase requires --dart-define=SUPABASE_URL=...',
          );
        }
        if (key.isEmpty) {
          problems.add(
            'AUTH_MODE=supabase requires '
            '--dart-define=SUPABASE_PUBLISHABLE_KEY=...',
          );
        }
      case 'dev':
        if (isDebug) {
          resolved = AuthMode.dev;
        } else {
          problems.add(
            'AUTH_MODE=dev is development-only and is not accepted in release '
            'builds. Configure Supabase instead.',
          );
        }
      default:
        problems.add(
          'AUTH_MODE must be auto, supabase or dev; received "${env.authMode}".',
        );
    }

    return AppConfig._(
      isDebug: isDebug,
      apiBaseUrl: api,
      supabaseUrl: supabase,
      supabasePublishableKey: key.isEmpty ? null : key,
      webPublicOrigin: webOrigin,
      resolvedAuthMode: resolved,
      rawAuthMode: rawAuth,
      rawApiBaseUrl: env.apiBaseUrl,
      problems: List.unmodifiable(problems),
    );
  }

  final bool isDebug;
  final Uri? apiBaseUrl;
  final Uri? supabaseUrl;
  final String? supabasePublishableKey;
  final Uri? webPublicOrigin;
  final AuthMode? resolvedAuthMode;
  final String rawAuthMode;
  final String rawApiBaseUrl;
  final List<String> problems;

  bool get isConfigured =>
      problems.isEmpty &&
      apiBaseUrl != null &&
      resolvedAuthMode != null;

  bool get devAuthEnabled =>
      isDebug && resolvedAuthMode == AuthMode.dev && apiBaseUrl != null;

  /// `.../api/v1/`, preserving any deployment path prefix.
  Uri get apiV1Base {
    final base = _withTrailingSlash(apiBaseUrl!);
    return base.resolve('api/v1/');
  }

  /// `.../health`, preserving any deployment path prefix.
  Uri get healthUri => _withTrailingSlash(apiBaseUrl!).resolve('health');

  static Uri? _parseBaseUri(
    String raw, {
    required String field,
    required List<String> problems,
    required bool requireHttpsInRelease,
    bool allowPath = true,
  }) {
    final value = raw.trim();
    if (value.isEmpty) {
      if (field == 'API_BASE_URL') {
        problems.add(
          'Missing --dart-define=$field=... (for example '
          'http://127.0.0.1:8787 for a local API).',
        );
      }
      return null;
    }

    final uri = Uri.tryParse(value);
    if (uri == null || !uri.isAbsolute || uri.host.isEmpty) {
      problems.add('$field must be an absolute http(s) URL; got "$value".');
      return null;
    }
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      problems.add('$field must use http or https; got "${uri.scheme}".');
      return null;
    }
    if (uri.userInfo.isNotEmpty) {
      problems.add('$field must not contain credentials.');
      return null;
    }
    if (uri.hasQuery || uri.hasFragment) {
      problems.add('$field must not contain a query or fragment.');
      return null;
    }
    if (!allowPath && uri.path.isNotEmpty && uri.path != '/') {
      problems.add('$field must be an origin without a path.');
      return null;
    }
    if (requireHttpsInRelease && uri.scheme != 'https') {
      problems.add('$field must use https in release builds.');
      return null;
    }

    var path = uri.path;
    while (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    if (path.endsWith('/api/v1')) {
      path = path.substring(0, path.length - '/api/v1'.length);
    }
    return uri.replace(path: path);
  }

  static Uri _withTrailingSlash(Uri uri) {
    if (uri.path.endsWith('/')) return uri;
    return uri.replace(path: '${uri.path}/');
  }
}
