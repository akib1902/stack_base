import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/dev_session_client.dart';
import 'package:stackbase_mobile/core/auth/dev_auth_repository.dart';
import 'package:stackbase_mobile/core/auth/secure_session_store.dart';

import '../support/memory_secure_store.dart';

class FakeDevSessionApi implements DevSessionApi {
  FakeDevSessionApi({this.delay = Duration.zero});

  final Duration delay;
  int calls = 0;
  String? lastEmail;

  @override
  Future<DevSessionResponse> createSession(String email) async {
    calls++;
    lastEmail = email;
    if (delay > Duration.zero) {
      await Future<void>.delayed(delay);
    }
    return DevSessionResponse(
      accessToken: 'dev-token-$calls',
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 12)),
      userId: '6a0f3b0c-8a93-4a09-a2d0-1f6f0afc1b22',
      email: email,
    );
  }
}

void main() {
  group('DevAuthRepository', () {
    test('persists a development session and restores it', () async {
      final raw = MemorySecureStore();
      final store = SecureSessionStore(raw);
      final api = FakeDevSessionApi();
      final repo = DevAuthRepository(client: api, store: store, isDebug: true);

      final signedIn = await repo.signInWithDevSession('OWNER@Example.Test');
      expect(signedIn.email, 'owner@example.test');
      expect(api.lastEmail, 'owner@example.test');
      expect(raw.values[SecureSessionStore.devSessionKey], isNotNull);

      repo.dispose();
      final restored = DevAuthRepository(
        client: api,
        store: store,
        isDebug: true,
      );
      final session = await restored.restore();
      expect(session?.accessToken, 'dev-token-1');
      restored.dispose();
    });

    test('clears an expired stored session instead of restoring it', () async {
      final raw = MemorySecureStore({
        SecureSessionStore.devSessionKey: jsonEncode({
          'userId': '6a0f3b0c-8a93-4a09-a2d0-1f6f0afc1b22',
          'email': 'owner@example.test',
          'accessToken': 'expired-token',
          'expiresAt': DateTime.now()
              .toUtc()
              .subtract(const Duration(minutes: 1))
              .toIso8601String(),
        }),
      });
      final api = FakeDevSessionApi();
      final repo = DevAuthRepository(
        client: api,
        store: SecureSessionStore(raw),
        isDebug: true,
      );

      expect(await repo.restore(), isNull);
      expect(raw.values.containsKey(SecureSessionStore.devSessionKey), isFalse);
      expect(api.calls, 0);
      repo.dispose();
    });

    test('refresh is single-flight and reissues only an expired token', () async {
      final raw = MemorySecureStore({
        SecureSessionStore.devSessionKey: jsonEncode({
          'userId': '6a0f3b0c-8a93-4a09-a2d0-1f6f0afc1b22',
          'email': 'owner@example.test',
          'accessToken': 'expired-token',
          'expiresAt': DateTime.now()
              .toUtc()
              .subtract(const Duration(minutes: 1))
              .toIso8601String(),
        }),
      });
      final api = FakeDevSessionApi(delay: const Duration(milliseconds: 30));
      final repo = DevAuthRepository(
        client: api,
        store: SecureSessionStore(raw),
        isDebug: true,
      );

      final first = repo.refresh();
      final second = repo.refresh();
      expect(identical(first, second), isTrue);
      final results = await Future.wait([first, second]);

      expect(api.calls, 1);
      expect(results[0]?.accessToken, 'dev-token-1');
      expect(results[1]?.accessToken, 'dev-token-1');
      repo.dispose();
    });

    test('sign-out removes the session and every account secret', () async {
      final raw = MemorySecureStore();
      final store = SecureSessionStore(raw);
      final api = FakeDevSessionApi();
      final repo = DevAuthRepository(client: api, store: store, isDebug: true);
      final session = await repo.signInWithDevSession('owner@example.test');
      await store.writeAccountSecret(session.userId, 'vault_key', 'secret');

      await repo.signOut();

      expect(await store.readDevSession(), isNull);
      expect(await store.readAccountSecret(session.userId, 'vault_key'), isNull);
      expect(repo.currentSession, isNull);
      repo.dispose();
    });

    test('refuses to construct outside a debug build', () {
      expect(
        () => DevAuthRepository(
          client: FakeDevSessionApi(),
          store: SecureSessionStore(MemorySecureStore()),
          isDebug: false,
        ),
        throwsStateError,
      );
    });
  });
}
