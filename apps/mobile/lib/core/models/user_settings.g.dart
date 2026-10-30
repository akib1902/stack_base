// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_settings.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_UserSettings _$UserSettingsFromJson(Map<String, dynamic> json) =>
    _UserSettings(
      theme: $enumDecode(_$ServerThemeEnumMap, json['theme']),
      defaultView: $enumDecode(_$DefaultViewEnumMap, json['defaultView']),
      defaultSort: $enumDecode(_$FileSortEnumMap, json['defaultSort']),
      trashRetentionDays: (json['trashRetentionDays'] as num).toInt(),
      offlineEnabled: json['offlineEnabled'] as bool,
    );

Map<String, dynamic> _$UserSettingsToJson(_UserSettings instance) =>
    <String, dynamic>{
      'theme': _$ServerThemeEnumMap[instance.theme]!,
      'defaultView': _$DefaultViewEnumMap[instance.defaultView]!,
      'defaultSort': _$FileSortEnumMap[instance.defaultSort]!,
      'trashRetentionDays': instance.trashRetentionDays,
      'offlineEnabled': instance.offlineEnabled,
    };

const _$ServerThemeEnumMap = {
  ServerTheme.amber: 'amber',
  ServerTheme.graphite: 'graphite',
};

const _$DefaultViewEnumMap = {
  DefaultView.grid: 'grid',
  DefaultView.list: 'list',
};

const _$FileSortEnumMap = {
  FileSort.updatedAt: 'updated_at',
  FileSort.createdAt: 'created_at',
  FileSort.nameAsc: 'name_asc',
  FileSort.nameDesc: 'name_desc',
  FileSort.sizeDesc: 'size_desc',
  FileSort.sizeAsc: 'size_asc',
};
