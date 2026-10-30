import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import 'api/api_client.dart';
import 'api/dev_session_client.dart';
import 'api/dio_factory.dart';
import 'auth/auth_controller.dart';
import 'auth/auth_repository.dart';
import 'auth/dev_auth_repository.dart';
import 'auth/secure_session_store.dart';
import 'auth/supabase_auth_repository.dart';
import 'config/app_config.dart';
import 'models/me_response.dart';
import 'models/setup_status.dart';

/// Non-null when Supabase initialization failed after configuration passed.
final startupFailureProvider = Provider<String?>((ref) => null);

/// Overridden in `main()` after compile-time configuration is validated.
final appConfigProvider = Provider<AppConfig>((ref) {
  throw StateError(
    'appConfigProvider must be overridden with the validated AppConfig.',
  );
});

final secureKeyValueStoreProvider = Provider<SecureKeyValueStore>(
  (ref) => PlatformSecureKeyValueStore(),
);

final secureSessionStoreProvider = Provider<SecureSessionStore>(
  (ref) => SecureSessionStore(ref.watch(secureKeyValueStoreProvider)),
);

/// Null unless `AUTH_MODE=supabase`; overridden in `main()` after
/// `Supabase.initialize` succeeds.
final supabaseClientProvider = Provider<supabase.SupabaseClient?>((ref) => null);

final devSessionClientProvider = Provider<DevSessionClient>((ref) {
  final config = ref.watch(appConfigProvider);
  return DevSessionClient(createDevSessionDio(config));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final config = ref.watch(appConfigProvider);
  final store = ref.watch(secureSessionStoreProvider);
  switch (config.resolvedAuthMode) {
    case AuthMode.supabase:
      final client = ref.watch(supabaseClientProvider);
      if (client == null) {
        throw StateError('Supabase was not initialized for this build.');
      }
      final repository = SupabaseAuthRepository(client: client, store: store);
      ref.onDispose(repository.dispose);
      return repository;
    case AuthMode.dev:
      final repository = DevAuthRepository(
        client: ref.watch(devSessionClientProvider),
        store: store,
        isDebug: config.isDebug,
      );
      ref.onDispose(repository.dispose);
      return repository;
    case null:
      throw StateError('Authentication mode is not configured.');
  }
});

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthState>(AuthController.new);

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(appConfigProvider);
  final repository = ref.watch(authRepositoryProvider);
  final dio = createApiDio(
    config: config,
    accessToken: () async => repository.currentSession?.accessToken,
    refreshToken: () async => (await repository.refresh())?.accessToken,
    onSessionExpired: () {
      ref.read(authControllerProvider.notifier).markExpired();
    },
  );
  ref.onDispose(dio.close);
  return ApiClient(dio: dio, config: config);
});

final meProvider = FutureProvider<MeResponse>((ref) {
  return ref.watch(apiClientProvider).fetchMe();
});

final setupStatusProvider = FutureProvider<SetupStatusResponse>((ref) {
  return ref.watch(apiClientProvider).fetchSetupStatus();
});

final healthProvider = FutureProvider<HealthResponse>((ref) {
  return ref.watch(apiClientProvider).fetchHealth();
});

final packageInfoProvider = FutureProvider<PackageInfo>((ref) {
  return PackageInfo.fromPlatform();
});

/// Reachability hint only; a connected interface does not prove the API is
/// reachable. The health probe and request failures remain authoritative.
final connectivityProvider = StreamProvider<List<ConnectivityResult>>((
  ref,
) async* {
  final connectivity = Connectivity();
  yield await connectivity.checkConnectivity();
  yield* connectivity.onConnectivityChanged;
});

final interfaceOfflineProvider = Provider<bool>((ref) {
  final results = ref.watch(connectivityProvider).value;
  if (results == null || results.isEmpty) return false;
  return results.every((result) => result == ConnectivityResult.none);
});
