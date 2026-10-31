import '../../../core/api/api_client.dart';
import '../../../core/models/vault.dart';

/// Thin seam over the two vault endpoints. There is deliberately no local
/// vault cache: the record contains only wrapped ciphertext, and the vault key
/// lives in memory for this session.
class VaultRepository {
  VaultRepository({required ApiClient api}) : _api = api;

  final ApiClient _api;

  Future<VaultRecord?> fetch() => _api.fetchVault();

  Future<VaultRecord> create(CreateVaultRequest request) =>
      _api.createVault(request);
}
