import 'package:freezed_annotation/freezed_annotation.dart';

part 'setup_status.freezed.dart';
part 'setup_status.g.dart';

enum StorageProvider {
  @JsonValue('telegram')
  telegram,
  @JsonValue('local')
  local,
}

enum StorageConnectionStatus {
  @JsonValue('not_configured')
  notConfigured,
  @JsonValue('connected')
  connected,
  @JsonValue('error')
  error,
  @JsonValue('expired')
  expired,
  @JsonValue('disconnected')
  disconnected,
}

enum EncryptionVaultStatus {
  @JsonValue('not_configured')
  notConfigured,
  @JsonValue('configured')
  configured,
}

@freezed
abstract class SetupStorage with _$SetupStorage {
  const factory SetupStorage({
    required StorageProvider provider,
    required StorageConnectionStatus status,
    required String? accountIdentifier,
    required DateTime? lastValidatedAt,
    required String? lastErrorCode,
  }) = _SetupStorage;

  factory SetupStorage.fromJson(Map<String, dynamic> json) =>
      _$SetupStorageFromJson(json);
}

@freezed
abstract class SetupEncryption with _$SetupEncryption {
  const factory SetupEncryption({
    required EncryptionVaultStatus vault,
  }) = _SetupEncryption;

  factory SetupEncryption.fromJson(Map<String, dynamic> json) =>
      _$SetupEncryptionFromJson(json);
}

@freezed
abstract class SetupLibrary with _$SetupLibrary {
  const factory SetupLibrary({
    required int files,
    required int folders,
    required int bytes,
  }) = _SetupLibrary;

  factory SetupLibrary.fromJson(Map<String, dynamic> json) =>
      _$SetupLibraryFromJson(json);
}

@freezed
abstract class SetupStatusResponse with _$SetupStatusResponse {
  const factory SetupStatusResponse({
    required SetupStorage storage,
    required SetupEncryption encryption,
    required SetupLibrary library,
  }) = _SetupStatusResponse;

  factory SetupStatusResponse.fromJson(Map<String, dynamic> json) =>
      _$SetupStatusResponseFromJson(json);
}

enum HealthStatus {
  @JsonValue('ok')
  ok,
  @JsonValue('degraded')
  degraded,
}

enum DatabaseHealth {
  @JsonValue('ok')
  ok,
  @JsonValue('unavailable')
  unavailable,
  @JsonValue('not_checked')
  notChecked,
}

@freezed
abstract class HealthResponse with _$HealthResponse {
  const factory HealthResponse({
    required HealthStatus status,
    required String version,
    required int uptimeSeconds,
    required DatabaseHealth database,
  }) = _HealthResponse;

  factory HealthResponse.fromJson(Map<String, dynamic> json) =>
      _$HealthResponseFromJson(json);
}
