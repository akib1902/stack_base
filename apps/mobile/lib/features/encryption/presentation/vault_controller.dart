import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/crypto/crypto_error.dart';
import '../../../core/crypto/encoding.dart';
import '../../../core/crypto/sodium_service.dart';
import '../../../core/crypto/vault.dart';
import '../../../core/models/vault.dart';
import '../../../core/providers.dart';
import '../data/vault_repository.dart';

final vaultRepositoryProvider = Provider<VaultRepository>((ref) {
  return VaultRepository(api: ref.watch(apiClientProvider));
});

final vaultControllerProvider =
    AsyncNotifierProvider<VaultController, VaultState>(VaultController.new);

enum VaultPhase { signedOut, absent, locked, unlocked, unavailable }

@immutable
class VaultState {
  const VaultState({
    required this.phase,
    this.record,
    this.message,
    this.busy = false,
  });

  const VaultState.signedOut()
    : this(phase: VaultPhase.signedOut);

  const VaultState.absent()
    : this(phase: VaultPhase.absent);

  final VaultPhase phase;
  final VaultRecord? record;
  final String? message;
  final bool busy;

  bool get hasVault => record != null;
  bool get isUnlocked => phase == VaultPhase.unlocked;

  VaultState copyWith({
    VaultPhase? phase,
    VaultRecord? record,
    String? message,
    bool? busy,
    bool clearMessage = false,
  }) {
    return VaultState(
      phase: phase ?? this.phase,
      record: record ?? this.record,
      message: clearMessage ? null : (message ?? this.message),
      busy: busy ?? this.busy,
    );
  }
}

/// Holds the unlocked vault key in Dart memory only. The record (wrapped key,
/// salt, verifier) comes from the API; the passphrase never leaves the device.
class VaultController extends AsyncNotifier<VaultState> {
  Uint8List? _vaultKey;

  /// The in-memory vault key for M4 file operations. Never persist this value.
  Uint8List? get vaultKey => _vaultKey;

  @override
  Future<VaultState> build() async {
    _lockKey();
    ref.onDispose(_lockKey);

    // Signing out, expiring or switching accounts must drop the key before the
    // next account can read anything.
    final auth = ref.watch(authControllerProvider).value;
    if (auth?.session == null) {
      return const VaultState.signedOut();
    }
    return _load();
  }

  Future<VaultState> _load() async {
    try {
      final record = await ref.read(vaultRepositoryProvider).fetch();
      if (record == null) return const VaultState.absent();
      return VaultState(phase: VaultPhase.locked, record: record);
    } on ApiException catch (error) {
      return VaultState(
        phase: VaultPhase.unavailable,
        message: error.userMessage,
      );
    } catch (_) {
      return const VaultState(
        phase: VaultPhase.unavailable,
        message: 'The vault record could not be read.',
      );
    }
  }

  Future<void> refresh() async {
    final current = state.value;
    if (current == null) return;
    state = const AsyncLoading();
    state = AsyncData(await _load());
  }

  Future<void> createVault(String passphrase) async {
    final current = state.value;
    if (current == null || current.busy) return;
    state = AsyncData(current.copyWith(busy: true, clearMessage: true));

    CreatedVault? created;
    var transferred = false;
    try {
      final crypto = VaultCrypto(await SodiumService.instance());
      created = await crypto.createVault(passphrase);
      final record = await ref
          .read(vaultRepositoryProvider)
          .create(created.request);
      _lockKey();
      _vaultKey = created.vaultKey;
      transferred = true;
      state = AsyncData(
        VaultState(phase: VaultPhase.unlocked, record: record),
      );
    } on ApiException catch (error) {
      if (error.code == 'VAULT_ALREADY_EXISTS') {
        final existing = await _tryFetch();
        state = AsyncData(
          VaultState(
            phase: existing == null
                ? VaultPhase.unavailable
                : VaultPhase.locked,
            record: existing,
            message:
                'This account already has a vault. Unlock the existing vault '
                'instead; the new key was discarded.',
          ),
        );
      } else {
        state = AsyncData(
          current.copyWith(busy: false, message: error.userMessage),
        );
      }
    } on CryptoException catch (error) {
      state = AsyncData(
        current.copyWith(busy: false, message: error.message),
      );
    } catch (_) {
      state = AsyncData(
        current.copyWith(
          busy: false,
          message: 'The vault could not be created on this device.',
        ),
      );
    } finally {
      if (created != null && !transferred) {
        zeroBytes(created.vaultKey);
      }
      final latest = state.value;
      if (latest != null && latest.busy) {
        state = AsyncData(latest.copyWith(busy: false));
      }
    }
  }

  Future<void> unlock(String passphrase) async {
    final current = state.value;
    final record = current?.record;
    if (current == null || record == null || current.busy) return;
    state = AsyncData(current.copyWith(busy: true, clearMessage: true));

    try {
      final crypto = VaultCrypto(await SodiumService.instance());
      final key = await crypto.unlockVault(record, passphrase);
      _lockKey();
      _vaultKey = key;
      state = AsyncData(
        VaultState(phase: VaultPhase.unlocked, record: record),
      );
    } on CryptoException catch (error) {
      state = AsyncData(
        current.copyWith(busy: false, message: error.message),
      );
    } catch (_) {
      state = AsyncData(
        current.copyWith(
          busy: false,
          message: 'The vault could not be unlocked on this device.',
        ),
      );
    }
  }

  void lock() {
    _lockKey();
    final current = state.value;
    if (current == null) return;
    final record = current.record;
    state = AsyncData(
      record == null
          ? const VaultState(phase: VaultPhase.absent)
          : VaultState(phase: VaultPhase.locked, record: record),
    );
  }

  Future<VaultRecord?> _tryFetch() async {
    try {
      return await ref.read(vaultRepositoryProvider).fetch();
    } catch (_) {
      return null;
    }
  }

  void _lockKey() {
    final key = _vaultKey;
    if (key != null) {
      zeroBytes(key);
      _vaultKey = null;
    }
  }
}
