// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_session.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$AuthSession {

 String get userId; String? get email; String get accessToken; DateTime? get expiresAt; AuthSource get source;
/// Create a copy of AuthSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AuthSessionCopyWith<AuthSession> get copyWith => _$AuthSessionCopyWithImpl<AuthSession>(this as AuthSession, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as AuthSession;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AuthSession&&(identical(other.userId, _this.userId) || other.userId == _this.userId)&&(identical(other.email, _this.email) || other.email == _this.email)&&(identical(other.accessToken, _this.accessToken) || other.accessToken == _this.accessToken)&&(identical(other.expiresAt, _this.expiresAt) || other.expiresAt == _this.expiresAt)&&(identical(other.source, _this.source) || other.source == _this.source));
}


@override
int get hashCode {
  final _this = this as AuthSession;
  return Object.hash(runtimeType,_this.userId,_this.email,_this.accessToken,_this.expiresAt,_this.source);
}

@override
String toString() {
  final _this = this as AuthSession;
  return 'AuthSession(userId: ${_this.userId}, email: ${_this.email}, accessToken: ${_this.accessToken}, expiresAt: ${_this.expiresAt}, source: ${_this.source})';
}


}

/// @nodoc
abstract mixin class $AuthSessionCopyWith<$Res>  {
  factory $AuthSessionCopyWith(AuthSession value, $Res Function(AuthSession) _then) = _$AuthSessionCopyWithImpl;
@useResult
$Res call({
 String userId, String? email, String accessToken, DateTime? expiresAt, AuthSource source
});




}
/// @nodoc
class _$AuthSessionCopyWithImpl<$Res>
    implements $AuthSessionCopyWith<$Res> {
  _$AuthSessionCopyWithImpl(this._self, this._then);

  final AuthSession _self;
  final $Res Function(AuthSession) _then;

/// Create a copy of AuthSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? userId = null,Object? email = freezed,Object? accessToken = null,Object? expiresAt = freezed,Object? source = null,}) {
  return _then(AuthSession(
userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as AuthSource,
  ));
}

}


/// Adds pattern-matching-related methods to [AuthSession].
extension AuthSessionPatterns on AuthSession {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AuthSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AuthSession() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AuthSession value)  $default,){
final _that = this;
switch (_that) {
case _AuthSession():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AuthSession value)?  $default,){
final _that = this;
switch (_that) {
case _AuthSession() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String userId,  String? email,  String accessToken,  DateTime? expiresAt,  AuthSource source)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AuthSession() when $default != null:
return $default(_that.userId,_that.email,_that.accessToken,_that.expiresAt,_that.source);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String userId,  String? email,  String accessToken,  DateTime? expiresAt,  AuthSource source)  $default,) {final _that = this;
switch (_that) {
case _AuthSession():
return $default(_that.userId,_that.email,_that.accessToken,_that.expiresAt,_that.source);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String userId,  String? email,  String accessToken,  DateTime? expiresAt,  AuthSource source)?  $default,) {final _that = this;
switch (_that) {
case _AuthSession() when $default != null:
return $default(_that.userId,_that.email,_that.accessToken,_that.expiresAt,_that.source);case _:
  return null;

}
}

}

/// @nodoc


class _AuthSession extends AuthSession {
  const _AuthSession({required this.userId, required this.email, required this.accessToken, required this.expiresAt, required this.source}): super._();
  

@override final  String userId;
@override final  String? email;
@override final  String accessToken;
@override final  DateTime? expiresAt;
@override final  AuthSource source;

/// Create a copy of AuthSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AuthSessionCopyWith<_AuthSession> get copyWith => __$AuthSessionCopyWithImpl<_AuthSession>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AuthSession&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.email, email) || other.email == email)&&(identical(other.accessToken, accessToken) || other.accessToken == accessToken)&&(identical(other.expiresAt, expiresAt) || other.expiresAt == expiresAt)&&(identical(other.source, source) || other.source == source));
}


@override
int get hashCode {
    return Object.hash(runtimeType,userId,email,accessToken,expiresAt,source);
}

@override
String toString() {
    return 'AuthSession(userId: $userId, email: $email, accessToken: $accessToken, expiresAt: $expiresAt, source: $source)';
}


}

/// @nodoc
abstract mixin class _$AuthSessionCopyWith<$Res> implements $AuthSessionCopyWith<$Res> {
  factory _$AuthSessionCopyWith(_AuthSession value, $Res Function(_AuthSession) _then) = __$AuthSessionCopyWithImpl;
@override @useResult
$Res call({
 String userId, String? email, String accessToken, DateTime? expiresAt, AuthSource source
});




}
/// @nodoc
class __$AuthSessionCopyWithImpl<$Res>
    implements _$AuthSessionCopyWith<$Res> {
  __$AuthSessionCopyWithImpl(this._self, this._then);

  final _AuthSession _self;
  final $Res Function(_AuthSession) _then;

/// Create a copy of AuthSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? userId = null,Object? email = freezed,Object? accessToken = null,Object? expiresAt = freezed,Object? source = null,}) {
  return _then(_AuthSession(
userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,expiresAt: freezed == expiresAt ? _self.expiresAt : expiresAt // ignore: cast_nullable_to_non_nullable
as DateTime?,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as AuthSource,
  ));
}


}

// dart format on
