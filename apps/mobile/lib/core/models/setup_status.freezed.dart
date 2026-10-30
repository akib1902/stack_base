// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'setup_status.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SetupStorage {

 StorageProvider get provider; StorageConnectionStatus get status; String? get accountIdentifier; DateTime? get lastValidatedAt; String? get lastErrorCode;
/// Create a copy of SetupStorage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SetupStorageCopyWith<SetupStorage> get copyWith => _$SetupStorageCopyWithImpl<SetupStorage>(this as SetupStorage, _$identity);

  /// Serializes this SetupStorage to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SetupStorage;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SetupStorage&&(identical(other.provider, _this.provider) || other.provider == _this.provider)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.accountIdentifier, _this.accountIdentifier) || other.accountIdentifier == _this.accountIdentifier)&&(identical(other.lastValidatedAt, _this.lastValidatedAt) || other.lastValidatedAt == _this.lastValidatedAt)&&(identical(other.lastErrorCode, _this.lastErrorCode) || other.lastErrorCode == _this.lastErrorCode));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SetupStorage;
  return Object.hash(runtimeType,_this.provider,_this.status,_this.accountIdentifier,_this.lastValidatedAt,_this.lastErrorCode);
}

@override
String toString() {
  final _this = this as SetupStorage;
  return 'SetupStorage(provider: ${_this.provider}, status: ${_this.status}, accountIdentifier: ${_this.accountIdentifier}, lastValidatedAt: ${_this.lastValidatedAt}, lastErrorCode: ${_this.lastErrorCode})';
}


}

