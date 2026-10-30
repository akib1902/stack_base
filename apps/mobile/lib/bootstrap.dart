import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import 'app/app.dart';
import 'core/auth/secure_session_store.dart';
import 'core/config/app_config.dart';
import 'core/providers.dart';

/// Validates configuration before any session or network call, initializes the
/// identity provider once, then starts the app.
Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  final config = AppConfig.fromEnvironment(
    EnvironmentValues.fromDartDefines(),
    isDebug: kDebugMode,
  );
  final secureStore = SecureSessionStore(PlatformSecureKeyValueStore());

  supabase.SupabaseClient? client;
  String? startupFailure;

  if (config.isConfigured &&
      config.resolvedAuthMode == AuthMode.supabase) {
    try {
      final instance = await supabase.Supabase.initialize(
        url: config.supabaseUrl!.toString(),
        publishableKey: config.supabasePublishableKey!,
        authOptions: supabase.FlutterAuthClientOptions(
          localStorage: SecureSupabaseLocalStorage(secureStore),
          detectSessionInUri: false,
          persistSession: true,
          autoRefreshToken: true,
        ),
      );
      client = instance.client;
    } catch (error) {
      startupFailure = kDebugMode
          ? error.toString()
          : 'Supabase initialization failed.';
      if (kDebugMode) {
        debugPrint('StackBase Supabase initialization failed: $error');
      }
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        appConfigProvider.overrideWithValue(config),
        secureSessionStoreProvider.overrideWithValue(secureStore),
        supabaseClientProvider.overrideWithValue(client),
        startupFailureProvider.overrideWithValue(startupFailure),
      ],
      child: const StackBaseApp(),
    ),
  );
}
