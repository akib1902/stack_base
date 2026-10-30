import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Small seam over platform secure storage so auth can be tested without a
/// device keystore.
abstract interface class SecureKeyValueStore {
  Future<String?> read(String key);

  Future<void> write(String key, String value);

  Future<void> delete(String key);

  Future<Map<String, String>> readAll();
}

/// Android Keystore / iOS Keychain implementation.
class PlatformSecureKeyValueStore implements SecureKeyValueStore {
  PlatformSecureKeyValueStore({FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(),
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock_this_device,
              synchronizable: false,
            ),
          );

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);

  @override
  Future<Map<String, String>> readAll() => _storage.readAll();
}

/// Namespaced secure storage for session material and per-account keys.
///
/// Session JSON is the only value written today. Vault keys arrive in the
/// crypto milestone and use the same account namespace so sign-out can remove
/// every key belonging to the departing account.
class SecureSessionStore {
  SecureSessionStore(this._store);

  static const supabaseSessionKey = 'stackbase.auth.supabase.session';
  static const devSessionKey = 'stackbase.auth.dev.session';
  static const accountPrefix = 'stackbase.account.';

  final SecureKeyValueStore _store;

  String accountKey(String userId, String name) =>
      '$accountPrefix$userId.$name';

  String vaultKeyName(String userId) => accountKey(userId, 'vault_key');

  Future<String?> readDevSession() => _store.read(devSessionKey);

  Future<void> writeDevSession(Map<String, dynamic> value) =>
      _store.write(devSessionKey, jsonEncode(value));

  Future<void> clearDevSession() => _store.delete(devSessionKey);

  Future<String?> readSupabaseSession() => _store.read(supabaseSessionKey);

  Future<void> writeSupabaseSession(String value) =>
      _store.write(supabaseSessionKey, value);

  Future<void> clearSupabaseSession() => _store.delete(supabaseSessionKey);

  Future<void> clearAuthSessions() async {
    await Future.wait([clearDevSession(), clearSupabaseSession()]);
  }

  Future<void> writeAccountSecret(String userId, String name, String value) =>
      _store.write(accountKey(userId, name), value);

  Future<String?> readAccountSecret(String userId, String name) =>
      _store.read(accountKey(userId, name));

  /// Removes every key scoped to [userId]. Called on sign-out before the next
  /// account can write anything.
  Future<void> clearAccount(String userId) async {
    final prefix = '$accountPrefix$userId.';
    Map<String, String> all;
    try {
      all = await _store.readAll();
    } catch (_) {
      // A keystore that cannot enumerate keys must not block sign-out. Try the
      // two known account keys explicitly.
      await Future.wait([
        _store.delete(vaultKeyName(userId)),
        _store.delete(accountKey(userId, 'preferences')),
      ]);
      return;
    }
    await Future.wait([
      for (final key in all.keys)
        if (key.startsWith(prefix)) _store.delete(key),
    ]);
  }
}

/// Supabase GoTrue persistence backed by the platform keystore.
class SecureSupabaseLocalStorage extends LocalStorage {
  SecureSupabaseLocalStorage(this._store);

  final SecureSessionStore _store;

  @override
  Future<void> initialize() async {
    // Reading is lazy; initialization only verifies the store is reachable.
    await _store.readSupabaseSession();
  }

  @override
  Future<bool> hasAccessToken() async {
    final value = await _store.readSupabaseSession();
    return value != null && value.isNotEmpty;
  }

  @override
  Future<String?> accessToken() => _store.readSupabaseSession();

  @override
  Future<void> persistSession(String persistSessionString) =>
      _store.writeSupabaseSession(persistSessionString);

  @override
  Future<void> removePersistedSession() => _store.clearSupabaseSession();
}