/// @nodoc
abstract mixin class $SetupStorageCopyWith<$Res>  {
  factory $SetupStorageCopyWith(SetupStorage value, $Res Function(SetupStorage) _then) = _$SetupStorageCopyWithImpl;
@useResult
$Res call({
 StorageProvider provider, StorageConnectionStatus status, String? accountIdentifier, DateTime? lastValidatedAt, String? lastErrorCode
});




}
/// @nodoc
class _$SetupStorageCopyWithImpl<$Res>
    implements $SetupStorageCopyWith<$Res> {
  _$SetupStorageCopyWithImpl(this._self, this._then);

  final SetupStorage _self;
  final $Res Function(SetupStorage) _then;

/// Create a copy of SetupStorage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? provider = null,Object? status = null,Object? accountIdentifier = freezed,Object? lastValidatedAt = freezed,Object? lastErrorCode = freezed,}) {
  return _then(SetupStorage(
provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as StorageProvider,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as StorageConnectionStatus,accountIdentifier: freezed == accountIdentifier ? _self.accountIdentifier : accountIdentifier // ignore: cast_nullable_to_non_nullable
as String?,lastValidatedAt: freezed == lastValidatedAt ? _self.lastValidatedAt : lastValidatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,lastErrorCode: freezed == lastErrorCode ? _self.lastErrorCode : lastErrorCode // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SetupStorage].
extension SetupStoragePatterns on SetupStorage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SetupStorage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SetupStorage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SetupStorage value)  $default,){
final _that = this;
switch (_that) {
case _SetupStorage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SetupStorage value)?  $default,){
final _that = this;
switch (_that) {
case _SetupStorage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( StorageProvider provider,  StorageConnectionStatus status,  String? accountIdentifier,  DateTime? lastValidatedAt,  String? lastErrorCode)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SetupStorage() when $default != null:
return $default(_that.provider,_that.status,_that.accountIdentifier,_that.lastValidatedAt,_that.lastErrorCode);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( StorageProvider provider,  StorageConnectionStatus status,  String? accountIdentifier,  DateTime? lastValidatedAt,  String? lastErrorCode)  $default,) {final _that = this;
switch (_that) {
case _SetupStorage():
return $default(_that.provider,_that.status,_that.accountIdentifier,_that.lastValidatedAt,_that.lastErrorCode);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( StorageProvider provider,  StorageConnectionStatus status,  String? accountIdentifier,  DateTime? lastValidatedAt,  String? lastErrorCode)?  $default,) {final _that = this;
switch (_that) {
case _SetupStorage() when $default != null:
return $default(_that.provider,_that.status,_that.accountIdentifier,_that.lastValidatedAt,_that.lastErrorCode);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SetupStorage implements SetupStorage {
  const _SetupStorage({required this.provider, required this.status, required this.accountIdentifier, required this.lastValidatedAt, required this.lastErrorCode});
  factory _SetupStorage.fromJson(Map<String, dynamic> json) => _$SetupStorageFromJson(json);

@override final  StorageProvider provider;
@override final  StorageConnectionStatus status;
@override final  String? accountIdentifier;
@override final  DateTime? lastValidatedAt;
@override final  String? lastErrorCode;

/// Create a copy of SetupStorage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SetupStorageCopyWith<_SetupStorage> get copyWith => __$SetupStorageCopyWithImpl<_SetupStorage>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SetupStorageToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SetupStorage&&(identical(other.provider, provider) || other.provider == provider)&&(identical(other.status, status) || other.status == status)&&(identical(other.accountIdentifier, accountIdentifier) || other.accountIdentifier == accountIdentifier)&&(identical(other.lastValidatedAt, lastValidatedAt) || other.lastValidatedAt == lastValidatedAt)&&(identical(other.lastErrorCode, lastErrorCode) || other.lastErrorCode == lastErrorCode));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,provider,status,accountIdentifier,lastValidatedAt,lastErrorCode);
}

@override
String toString() {
    return 'SetupStorage(provider: $provider, status: $status, accountIdentifier: $accountIdentifier, lastValidatedAt: $lastValidatedAt, lastErrorCode: $lastErrorCode)';
}


}

/// @nodoc
abstract mixin class _$SetupStorageCopyWith<$Res> implements $SetupStorageCopyWith<$Res> {
  factory _$SetupStorageCopyWith(_SetupStorage value, $Res Function(_SetupStorage) _then) = __$SetupStorageCopyWithImpl;
@override @useResult
$Res call({
 StorageProvider provider, StorageConnectionStatus status, String? accountIdentifier, DateTime? lastValidatedAt, String? lastErrorCode
});




}
/// @nodoc
class __$SetupStorageCopyWithImpl<$Res>
    implements _$SetupStorageCopyWith<$Res> {
  __$SetupStorageCopyWithImpl(this._self, this._then);

  final _SetupStorage _self;
  final $Res Function(_SetupStorage) _then;

/// Create a copy of SetupStorage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? provider = null,Object? status = null,Object? accountIdentifier = freezed,Object? lastValidatedAt = freezed,Object? lastErrorCode = freezed,}) {
  return _then(_SetupStorage(
provider: null == provider ? _self.provider : provider // ignore: cast_nullable_to_non_nullable
as StorageProvider,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as StorageConnectionStatus,accountIdentifier: freezed == accountIdentifier ? _self.accountIdentifier : accountIdentifier // ignore: cast_nullable_to_non_nullable
as String?,lastValidatedAt: freezed == lastValidatedAt ? _self.lastValidatedAt : lastValidatedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,lastErrorCode: freezed == lastErrorCode ? _self.lastErrorCode : lastErrorCode // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$SetupEncryption {

 EncryptionVaultStatus get vault;
/// Create a copy of SetupEncryption
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SetupEncryptionCopyWith<SetupEncryption> get copyWith => _$SetupEncryptionCopyWithImpl<SetupEncryption>(this as SetupEncryption, _$identity);

  /// Serializes this SetupEncryption to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SetupEncryption;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SetupEncryption&&(identical(other.vault, _this.vault) || other.vault == _this.vault));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SetupEncryption;
  return Object.hash(runtimeType,_this.vault);
}

@override
String toString() {
  final _this = this as SetupEncryption;
  return 'SetupEncryption(vault: ${_this.vault})';
}


}

/// @nodoc
abstract mixin class $SetupEncryptionCopyWith<$Res>  {
  factory $SetupEncryptionCopyWith(SetupEncryption value, $Res Function(SetupEncryption) _then) = _$SetupEncryptionCopyWithImpl;
@useResult
$Res call({
 EncryptionVaultStatus vault
});




}
/// @nodoc
class _$SetupEncryptionCopyWithImpl<$Res>
    implements $SetupEncryptionCopyWith<$Res> {
  _$SetupEncryptionCopyWithImpl(this._self, this._then);

  final SetupEncryption _self;
  final $Res Function(SetupEncryption) _then;

/// Create a copy of SetupEncryption
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? vault = null,}) {
  return _then(SetupEncryption(
vault: null == vault ? _self.vault : vault // ignore: cast_nullable_to_non_nullable
as EncryptionVaultStatus,
  ));
}

}


/// Adds pattern-matching-related methods to [SetupEncryption].
extension SetupEncryptionPatterns on SetupEncryption {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SetupEncryption value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SetupEncryption() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SetupEncryption value)  $default,){
final _that = this;
switch (_that) {
case _SetupEncryption():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SetupEncryption value)?  $default,){
final _that = this;
switch (_that) {
case _SetupEncryption() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( EncryptionVaultStatus vault)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SetupEncryption() when $default != null:
return $default(_that.vault);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( EncryptionVaultStatus vault)  $default,) {final _that = this;
switch (_that) {
case _SetupEncryption():
return $default(_that.vault);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( EncryptionVaultStatus vault)?  $default,) {final _that = this;
switch (_that) {
case _SetupEncryption() when $default != null:
return $default(_that.vault);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SetupEncryption implements SetupEncryption {
  const _SetupEncryption({required this.vault});
  factory _SetupEncryption.fromJson(Map<String, dynamic> json) => _$SetupEncryptionFromJson(json);

@override final  EncryptionVaultStatus vault;

/// Create a copy of SetupEncryption
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SetupEncryptionCopyWith<_SetupEncryption> get copyWith => __$SetupEncryptionCopyWithImpl<_SetupEncryption>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SetupEncryptionToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SetupEncryption&&(identical(other.vault, vault) || other.vault == vault));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,vault);
}

@override
String toString() {
    return 'SetupEncryption(vault: $vault)';
}


}

/// @nodoc
abstract mixin class _$SetupEncryptionCopyWith<$Res> implements $SetupEncryptionCopyWith<$Res> {
  factory _$SetupEncryptionCopyWith(_SetupEncryption value, $Res Function(_SetupEncryption) _then) = __$SetupEncryptionCopyWithImpl;
@override @useResult
$Res call({
 EncryptionVaultStatus vault
});




}
/// @nodoc
class __$SetupEncryptionCopyWithImpl<$Res>
    implements _$SetupEncryptionCopyWith<$Res> {
  __$SetupEncryptionCopyWithImpl(this._self, this._then);

  final _SetupEncryption _self;
  final $Res Function(_SetupEncryption) _then;

/// Create a copy of SetupEncryption
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? vault = null,}) {
  return _then(_SetupEncryption(
vault: null == vault ? _self.vault : vault // ignore: cast_nullable_to_non_nullable
as EncryptionVaultStatus,
  ));
}


}


/// @nodoc
mixin _$SetupLibrary {

 int get files; int get folders; int get bytes;
/// Create a copy of SetupLibrary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SetupLibraryCopyWith<SetupLibrary> get copyWith => _$SetupLibraryCopyWithImpl<SetupLibrary>(this as SetupLibrary, _$identity);

  /// Serializes this SetupLibrary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SetupLibrary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SetupLibrary&&(identical(other.files, _this.files) || other.files == _this.files)&&(identical(other.folders, _this.folders) || other.folders == _this.folders)&&(identical(other.bytes, _this.bytes) || other.bytes == _this.bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SetupLibrary;
  return Object.hash(runtimeType,_this.files,_this.folders,_this.bytes);
}

@override
String toString() {
  final _this = this as SetupLibrary;
  return 'SetupLibrary(files: ${_this.files}, folders: ${_this.folders}, bytes: ${_this.bytes})';
}


}

