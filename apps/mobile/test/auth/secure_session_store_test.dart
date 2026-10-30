import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/auth/secure_session_store.dart';

import '../support/memory_secure_store.dart';

void main() {
  group('SecureSessionStore', () {
    test('scopes account secrets and clears only the departing account', () async {
      final raw = MemorySecureStore();
      final store = SecureSessionStore(raw);

      await store.writeAccountSecret('user-a', 'vault_key', 'key-a');
      await store.writeAccountSecret('user-b', 'vault_key', 'key-b');
      await store.writeAccountSecret('user-a', 'preferences', 'prefs-a');
      await store.writeDevSession({'token': 'dev'});
      await store.writeSupabaseSession('{"session":true}');

      await store.clearAccount('user-a');

      expect(raw.values.containsKey(store.vaultKeyName('user-a')), isFalse);
      expect(
        raw.values.containsKey(store.accountKey('user-a', 'preferences')),
        isFalse,
      );
      expect(await store.readAccountSecret('user-b', 'vault_key'), 'key-b');
      expect(await store.readDevSession(), isNotNull);
      expect(await store.readSupabaseSession(), isNotNull);

      await store.clearAuthSessions();
      expect(await store.readDevSession(), isNull);
      expect(await store.readSupabaseSession(), isNull);
    });

    test('SecureSupabaseLocalStorage round-trips the GoTrue session', () async {
      final store = SecureSessionStore(MemorySecureStore());
      final storage = SecureSupabaseLocalStorage(store);

      await storage.initialize();
      expect(await storage.hasAccessToken(), isFalse);
      expect(await storage.accessToken(), isNull);

      await storage.persistSession('{"access_token":"abc"}');
      expect(await storage.hasAccessToken(), isTrue);
      expect(await storage.accessToken(), '{"access_token":"abc"}');

      await storage.removePersistedSession();
      expect(await storage.hasAccessToken(), isFalse);
      expect(await store.readSupabaseSession(), isNull);
    });
  });
}
