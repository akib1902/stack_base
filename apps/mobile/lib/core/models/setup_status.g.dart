// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'setup_status.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SetupStorage _$SetupStorageFromJson(Map<String, dynamic> json) =>
    _SetupStorage(
      provider: $enumDecode(_$StorageProviderEnumMap, json['provider']),
      status: $enumDecode(_$StorageConnectionStatusEnumMap, json['status']),
      accountIdentifier: json['accountIdentifier'] as String?,
      lastValidatedAt: json['lastValidatedAt'] == null
          ? null
          : DateTime.parse(json['lastValidatedAt'] as String),
      lastErrorCode: json['lastErrorCode'] as String?,
    );

Map<String, dynamic> _$SetupStorageToJson(_SetupStorage instance) =>
    <String, dynamic>{
      'provider': _$StorageProviderEnumMap[instance.provider]!,
      'status': _$StorageConnectionStatusEnumMap[instance.status]!,
      'accountIdentifier': instance.accountIdentifier,
      'lastValidatedAt': instance.lastValidatedAt?.toIso8601String(),
      'lastErrorCode': instance.lastErrorCode,
    };

const _$StorageProviderEnumMap = {
  StorageProvider.telegram: 'telegram',
  StorageProvider.local: 'local',
};

const _$StorageConnectionStatusEnumMap = {
  StorageConnectionStatus.notConfigured: 'not_configured',
  StorageConnectionStatus.connected: 'connected',
  StorageConnectionStatus.error: 'error',
  StorageConnectionStatus.expired: 'expired',
  StorageConnectionStatus.disconnected: 'disconnected',
};

_SetupEncryption _$SetupEncryptionFromJson(Map<String, dynamic> json) =>
    _SetupEncryption(
      vault: $enumDecode(_$EncryptionVaultStatusEnumMap, json['vault']),
    );

Map<String, dynamic> _$SetupEncryptionToJson(_SetupEncryption instance) =>
    <String, dynamic>{'vault': _$EncryptionVaultStatusEnumMap[instance.vault]!};

const _$EncryptionVaultStatusEnumMap = {
  EncryptionVaultStatus.notConfigured: 'not_configured',
  EncryptionVaultStatus.configured: 'configured',
};

_SetupLibrary _$SetupLibraryFromJson(Map<String, dynamic> json) =>
    _SetupLibrary(
      files: (json['files'] as num).toInt(),
      folders: (json['folders'] as num).toInt(),
      bytes: (json['bytes'] as num).toInt(),
    );

Map<String, dynamic> _$SetupLibraryToJson(_SetupLibrary instance) =>
    <String, dynamic>{
      'files': instance.files,
      'folders': instance.folders,
      'bytes': instance.bytes,
    };

_SetupStatusResponse _$SetupStatusResponseFromJson(Map<String, dynamic> json) =>
    _SetupStatusResponse(
      storage: SetupStorage.fromJson(json['storage'] as Map<String, dynamic>),
      encryption: SetupEncryption.fromJson(
        json['encryption'] as Map<String, dynamic>,
      ),
      library: SetupLibrary.fromJson(json['library'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$SetupStatusResponseToJson(
  _SetupStatusResponse instance,
) => <String, dynamic>{
  'storage': instance.storage,
  'encryption': instance.encryption,
  'library': instance.library,
};

_HealthResponse _$HealthResponseFromJson(Map<String, dynamic> json) =>
    _HealthResponse(
      status: $enumDecode(_$HealthStatusEnumMap, json['status']),
      version: json['version'] as String,
      uptimeSeconds: (json['uptimeSeconds'] as num).toInt(),
      database: $enumDecode(_$DatabaseHealthEnumMap, json['database']),
    );

Map<String, dynamic> _$HealthResponseToJson(_HealthResponse instance) =>
    <String, dynamic>{
      'status': _$HealthStatusEnumMap[instance.status]!,
      'version': instance.version,
      'uptimeSeconds': instance.uptimeSeconds,
      'database': _$DatabaseHealthEnumMap[instance.database]!,
    };

const _$HealthStatusEnumMap = {
  HealthStatus.ok: 'ok',
  HealthStatus.degraded: 'degraded',
};

const _$DatabaseHealthEnumMap = {
  DatabaseHealth.ok: 'ok',
  DatabaseHealth.unavailable: 'unavailable',
  DatabaseHealth.notChecked: 'not_checked',
};