/// @nodoc
abstract mixin class $SetupLibraryCopyWith<$Res>  {
  factory $SetupLibraryCopyWith(SetupLibrary value, $Res Function(SetupLibrary) _then) = _$SetupLibraryCopyWithImpl;
@useResult
$Res call({
 int files, int folders, int bytes
});




}
/// @nodoc
class _$SetupLibraryCopyWithImpl<$Res>
    implements $SetupLibraryCopyWith<$Res> {
  _$SetupLibraryCopyWithImpl(this._self, this._then);

  final SetupLibrary _self;
  final $Res Function(SetupLibrary) _then;

/// Create a copy of SetupLibrary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? files = null,Object? folders = null,Object? bytes = null,}) {
  return _then(SetupLibrary(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SetupLibrary].
extension SetupLibraryPatterns on SetupLibrary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SetupLibrary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SetupLibrary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SetupLibrary value)  $default,){
final _that = this;
switch (_that) {
case _SetupLibrary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SetupLibrary value)?  $default,){
final _that = this;
switch (_that) {
case _SetupLibrary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SetupLibrary() when $default != null:
return $default(_that.files,_that.folders,_that.bytes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes)  $default,) {final _that = this;
switch (_that) {
case _SetupLibrary():
return $default(_that.files,_that.folders,_that.bytes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int files,  int folders,  int bytes)?  $default,) {final _that = this;
switch (_that) {
case _SetupLibrary() when $default != null:
return $default(_that.files,_that.folders,_that.bytes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SetupLibrary implements SetupLibrary {
  const _SetupLibrary({required this.files, required this.folders, required this.bytes});
  factory _SetupLibrary.fromJson(Map<String, dynamic> json) => _$SetupLibraryFromJson(json);

@override final  int files;
@override final  int folders;
@override final  int bytes;

/// Create a copy of SetupLibrary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SetupLibraryCopyWith<_SetupLibrary> get copyWith => __$SetupLibraryCopyWithImpl<_SetupLibrary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SetupLibraryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SetupLibrary&&(identical(other.files, files) || other.files == files)&&(identical(other.folders, folders) || other.folders == folders)&&(identical(other.bytes, bytes) || other.bytes == bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,files,folders,bytes);
}

@override
String toString() {
    return 'SetupLibrary(files: $files, folders: $folders, bytes: $bytes)';
}


}

/// @nodoc
abstract mixin class _$SetupLibraryCopyWith<$Res> implements $SetupLibraryCopyWith<$Res> {
  factory _$SetupLibraryCopyWith(_SetupLibrary value, $Res Function(_SetupLibrary) _then) = __$SetupLibraryCopyWithImpl;
@override @useResult
$Res call({
 int files, int folders, int bytes
});




}
/// @nodoc
class __$SetupLibraryCopyWithImpl<$Res>
    implements _$SetupLibraryCopyWith<$Res> {
  __$SetupLibraryCopyWithImpl(this._self, this._then);

  final _SetupLibrary _self;
  final $Res Function(_SetupLibrary) _then;

/// Create a copy of SetupLibrary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? files = null,Object? folders = null,Object? bytes = null,}) {
  return _then(_SetupLibrary(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SetupStatusResponse {

 SetupStorage get storage; SetupEncryption get encryption; SetupLibrary get library;
/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SetupStatusResponseCopyWith<SetupStatusResponse> get copyWith => _$SetupStatusResponseCopyWithImpl<SetupStatusResponse>(this as SetupStatusResponse, _$identity);

  /// Serializes this SetupStatusResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SetupStatusResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SetupStatusResponse&&(identical(other.storage, _this.storage) || other.storage == _this.storage)&&(identical(other.encryption, _this.encryption) || other.encryption == _this.encryption)&&(identical(other.library, _this.library) || other.library == _this.library));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SetupStatusResponse;
  return Object.hash(runtimeType,_this.storage,_this.encryption,_this.library);
}

@override
String toString() {
  final _this = this as SetupStatusResponse;
  return 'SetupStatusResponse(storage: ${_this.storage}, encryption: ${_this.encryption}, library: ${_this.library})';
}


}

/// @nodoc
abstract mixin class $SetupStatusResponseCopyWith<$Res>  {
  factory $SetupStatusResponseCopyWith(SetupStatusResponse value, $Res Function(SetupStatusResponse) _then) = _$SetupStatusResponseCopyWithImpl;
@useResult
$Res call({
 SetupStorage storage, SetupEncryption encryption, SetupLibrary library
});


$SetupStorageCopyWith<$Res> get storage;$SetupEncryptionCopyWith<$Res> get encryption;$SetupLibraryCopyWith<$Res> get library;

}
/// @nodoc
class _$SetupStatusResponseCopyWithImpl<$Res>
    implements $SetupStatusResponseCopyWith<$Res> {
  _$SetupStatusResponseCopyWithImpl(this._self, this._then);

  final SetupStatusResponse _self;
  final $Res Function(SetupStatusResponse) _then;

/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? storage = null,Object? encryption = null,Object? library = null,}) {
  return _then(SetupStatusResponse(
storage: null == storage ? _self.storage : storage // ignore: cast_nullable_to_non_nullable
as SetupStorage,encryption: null == encryption ? _self.encryption : encryption // ignore: cast_nullable_to_non_nullable
as SetupEncryption,library: null == library ? _self.library : library // ignore: cast_nullable_to_non_nullable
as SetupLibrary,
  ));
}
/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupStorageCopyWith<$Res> get storage {
  
  return $SetupStorageCopyWith<$Res>(_self.storage, (value) {
    return _then(_self.copyWith(storage: value));
  });
}/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupEncryptionCopyWith<$Res> get encryption {
  
  return $SetupEncryptionCopyWith<$Res>(_self.encryption, (value) {
    return _then(_self.copyWith(encryption: value));
  });
}/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupLibraryCopyWith<$Res> get library {
  
  return $SetupLibraryCopyWith<$Res>(_self.library, (value) {
    return _then(_self.copyWith(library: value));
  });
}
}


/// Adds pattern-matching-related methods to [SetupStatusResponse].
extension SetupStatusResponsePatterns on SetupStatusResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SetupStatusResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SetupStatusResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SetupStatusResponse value)  $default,){
final _that = this;
switch (_that) {
case _SetupStatusResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SetupStatusResponse value)?  $default,){
final _that = this;
switch (_that) {
case _SetupStatusResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( SetupStorage storage,  SetupEncryption encryption,  SetupLibrary library)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SetupStatusResponse() when $default != null:
return $default(_that.storage,_that.encryption,_that.library);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( SetupStorage storage,  SetupEncryption encryption,  SetupLibrary library)  $default,) {final _that = this;
switch (_that) {
case _SetupStatusResponse():
return $default(_that.storage,_that.encryption,_that.library);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( SetupStorage storage,  SetupEncryption encryption,  SetupLibrary library)?  $default,) {final _that = this;
switch (_that) {
case _SetupStatusResponse() when $default != null:
return $default(_that.storage,_that.encryption,_that.library);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SetupStatusResponse implements SetupStatusResponse {
  const _SetupStatusResponse({required this.storage, required this.encryption, required this.library});
  factory _SetupStatusResponse.fromJson(Map<String, dynamic> json) => _$SetupStatusResponseFromJson(json);

@override final  SetupStorage storage;
@override final  SetupEncryption encryption;
@override final  SetupLibrary library;

/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SetupStatusResponseCopyWith<_SetupStatusResponse> get copyWith => __$SetupStatusResponseCopyWithImpl<_SetupStatusResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SetupStatusResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SetupStatusResponse&&(identical(other.storage, storage) || other.storage == storage)&&(identical(other.encryption, encryption) || other.encryption == encryption)&&(identical(other.library, library) || other.library == library));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,storage,encryption,library);
}

@override
String toString() {
    return 'SetupStatusResponse(storage: $storage, encryption: $encryption, library: $library)';
}


}

/// @nodoc
abstract mixin class _$SetupStatusResponseCopyWith<$Res> implements $SetupStatusResponseCopyWith<$Res> {
  factory _$SetupStatusResponseCopyWith(_SetupStatusResponse value, $Res Function(_SetupStatusResponse) _then) = __$SetupStatusResponseCopyWithImpl;
@override @useResult
$Res call({
 SetupStorage storage, SetupEncryption encryption, SetupLibrary library
});


@override $SetupStorageCopyWith<$Res> get storage;@override $SetupEncryptionCopyWith<$Res> get encryption;@override $SetupLibraryCopyWith<$Res> get library;

}
/// @nodoc
class __$SetupStatusResponseCopyWithImpl<$Res>
    implements _$SetupStatusResponseCopyWith<$Res> {
  __$SetupStatusResponseCopyWithImpl(this._self, this._then);

  final _SetupStatusResponse _self;
  final $Res Function(_SetupStatusResponse) _then;

/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? storage = null,Object? encryption = null,Object? library = null,}) {
  return _then(_SetupStatusResponse(
storage: null == storage ? _self.storage : storage // ignore: cast_nullable_to_non_nullable
as SetupStorage,encryption: null == encryption ? _self.encryption : encryption // ignore: cast_nullable_to_non_nullable
as SetupEncryption,library: null == library ? _self.library : library // ignore: cast_nullable_to_non_nullable
as SetupLibrary,
  ));
}

/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupStorageCopyWith<$Res> get storage {
  
  return $SetupStorageCopyWith<$Res>(_self.storage, (value) {
    return _then(_self.copyWith(storage: value));
  });
}/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupEncryptionCopyWith<$Res> get encryption {
  
  return $SetupEncryptionCopyWith<$Res>(_self.encryption, (value) {
    return _then(_self.copyWith(encryption: value));
  });
}/// Create a copy of SetupStatusResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SetupLibraryCopyWith<$Res> get library {
  
  return $SetupLibraryCopyWith<$Res>(_self.library, (value) {
    return _then(_self.copyWith(library: value));
  });
}
}


