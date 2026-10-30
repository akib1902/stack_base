// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'me_response.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MeResponse {

 AuthUser get user; UserSettings get settings;
/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MeResponseCopyWith<MeResponse> get copyWith => _$MeResponseCopyWithImpl<MeResponse>(this as MeResponse, _$identity);

  /// Serializes this MeResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MeResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MeResponse&&(identical(other.user, _this.user) || other.user == _this.user)&&(identical(other.settings, _this.settings) || other.settings == _this.settings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MeResponse;
  return Object.hash(runtimeType,_this.user,_this.settings);
}

@override
String toString() {
  final _this = this as MeResponse;
  return 'MeResponse(user: ${_this.user}, settings: ${_this.settings})';
}


}

/// @nodoc
abstract mixin class $MeResponseCopyWith<$Res>  {
  factory $MeResponseCopyWith(MeResponse value, $Res Function(MeResponse) _then) = _$MeResponseCopyWithImpl;
@useResult
$Res call({
 AuthUser user, UserSettings settings
});


$AuthUserCopyWith<$Res> get user;$UserSettingsCopyWith<$Res> get settings;

}
/// @nodoc
class _$MeResponseCopyWithImpl<$Res>
    implements $MeResponseCopyWith<$Res> {
  _$MeResponseCopyWithImpl(this._self, this._then);

  final MeResponse _self;
  final $Res Function(MeResponse) _then;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? user = null,Object? settings = null,}) {
  return _then(MeResponse(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AuthUser,settings: null == settings ? _self.settings : settings // ignore: cast_nullable_to_non_nullable
as UserSettings,
  ));
}
/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AuthUserCopyWith<$Res> get user {
  
  return $AuthUserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserSettingsCopyWith<$Res> get settings {
  
  return $UserSettingsCopyWith<$Res>(_self.settings, (value) {
    return _then(_self.copyWith(settings: value));
  });
}
}


/// Adds pattern-matching-related methods to [MeResponse].
extension MeResponsePatterns on MeResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MeResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MeResponse value)  $default,){
final _that = this;
switch (_that) {
case _MeResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MeResponse value)?  $default,){
final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( AuthUser user,  UserSettings settings)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
return $default(_that.user,_that.settings);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( AuthUser user,  UserSettings settings)  $default,) {final _that = this;
switch (_that) {
case _MeResponse():
return $default(_that.user,_that.settings);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( AuthUser user,  UserSettings settings)?  $default,) {final _that = this;
switch (_that) {
case _MeResponse() when $default != null:
return $default(_that.user,_that.settings);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MeResponse implements MeResponse {
  const _MeResponse({required this.user, required this.settings});
  factory _MeResponse.fromJson(Map<String, dynamic> json) => _$MeResponseFromJson(json);

@override final  AuthUser user;
@override final  UserSettings settings;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MeResponseCopyWith<_MeResponse> get copyWith => __$MeResponseCopyWithImpl<_MeResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MeResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MeResponse&&(identical(other.user, user) || other.user == user)&&(identical(other.settings, settings) || other.settings == settings));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,user,settings);
}

@override
String toString() {
    return 'MeResponse(user: $user, settings: $settings)';
}


}

/// @nodoc
abstract mixin class _$MeResponseCopyWith<$Res> implements $MeResponseCopyWith<$Res> {
  factory _$MeResponseCopyWith(_MeResponse value, $Res Function(_MeResponse) _then) = __$MeResponseCopyWithImpl;
@override @useResult
$Res call({
 AuthUser user, UserSettings settings
});


@override $AuthUserCopyWith<$Res> get user;@override $UserSettingsCopyWith<$Res> get settings;

}
/// @nodoc
class __$MeResponseCopyWithImpl<$Res>
    implements _$MeResponseCopyWith<$Res> {
  __$MeResponseCopyWithImpl(this._self, this._then);

  final _MeResponse _self;
  final $Res Function(_MeResponse) _then;

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? user = null,Object? settings = null,}) {
  return _then(_MeResponse(
user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AuthUser,settings: null == settings ? _self.settings : settings // ignore: cast_nullable_to_non_nullable
as UserSettings,
  ));
}

/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AuthUserCopyWith<$Res> get user {
  
  return $AuthUserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of MeResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserSettingsCopyWith<$Res> get settings {
  
  return $UserSettingsCopyWith<$Res>(_self.settings, (value) {
    return _then(_self.copyWith(settings: value));
  });
}
}

// dart format on
