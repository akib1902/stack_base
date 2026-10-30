import 'dart:async';

import 'package:stackbase_mobile/core/auth/auth_repository.dart';
import 'package:stackbase_mobile/core/auth/auth_session.dart';
import 'package:stackbase_mobile/core/config/app_config.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({
    this.initial,
    this.authMode = AuthMode.dev,
    this.signInError,
  });

  AuthSession? initial;
  final AuthMode authMode;
  final AuthFailure? signInError;

  final _sessions = StreamController<AuthSession?>.broadcast();
  AuthSession? _current;
  int refreshCalls = 0;
  int signOutCalls = 0;
  int clearLocalCalls = 0;

  @override
  AuthMode get mode => authMode;

  @override
  AuthSession? get currentSession => _current;

  @override
  Stream<AuthSession?> get sessions => _sessions.stream;

  @override
  Future<AuthSession?> restore() async {
    _current = initial;
    return _current;
  }

  @override
  Future<AuthSession?> refresh() async {
    refreshCalls++;
    return _current;
  }

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    final failure = signInError;
    if (failure != null) throw failure;
    final session = AuthSession(
      userId: '0d3f2f4e-3c45-4f17-9f9e-0f7a1f4b2c11',
      email: email.trim(),
      accessToken: 'fake-access-token',
      expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
      source: authMode == AuthMode.supabase
          ? AuthSource.supabase
          : AuthSource.dev,
    );
    _current = session;
    _sessions.add(session);
    return session;
  }

  @override
  Future<void> signOut() async {
    signOutCalls++;
    _current = null;
    _sessions.add(null);
  }

  @override
  Future<void> clearLocal() async {
    clearLocalCalls++;
    _current = null;
    _sessions.add(null);
  }

  Future<void> dispose() => _sessions.close();
}