/// @nodoc
mixin _$HealthResponse {

 HealthStatus get status; String get version; int get uptimeSeconds; DatabaseHealth get database;
/// Create a copy of HealthResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HealthResponseCopyWith<HealthResponse> get copyWith => _$HealthResponseCopyWithImpl<HealthResponse>(this as HealthResponse, _$identity);

  /// Serializes this HealthResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HealthResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HealthResponse&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.version, _this.version) || other.version == _this.version)&&(identical(other.uptimeSeconds, _this.uptimeSeconds) || other.uptimeSeconds == _this.uptimeSeconds)&&(identical(other.database, _this.database) || other.database == _this.database));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HealthResponse;
  return Object.hash(runtimeType,_this.status,_this.version,_this.uptimeSeconds,_this.database);
}

@override
String toString() {
  final _this = this as HealthResponse;
  return 'HealthResponse(status: ${_this.status}, version: ${_this.version}, uptimeSeconds: ${_this.uptimeSeconds}, database: ${_this.database})';
}


}

/// @nodoc
abstract mixin class $HealthResponseCopyWith<$Res>  {
  factory $HealthResponseCopyWith(HealthResponse value, $Res Function(HealthResponse) _then) = _$HealthResponseCopyWithImpl;
@useResult
$Res call({
 HealthStatus status, String version, int uptimeSeconds, DatabaseHealth database
});




}
/// @nodoc
class _$HealthResponseCopyWithImpl<$Res>
    implements $HealthResponseCopyWith<$Res> {
  _$HealthResponseCopyWithImpl(this._self, this._then);

  final HealthResponse _self;
  final $Res Function(HealthResponse) _then;

/// Create a copy of HealthResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? version = null,Object? uptimeSeconds = null,Object? database = null,}) {
  return _then(HealthResponse(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HealthStatus,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as String,uptimeSeconds: null == uptimeSeconds ? _self.uptimeSeconds : uptimeSeconds // ignore: cast_nullable_to_non_nullable
as int,database: null == database ? _self.database : database // ignore: cast_nullable_to_non_nullable
as DatabaseHealth,
  ));
}

}


