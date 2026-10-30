import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';
import 'auth_repository.dart';
import 'auth_session.dart';
import 'dev_auth_repository.dart';

enum AuthStatus { signedOut, signedIn, expired }

@immutable
class AuthState {
  const AuthState({
    required this.status,
    this.session,
    this.message,
    this.busy = false,
  });

  const AuthState.signedOut({String? message})
    : this(status: AuthStatus.signedOut, message: message);

  const AuthState.expired({String? message})
    : this(status: AuthStatus.expired, message: message);

  final AuthStatus status;
  final AuthSession? session;
  final String? message;
  final bool busy;

  bool get isSignedIn => status == AuthStatus.signedIn && session != null;
  bool get isExpired => status == AuthStatus.expired;

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    String? message,
    bool? busy,
    bool clearMessage = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: session ?? this.session,
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
    );
  }
}

class AuthController extends AsyncNotifier<AuthState> {
  AuthRepository? _repository;
  StreamSubscription<AuthSession?>? _subscription;
  bool _ready = false;
  bool _expiring = false;

  @override
  Future<AuthState> build() async {
    final repository = ref.watch(authRepositoryProvider);
    _repository = repository;
    _subscription = repository.sessions.listen(_onSession);
    ref.onDispose(() {
      _subscription?.cancel();
      _subscription = null;
    });

    try {
      final restored = await repository.restore();
      _ready = true;
      if (restored == null) return const AuthState.signedOut();
      return AuthState(status: AuthStatus.signedIn, session: restored);
    } catch (_) {
      _ready = true;
      return const AuthState.signedOut(
        message:
            'The saved session could not be read. Sign in again; your files '
            'are unaffected.',
      );
    }
  }

  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final repository = _repository;
    if (repository == null) return;
    _setBusy(true);
    try {
      final session = await repository.signIn(
        email: email,
        password: password,
      );
      await _adopt(session);
    } on AuthFailure catch (failure) {
      state = AsyncData(
        AuthState.signedOut(message: failure.message),
      );
    } catch (_) {
      state = const AsyncData(
        AuthState.signedOut(
          message: 'Sign-in failed. Check the API address and try again.',
        ),
      );
    }
  }

  Future<void> signInWithDevSession(String email) async {
    final repository = _repository;
    if (repository is! DevAuthRepository) {
      state = const AsyncData(
        AuthState.signedOut(
          message: 'This build is not configured for development sign-in.',
        ),
      );
      return;
    }
    _setBusy(true);
    try {
      final session = await repository.signInWithDevSession(email);
      await _adopt(session);
    } on AuthFailure catch (failure) {
      state = AsyncData(AuthState.signedOut(message: failure.message));
    } catch (_) {
      state = const AsyncData(
        AuthState.signedOut(
          message:
              'The local API did not issue a session. Confirm the API is '
              'running with AUTH_MODE=dev.',
        ),
      );
    }
  }

  Future<void> signOut() async {
    final repository = _repository;
    if (repository == null) return;
    _setBusy(true);
    try {
      await repository.signOut();
    } finally {
      state = const AsyncData(AuthState.signedOut());
    }
  }

  /// Called once when an authenticated request cannot be recovered.
  Future<void> markExpired({
    String? message =
        'Your session expired. Sign in again to continue.',
  }) async {
    if (_expiring || state.valueOrNull?.status == AuthStatus.expired) return;
    _expiring = true;
    try {
      await _repository?.clearLocal();
    } finally {
      _expiring = false;
      state = AsyncData(AuthState.expired(message: message));
    }
  }

  Future<void> _adopt(AuthSession session) async {
    await _discardPreviousAccount(session.userId);
    state = AsyncData(
      AuthState(status: AuthStatus.signedIn, session: session),
    );
  }

  Future<void> _discardPreviousAccount(String nextUserId) async {
    final previous = state.valueOrNull?.session?.userId;
    if (previous == null || previous == nextUserId) return;
    await ref.read(secureSessionStoreProvider).clearAccount(previous);
  }

  void _setBusy(bool busy) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(busy: busy, clearMessage: busy));
  }

  void _onSession(AuthSession? session) {
    if (!_ready) return;
    final current = state.valueOrNull;
    if (session == null) {
      if (current == null || current.status == AuthStatus.signedOut) return;
      state = const AsyncData(AuthState.signedOut());
      return;
    }
    if (current?.status == AuthStatus.expired) return;
    state = AsyncData(
      AuthState(status: AuthStatus.signedIn, session: session),
    );
  }
}
