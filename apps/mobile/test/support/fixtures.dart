import 'package:stackbase_mobile/core/auth/auth_session.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';
import 'package:stackbase_mobile/core/models/auth_user.dart';
import 'package:stackbase_mobile/core/models/me_response.dart';
import 'package:stackbase_mobile/core/models/setup_status.dart';
import 'package:stackbase_mobile/core/models/user_settings.dart';

final meFixture = MeResponse(
  user: AuthUser(
    id: '0d3f2f4e-3c45-4f17-9f9e-0f7a1f4b2c11',
    email: 'owner@example.test',
    displayName: 'Ari Owner',
    avatarUrl: null,
    createdAt: DateTime.utc(2026, 1, 4),
  ),
  settings: const UserSettings(
    theme: ServerTheme.amber,
    defaultView: DefaultView.grid,
    defaultSort: FileSort.updatedAt,
    trashRetentionDays: 30,
    offlineEnabled: false,
  ),
);

final setupFixture = SetupStatusResponse(
  storage: const SetupStorage(
    provider: StorageProvider.local,
    status: StorageConnectionStatus.connected,
    accountIdentifier: 'development-objects',
    lastValidatedAt: null,
    lastErrorCode: null,
  ),
  encryption: const SetupEncryption(
    vault: EncryptionVaultStatus.configured,
  ),
  library: const SetupLibrary(files: 3, folders: 1, bytes: 2048),
);

const healthFixture = HealthResponse(
  status: HealthStatus.ok,
  version: '0.1.0',
  uptimeSeconds: 42,
  database: DatabaseHealth.ok,
);

final sessionFixture = AuthSession(
  userId: meFixture.user.id,
  email: meFixture.user.email,
  accessToken: 'fixture-access-token',
  expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  source: AuthSource.dev,
);

AppConfig testConfig({
  bool isDebug = true,
  String api = 'http://127.0.0.1:8787',
  String authMode = 'dev',
  String supabaseUrl = '',
  String supabaseKey = '',
  String webOrigin = '',
}) {
  return AppConfig.fromEnvironment(
    EnvironmentValues(
      apiBaseUrl: api,
      supabaseUrl: supabaseUrl,
      supabasePublishableKey: supabaseKey,
      webPublicOrigin: webOrigin,
      authMode: authMode,
    ),
    isDebug: isDebug,
  );
}