/// Adds pattern-matching-related methods to [HealthResponse].
extension HealthResponsePatterns on HealthResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HealthResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HealthResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HealthResponse value)  $default,){
final _that = this;
switch (_that) {
case _HealthResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HealthResponse value)?  $default,){
final _that = this;
switch (_that) {
case _HealthResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( HealthStatus status,  String version,  int uptimeSeconds,  DatabaseHealth database)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HealthResponse() when $default != null:
return $default(_that.status,_that.version,_that.uptimeSeconds,_that.database);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( HealthStatus status,  String version,  int uptimeSeconds,  DatabaseHealth database)  $default,) {final _that = this;
switch (_that) {
case _HealthResponse():
return $default(_that.status,_that.version,_that.uptimeSeconds,_that.database);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( HealthStatus status,  String version,  int uptimeSeconds,  DatabaseHealth database)?  $default,) {final _that = this;
switch (_that) {
case _HealthResponse() when $default != null:
return $default(_that.status,_that.version,_that.uptimeSeconds,_that.database);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HealthResponse implements HealthResponse {
  const _HealthResponse({required this.status, required this.version, required this.uptimeSeconds, required this.database});
  factory _HealthResponse.fromJson(Map<String, dynamic> json) => _$HealthResponseFromJson(json);

@override final  HealthStatus status;
@override final  String version;
@override final  int uptimeSeconds;
@override final  DatabaseHealth database;

/// Create a copy of HealthResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HealthResponseCopyWith<_HealthResponse> get copyWith => __$HealthResponseCopyWithImpl<_HealthResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HealthResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HealthResponse&&(identical(other.status, status) || other.status == status)&&(identical(other.version, version) || other.version == version)&&(identical(other.uptimeSeconds, uptimeSeconds) || other.uptimeSeconds == uptimeSeconds)&&(identical(other.database, database) || other.database == database));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,status,version,uptimeSeconds,database);
}

@override
String toString() {
    return 'HealthResponse(status: $status, version: $version, uptimeSeconds: $uptimeSeconds, database: $database)';
}


}

/// @nodoc
abstract mixin class _$HealthResponseCopyWith<$Res> implements $HealthResponseCopyWith<$Res> {
  factory _$HealthResponseCopyWith(_HealthResponse value, $Res Function(_HealthResponse) _then) = __$HealthResponseCopyWithImpl;
@override @useResult
$Res call({
 HealthStatus status, String version, int uptimeSeconds, DatabaseHealth database
});




}
/// @nodoc
class __$HealthResponseCopyWithImpl<$Res>
    implements _$HealthResponseCopyWith<$Res> {
  __$HealthResponseCopyWithImpl(this._self, this._then);

  final _HealthResponse _self;
  final $Res Function(_HealthResponse) _then;

/// Create a copy of HealthResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? version = null,Object? uptimeSeconds = null,Object? database = null,}) {
  return _then(_HealthResponse(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HealthStatus,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as String,uptimeSeconds: null == uptimeSeconds ? _self.uptimeSeconds : uptimeSeconds // ignore: cast_nullable_to_non_nullable
as int,database: null == database ? _self.database : database // ignore: cast_nullable_to_non_nullable
as DatabaseHealth,
  ));
}


}

// dart format on
