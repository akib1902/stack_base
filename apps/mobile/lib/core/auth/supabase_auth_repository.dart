import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../config/app_config.dart';
import 'auth_repository.dart';
import 'auth_session.dart';
import 'secure_session_store.dart';

/// GoTrue email/password authentication. Database and storage APIs on the
/// Supabase client are never used; all metadata goes through the Fastify API.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository({
    required supabase.SupabaseClient client,
    required SecureSessionStore store,
  }) : _client = client,
       _store = store {
    _authSubscription = _client.auth.onAuthStateChange.listen((event) {
      final session = _client.auth.currentSession;
      _emit(session == null ? null : _map(session));
    });
  }

  final supabase.SupabaseClient _client;
  final SecureSessionStore _store;
  final _sessions = StreamController<AuthSession?>.broadcast();
  late final StreamSubscription<supabase.AuthState> _authSubscription;

  AuthSession? _current;
  Future<AuthSession?>? _refreshing;

  @override
  AuthMode get mode => AuthMode.supabase;

  @override
  AuthSession? get currentSession => _current;

  @override
  Stream<AuthSession?> get sessions => _sessions.stream;

  @override
  Future<AuthSession?> restore() async {
    final session = _client.auth.currentSession;
    if (session == null) {
      _current = null;
      return null;
    }
    final mapped = _map(session);
    _current = mapped;
    return mapped;
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
    final existing = _client.auth.currentSession;
    if (existing == null) return null;
    try {
      final response = await _client.auth.refreshSession();
      final session = response.session;
      if (session == null) {
        await _clearLocal();
        return null;
      }
      final mapped = _map(session);
      _current = mapped;
      _emit(mapped);
      return mapped;
    } on supabase.AuthException {
      await _clearLocal();
      return null;
    } catch (_) {
      // A transport failure is not proof that the session is invalid. Keep the
      // current token; the caller presents an offline/retry state.
      return _current;
    }
  }

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      final session = response.session;
      if (session == null) {
        throw const AuthFailure(
          AuthFailureCode.unknown,
          'Sign-in succeeded but no session was returned.',
        );
      }
      final mapped = _map(session);
      _current = mapped;
      _emit(mapped);
      return mapped;
    } on supabase.AuthException catch (error) {
      throw _mapFailure(error);
    }
  }

  @override
  Future<void> signOut() async {
    final userId = _current?.userId;
    try {
      await _client.auth.signOut();
    } catch (_) {
      // Local removal is mandatory even when GoTrue is unreachable.
    } finally {
      await _clearLocal();
      if (userId != null) {
        await _store.clearAccount(userId);
      }
    }
  }

  @override
  Future<void> clearLocal() => _clearLocal();

  Future<void> _clearLocal() async {
    _current = null;
    await _store.clearAuthSessions();
    _emit(null);
  }

  AuthSession _map(supabase.Session session) {
    final expiresAt = session.expiresAt;
    final email = session.user.email;
    return AuthSession(
      userId: session.user.id,
      email: email == null || email.isEmpty ? null : email,
      accessToken: session.accessToken,
      expiresAt: expiresAt == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              expiresAt * 1000,
              isUtc: true,
            ),
      source: AuthSource.supabase,
    );
  }

  void _emit(AuthSession? session) {
    if (!_sessions.isClosed) _sessions.add(session);
  }

  AuthFailure _mapFailure(supabase.AuthException error) {
    final rawCode = error.code ?? '';
    final status = error.statusCode;
    if (rawCode.contains('invalid_credentials') ||
        rawCode.contains('invalid_grant') ||
        status == '400') {
      return const AuthFailure(
        AuthFailureCode.invalidCredentials,
        'The email or password is incorrect.',
      );
    }
    if (rawCode.contains('email_not_confirmed')) {
      return const AuthFailure(
        AuthFailureCode.emailNotConfirmed,
        'Confirm your email address before signing in.',
      );
    }
    if (rawCode.contains('rate_limit') ||
        rawCode.contains('over_request_rate_limit') ||
        status == '429') {
      return const AuthFailure(
        AuthFailureCode.rateLimited,
        'Too many sign-in attempts. Wait a moment and try again.',
      );
    }
    if (status == '0' || error.message.toLowerCase().contains('socket')) {
      return const AuthFailure(
        AuthFailureCode.networkUnavailable,
        'Could not reach the authentication service.',
      );
    }
    return AuthFailure(
      AuthFailureCode.unknown,
      error.message.isEmpty ? 'Sign-in failed.' : error.message,
    );
  }
}
