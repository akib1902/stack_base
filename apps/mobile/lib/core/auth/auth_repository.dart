import '../config/app_config.dart';
import 'auth_session.dart';

/// Failure that a sign-in surface can present without exposing internals.
enum AuthFailureCode {
  invalidCredentials,
  emailNotConfirmed,
  rateLimited,
  networkUnavailable,
  invalidSession,
  unsupported,
  unknown,
}

class AuthFailure implements Exception {
  const AuthFailure(this.code, this.message);

  final AuthFailureCode code;
  final String message;

  @override
  String toString() => 'AuthFailure($code): $message';
}

abstract interface class AuthRepository {
  AuthMode get mode;

  /// The in-memory session; never read from disk on every request.
  AuthSession? get currentSession;

  /// Restores a persisted session after process death.
  Future<AuthSession?> restore();

  /// Refreshes once; concurrent callers share the same in-flight result.
  Future<AuthSession?> refresh();

  Future<AuthSession> signIn({
    required String email,
    required String password,
  });

  Future<void> signOut();

  /// Clears local material without calling the identity provider. Used when
  /// the API has already rejected the token.
  Future<void> clearLocal();

  /// Emits the current session, or null when the provider signs the user out.
  Stream<AuthSession?> get sessions;
}
