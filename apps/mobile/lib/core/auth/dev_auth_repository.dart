import 'dart:async';
import 'dart:convert';

import '../api/api_exception.dart';
import '../api/dev_session_client.dart';
import '../config/app_config.dart';
import 'auth_repository.dart';
import 'auth_session.dart';
import 'secure_session_store.dart';

/// Development-only sessions. Constructed solely in debug builds when the API
/// runs with `AUTH_MODE=dev`; release builds reject this mode at startup.
class DevAuthRepository implements AuthRepository {
  DevAuthRepository({
    required DevSessionClient client,
    required SecureSessionStore store,
    required bool isDebug,
  }) : _client = client,
       _store = store,
       _isDebug = isDebug {
    if (!isDebug) {
      throw StateError('Development authentication is not available in release');
    }
  }

  final DevSessionClient _client;
  final SecureSessionStore _store;
  final bool _isDebug;
  final _sessions = StreamController<AuthSession?>.broadcast();

  AuthSession? _current;
  Future<AuthSession?>? _refreshing;

  @override
  AuthMode get mode => AuthMode.dev;

  @override
  AuthSession? get currentSession => _current;

  @override
  Stream<AuthSession?> get sessions => _sessions.stream;

  @override
  Future<AuthSession?> restore() async {
    final stored = await _readStored();
    if (stored == null) return null;
    if (stored.isExpired) {
      await _clearLocal();
      return null;
    }
    _current = stored;
    return stored;
  }

  Future<AuthSession> signInWithDevSession(String email) async {
    final response = await _client.createSession(email);
    final session = AuthSession(
      userId: response.userId,
      email: response.email,
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      source: AuthSource.dev,
    );
    await _persist(session);
    _current = session;
    _emit(session);
    return session;
  }

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    throw const AuthFailure(
      AuthFailureCode.unsupported,
      'This build uses local development sessions. Use the development '
      'sign-in below.',
    );
  }

  @override
  Future<AuthSession?> refresh() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight;
    final future = _refresh().whenComplete(() => _refreshing = null);
    _refreshing = future;
    return future;
  }

  Future<AuthSession?> _refresh() async {
    final session = _current ?? await _readStored();
    if (session == null) return null;
    if (!session.isExpired) {
      _current = session;
      return session;
    }
    final email = session.email;
    if (email == null) {
      await _clearLocal();
      return null;
    }
    try {
      return await signInWithDevSession(email);
    } on ApiException {
      await _clearLocal();
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    final userId = _current?.userId;
    await _clearLocal();
    if (userId != null) {
      await _store.clearAccount(userId);
    }
  }

  @override
  Future<void> clearLocal() => _clearLocal();

  Future<void> _clearLocal() async {
    _current = null;
    await _store.clearDevSession();
    _emit(null);
  }

  Future<AuthSession?> _readStored() async {
    final raw = await _store.readDevSession();
    if (raw == null || raw.isEmpty) return null;
    try {
      final json = jsonDecode(raw);
      if (json is! Map) {
        await _store.clearDevSession();
        return null;
      }
      final userId = json['userId'];
      final token = json['accessToken'];
      final expiresAt = json['expiresAt'];
      final email = json['email'];
      if (userId is! String ||
          token is! String ||
          expiresAt is! String ||
          email is! String) {
        await _store.clearDevSession();
        return null;
      }
      return AuthSession(
        userId: userId,
        email: email,
        accessToken: token,
        expiresAt: DateTime.parse(expiresAt).toUtc(),
        source: AuthSource.dev,
      );
    } catch (_) {
      await _store.clearDevSession();
      return null;
    }
  }

  Future<void> _persist(AuthSession session) {
    return _store.writeDevSession({
      'userId': session.userId,
      'email': session.email,
      'accessToken': session.accessToken,
      'expiresAt': session.expiresAt?.toIso8601String(),
    });
  }

  void _emit(AuthSession? session) {
    if (!_sessions.isClosed) _sessions.add(session);
  }

  // Kept explicit so the debug-only nature is never lost in refactors.
  bool get isDevelopmentOnly => _isDebug;
}
