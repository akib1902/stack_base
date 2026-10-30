import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_settings.freezed.dart';
part 'user_settings.g.dart';

/// Presentation name of the server theme. The app maps it to light/dark.
enum ServerTheme {
  @JsonValue('amber')
  amber,
  @JsonValue('graphite')
  graphite,
}

enum DefaultView {
  @JsonValue('grid')
  grid,
  @JsonValue('list')
  list,
}

enum FileSort {
  @JsonValue('updated_at')
  updatedAt,
  @JsonValue('created_at')
  createdAt,
  @JsonValue('name_asc')
  nameAsc,
  @JsonValue('name_desc')
  nameDesc,
  @JsonValue('size_desc')
  sizeDesc,
  @JsonValue('size_asc')
  sizeAsc,
}

@freezed
abstract class UserSettings with _$UserSettings {
  const factory UserSettings({
    required ServerTheme theme,
    required DefaultView defaultView,
    required FileSort defaultSort,
    required int trashRetentionDays,
    required bool offlineEnabled,
  }) = _UserSettings;

  factory UserSettings.fromJson(Map<String, dynamic> json) =>
      _$UserSettingsFromJson(json);
}

@freezed
@JsonSerializable(includeIfNull: false)
abstract class UserSettingsUpdate with _$UserSettingsUpdate {
  const factory UserSettingsUpdate({
    ServerTheme? theme,
    DefaultView? defaultView,
    FileSort? defaultSort,
    int? trashRetentionDays,
    bool? offlineEnabled,
  }) = _UserSettingsUpdate;

  factory UserSettingsUpdate.fromJson(Map<String, dynamic> json) =>
      _$UserSettingsUpdateFromJson(json);
}
