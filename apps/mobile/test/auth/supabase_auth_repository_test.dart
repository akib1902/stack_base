import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:stackbase_mobile/core/auth/auth_repository.dart';
import 'package:stackbase_mobile/core/auth/auth_session.dart';
import 'package:stackbase_mobile/core/auth/secure_session_store.dart';
import 'package:stackbase_mobile/core/auth/supabase_auth_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../support/memory_secure_store.dart';

class MockGoTrueClient extends Mock implements GoTrueClient {}

class MockSupabaseClient extends Mock implements SupabaseClient {}

String _accessToken() {
  final payload = base64Url.encode(
    utf8.encode(
      jsonEncode({
        'exp': DateTime.now().add(const Duration(hours: 1)).millisecondsSinceEpoch ~/ 1000,
      }),
    ),
  );
  return 'header.$payload.signature';
}

Session _session({String token = ''}) {
  return Session(
    accessToken: token.isEmpty ? _accessToken() : token,
    tokenType: 'bearer',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    user: User(
      id: '0d3f2f4e-3c45-4f17-9f9e-0f7a1f4b2c11',
      appMetadata: const {},
      userMetadata: const {},
      aud: 'authenticated',
      createdAt: DateTime.utc(2026, 1, 4).toIso8601String(),
      email: 'owner@example.test',
    ),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(_session());
  });

  late MockSupabaseClient client;
  late MockGoTrueClient auth;
  late MemorySecureStore raw;
  late SecureSessionStore store;
  late SupabaseAuthRepository repository;

  setUp(() {
    client = MockSupabaseClient();
    auth = MockGoTrueClient();
    raw = MemorySecureStore();
    store = SecureSessionStore(raw);

    when(() => client.auth).thenReturn(auth);
    when(() => auth.onAuthStateChange).thenAnswer((_) => const Stream.empty());
    when(() => auth.currentSession).thenReturn(null);

    repository = SupabaseAuthRepository(client: client, store: store);
  });

  tearDown(() => repository.dispose());

  test('restores a persisted GoTrue session', () async {
    final session = _session();
    when(() => auth.currentSession).thenReturn(session);

    final restored = await repository.restore();
    expect(restored?.userId, session.user.id);
    expect(restored?.email, 'owner@example.test');
    expect(restored?.source, AuthSource.supabase);
    expect(restored?.expiresAt, isNotNull);
    expect(restored?.isExpired, isFalse);
  });

  test('maps an invalid password without leaking GoTrue details', () async {
    when(
      () => auth.signInWithPassword(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    ).thenThrow(
      const AuthException(
        'Invalid login credentials',
        statusCode: '400',
        code: 'invalid_credentials',
      ),
    );

    await expectLater(
      repository.signIn(email: 'owner@example.test', password: 'bad'),
      throwsA(
        isA<AuthFailure>().having(
          (failure) => failure.code,
          'code',
          AuthFailureCode.invalidCredentials,
        ),
      ),
    );
  });

  test('single-flight refresh returns the same future', () async {
    final session = _session();
    when(() => auth.currentSession).thenReturn(session);
    when(() => auth.refreshSession()).thenAnswer((_) async {
      await Future<void>.delayed(const Duration(milliseconds: 20));
      return AuthResponse(session: _session(), user: _session().user);
    });
    await repository.restore();

    final first = repository.refresh();
    final second = repository.refresh();
    expect(identical(first, second), isTrue);
    final results = await Future.wait([first, second]);

    expect(results[0]?.accessToken, isNotEmpty);
    verify(() => auth.refreshSession()).called(1);
  });

  test('sign-out clears the session and the account namespace', () async {
    final session = _session();
    when(() => auth.currentSession).thenReturn(session);
    when(() => auth.signOut()).thenAnswer((_) async {});
    await repository.restore();
    await store.writeAccountSecret(session.user.id, 'vault_key', 'secret');

    await repository.signOut();

    expect(await store.readSupabaseSession(), isNull);
    expect(
      await store.readAccountSecret(session.user.id, 'vault_key'),
      isNull,
    );
    expect(repository.currentSession, isNull);
    verify(() => auth.signOut()).called(1);
  });

  test('a rejected refresh clears local material', () async {
    final session = _session();
    when(() => auth.currentSession).thenReturn(session);
    when(() => auth.refreshSession()).thenThrow(
      const AuthException('Refresh token revoked', statusCode: '401'),
    );
    await repository.restore();

    expect(await repository.refresh(), isNull);
    expect(repository.currentSession, isNull);
    expect(await store.readSupabaseSession(), isNull);
  });
}
