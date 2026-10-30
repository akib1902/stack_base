import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_session.freezed.dart';

enum AuthSource {
  supabase,
  dev,
}

/// A verified local session. Tokens live only in memory and in secure storage.
@freezed
abstract class AuthSession with _$AuthSession {
  const factory AuthSession({
    required String userId,
    required String? email,
    required String accessToken,
    required DateTime? expiresAt,
    required AuthSource source,
  }) = _AuthSession;

  const AuthSession._();

  bool get isExpired {
    final expiry = expiresAt;
    if (expiry == null) return false;
    return expiry.isBefore(DateTime.now().toUtc());
  }
}
