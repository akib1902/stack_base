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

/// Partial PATCH body. Null fields are omitted, never sent as JSON null.
class UserSettingsUpdate {
  const UserSettingsUpdate({
    this.theme,
    this.defaultView,
    this.defaultSort,
    this.trashRetentionDays,
    this.offlineEnabled,
  });

  final ServerTheme? theme;
  final DefaultView? defaultView;
  final FileSort? defaultSort;
  final int? trashRetentionDays;
  final bool? offlineEnabled;

  Map<String, dynamic> toJson() {
    return {
      if (theme != null) 'theme': theme!.wireValue,
      if (defaultView != null) 'defaultView': defaultView!.wireValue,
      if (defaultSort != null) 'defaultSort': defaultSort!.wireValue,
      if (trashRetentionDays != null)
        'trashRetentionDays': trashRetentionDays,
      if (offlineEnabled != null) 'offlineEnabled': offlineEnabled,
    };
  }
}

extension ServerThemeWire on ServerTheme {
  String get wireValue => switch (this) {
    ServerTheme.amber => 'amber',
    ServerTheme.graphite => 'graphite',
  };
}

extension DefaultViewWire on DefaultView {
  String get wireValue => switch (this) {
    DefaultView.grid => 'grid',
    DefaultView.list => 'list',
  };
}

extension FileSortWire on FileSort {
  String get wireValue => switch (this) {
    FileSort.updatedAt => 'updated_at',
    FileSort.createdAt => 'created_at',
    FileSort.nameAsc => 'name_asc',
    FileSort.nameDesc => 'name_desc',
    FileSort.sizeDesc => 'size_desc',
    FileSort.sizeAsc => 'size_asc',
  };
}
