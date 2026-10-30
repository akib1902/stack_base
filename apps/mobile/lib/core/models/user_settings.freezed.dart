// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'user_settings.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$UserSettings {

 ServerTheme get theme; DefaultView get defaultView; FileSort get defaultSort; int get trashRetentionDays; bool get offlineEnabled;
/// Create a copy of UserSettings
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UserSettingsCopyWith<UserSettings> get copyWith => _$UserSettingsCopyWithImpl<UserSettings>(this as UserSettings, _$identity);

  /// Serializes this UserSettings to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as UserSettings;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is UserSettings&&(identical(other.theme, _this.theme) || other.theme == _this.theme)&&(identical(other.defaultView, _this.defaultView) || other.defaultView == _this.defaultView)&&(identical(other.defaultSort, _this.defaultSort) || other.defaultSort == _this.defaultSort)&&(identical(other.trashRetentionDays, _this.trashRetentionDays) || other.trashRetentionDays == _this.trashRetentionDays)&&(identical(other.offlineEnabled, _this.offlineEnabled) || other.offlineEnabled == _this.offlineEnabled));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as UserSettings;
  return Object.hash(runtimeType,_this.theme,_this.defaultView,_this.defaultSort,_this.trashRetentionDays,_this.offlineEnabled);
}

@override
String toString() {
  final _this = this as UserSettings;
  return 'UserSettings(theme: ${_this.theme}, defaultView: ${_this.defaultView}, defaultSort: ${_this.defaultSort}, trashRetentionDays: ${_this.trashRetentionDays}, offlineEnabled: ${_this.offlineEnabled})';
}


}

/// @nodoc
abstract mixin class $UserSettingsCopyWith<$Res>  {
  factory $UserSettingsCopyWith(UserSettings value, $Res Function(UserSettings) _then) = _$UserSettingsCopyWithImpl;
@useResult
$Res call({
 ServerTheme theme, DefaultView defaultView, FileSort defaultSort, int trashRetentionDays, bool offlineEnabled
});




}
/// @nodoc
class _$UserSettingsCopyWithImpl<$Res>
    implements $UserSettingsCopyWith<$Res> {
  _$UserSettingsCopyWithImpl(this._self, this._then);

  final UserSettings _self;
  final $Res Function(UserSettings) _then;

/// Create a copy of UserSettings
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? theme = null,Object? defaultView = null,Object? defaultSort = null,Object? trashRetentionDays = null,Object? offlineEnabled = null,}) {
  return _then(UserSettings(
theme: null == theme ? _self.theme : theme // ignore: cast_nullable_to_non_nullable
as ServerTheme,defaultView: null == defaultView ? _self.defaultView : defaultView // ignore: cast_nullable_to_non_nullable
as DefaultView,defaultSort: null == defaultSort ? _self.defaultSort : defaultSort // ignore: cast_nullable_to_non_nullable
as FileSort,trashRetentionDays: null == trashRetentionDays ? _self.trashRetentionDays : trashRetentionDays // ignore: cast_nullable_to_non_nullable
as int,offlineEnabled: null == offlineEnabled ? _self.offlineEnabled : offlineEnabled // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [UserSettings].
extension UserSettingsPatterns on UserSettings {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _UserSettings value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _UserSettings() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _UserSettings value)  $default,){
final _that = this;
switch (_that) {
case _UserSettings():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _UserSettings value)?  $default,){
final _that = this;
switch (_that) {
case _UserSettings() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ServerTheme theme,  DefaultView defaultView,  FileSort defaultSort,  int trashRetentionDays,  bool offlineEnabled)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _UserSettings() when $default != null:
return $default(_that.theme,_that.defaultView,_that.defaultSort,_that.trashRetentionDays,_that.offlineEnabled);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ServerTheme theme,  DefaultView defaultView,  FileSort defaultSort,  int trashRetentionDays,  bool offlineEnabled)  $default,) {final _that = this;
switch (_that) {
case _UserSettings():
return $default(_that.theme,_that.defaultView,_that.defaultSort,_that.trashRetentionDays,_that.offlineEnabled);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ServerTheme theme,  DefaultView defaultView,  FileSort defaultSort,  int trashRetentionDays,  bool offlineEnabled)?  $default,) {final _that = this;
switch (_that) {
case _UserSettings() when $default != null:
return $default(_that.theme,_that.defaultView,_that.defaultSort,_that.trashRetentionDays,_that.offlineEnabled);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _UserSettings implements UserSettings {
  const _UserSettings({required this.theme, required this.defaultView, required this.defaultSort, required this.trashRetentionDays, required this.offlineEnabled});
  factory _UserSettings.fromJson(Map<String, dynamic> json) => _$UserSettingsFromJson(json);

@override final  ServerTheme theme;
@override final  DefaultView defaultView;
@override final  FileSort defaultSort;
@override final  int trashRetentionDays;
@override final  bool offlineEnabled;

/// Create a copy of UserSettings
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UserSettingsCopyWith<_UserSettings> get copyWith => __$UserSettingsCopyWithImpl<_UserSettings>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UserSettingsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _UserSettings&&(identical(other.theme, theme) || other.theme == theme)&&(identical(other.defaultView, defaultView) || other.defaultView == defaultView)&&(identical(other.defaultSort, defaultSort) || other.defaultSort == defaultSort)&&(identical(other.trashRetentionDays, trashRetentionDays) || other.trashRetentionDays == trashRetentionDays)&&(identical(other.offlineEnabled, offlineEnabled) || other.offlineEnabled == offlineEnabled));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,theme,defaultView,defaultSort,trashRetentionDays,offlineEnabled);
}

@override
String toString() {
    return 'UserSettings(theme: $theme, defaultView: $defaultView, defaultSort: $defaultSort, trashRetentionDays: $trashRetentionDays, offlineEnabled: $offlineEnabled)';
}


}

/// @nodoc
abstract mixin class _$UserSettingsCopyWith<$Res> implements $UserSettingsCopyWith<$Res> {
  factory _$UserSettingsCopyWith(_UserSettings value, $Res Function(_UserSettings) _then) = __$UserSettingsCopyWithImpl;
@override @useResult
$Res call({
 ServerTheme theme, DefaultView defaultView, FileSort defaultSort, int trashRetentionDays, bool offlineEnabled
});




}
/// @nodoc
class __$UserSettingsCopyWithImpl<$Res>
    implements _$UserSettingsCopyWith<$Res> {
  __$UserSettingsCopyWithImpl(this._self, this._then);

  final _UserSettings _self;
  final $Res Function(_UserSettings) _then;

/// Create a copy of UserSettings
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? theme = null,Object? defaultView = null,Object? defaultSort = null,Object? trashRetentionDays = null,Object? offlineEnabled = null,}) {
  return _then(_UserSettings(
theme: null == theme ? _self.theme : theme // ignore: cast_nullable_to_non_nullable
as ServerTheme,defaultView: null == defaultView ? _self.defaultView : defaultView // ignore: cast_nullable_to_non_nullable
as DefaultView,defaultSort: null == defaultSort ? _self.defaultSort : defaultSort // ignore: cast_nullable_to_non_nullable
as FileSort,trashRetentionDays: null == trashRetentionDays ? _self.trashRetentionDays : trashRetentionDays // ignore: cast_nullable_to_non_nullable
as int,offlineEnabled: null == offlineEnabled ? _self.offlineEnabled : offlineEnabled // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
