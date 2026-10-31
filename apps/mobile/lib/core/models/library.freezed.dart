// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'library.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$TagSummary {

 String get id; String get name; String? get colorToken;
/// Create a copy of TagSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TagSummaryCopyWith<TagSummary> get copyWith => _$TagSummaryCopyWithImpl<TagSummary>(this as TagSummary, _$identity);

  /// Serializes this TagSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TagSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TagSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.colorToken, _this.colorToken) || other.colorToken == _this.colorToken));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TagSummary;
  return Object.hash(runtimeType,_this.id,_this.name,_this.colorToken);
}

@override
String toString() {
  final _this = this as TagSummary;
  return 'TagSummary(id: ${_this.id}, name: ${_this.name}, colorToken: ${_this.colorToken})';
}


}

/// @nodoc
abstract mixin class $TagSummaryCopyWith<$Res>  {
  factory $TagSummaryCopyWith(TagSummary value, $Res Function(TagSummary) _then) = _$TagSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? colorToken
});




}
/// @nodoc
class _$TagSummaryCopyWithImpl<$Res>
    implements $TagSummaryCopyWith<$Res> {
  _$TagSummaryCopyWithImpl(this._self, this._then);

  final TagSummary _self;
  final $Res Function(TagSummary) _then;

/// Create a copy of TagSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? colorToken = freezed,}) {
  return _then(TagSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,colorToken: freezed == colorToken ? _self.colorToken : colorToken // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TagSummary].
extension TagSummaryPatterns on TagSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TagSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TagSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TagSummary value)  $default,){
final _that = this;
switch (_that) {
case _TagSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TagSummary value)?  $default,){
final _that = this;
switch (_that) {
case _TagSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? colorToken)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TagSummary() when $default != null:
return $default(_that.id,_that.name,_that.colorToken);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? colorToken)  $default,) {final _that = this;
switch (_that) {
case _TagSummary():
return $default(_that.id,_that.name,_that.colorToken);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? colorToken)?  $default,) {final _that = this;
switch (_that) {
case _TagSummary() when $default != null:
return $default(_that.id,_that.name,_that.colorToken);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TagSummary implements TagSummary {
  const _TagSummary({required this.id, required this.name, required this.colorToken});
  factory _TagSummary.fromJson(Map<String, dynamic> json) => _$TagSummaryFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? colorToken;

/// Create a copy of TagSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TagSummaryCopyWith<_TagSummary> get copyWith => __$TagSummaryCopyWithImpl<_TagSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TagSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TagSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.colorToken, colorToken) || other.colorToken == colorToken));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,colorToken);
}

@override
String toString() {
    return 'TagSummary(id: $id, name: $name, colorToken: $colorToken)';
}


}

/// @nodoc
abstract mixin class _$TagSummaryCopyWith<$Res> implements $TagSummaryCopyWith<$Res> {
  factory _$TagSummaryCopyWith(_TagSummary value, $Res Function(_TagSummary) _then) = __$TagSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? colorToken
});




}
/// @nodoc
class __$TagSummaryCopyWithImpl<$Res>
    implements _$TagSummaryCopyWith<$Res> {
  __$TagSummaryCopyWithImpl(this._self, this._then);

  final _TagSummary _self;
  final $Res Function(_TagSummary) _then;

/// Create a copy of TagSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? colorToken = freezed,}) {
  return _then(_TagSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,colorToken: freezed == colorToken ? _self.colorToken : colorToken // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$FileSummary {

 String get id; String get name; String? get extension; String get mimeType; int get sizeBytes; LibraryCategory get category; bool get favorite; String? get description; String? get folderId; String? get folderName; FileContentStatus get contentStatus; List<TagSummary> get tags; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of FileSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FileSummaryCopyWith<FileSummary> get copyWith => _$FileSummaryCopyWithImpl<FileSummary>(this as FileSummary, _$identity);

  /// Serializes this FileSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FileSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FileSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.extension, _this.extension) || other.extension == _this.extension)&&(identical(other.mimeType, _this.mimeType) || other.mimeType == _this.mimeType)&&(identical(other.sizeBytes, _this.sizeBytes) || other.sizeBytes == _this.sizeBytes)&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.favorite, _this.favorite) || other.favorite == _this.favorite)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.folderId, _this.folderId) || other.folderId == _this.folderId)&&(identical(other.folderName, _this.folderName) || other.folderName == _this.folderName)&&(identical(other.contentStatus, _this.contentStatus) || other.contentStatus == _this.contentStatus)&&const DeepCollectionEquality().equals(other.tags, _this.tags)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FileSummary;
  return Object.hash(runtimeType,_this.id,_this.name,_this.extension,_this.mimeType,_this.sizeBytes,_this.category,_this.favorite,_this.description,_this.folderId,_this.folderName,_this.contentStatus,const DeepCollectionEquality().hash(_this.tags),_this.createdAt,_this.updatedAt);
}

@override
String toString() {
  final _this = this as FileSummary;
  return 'FileSummary(id: ${_this.id}, name: ${_this.name}, extension: ${_this.extension}, mimeType: ${_this.mimeType}, sizeBytes: ${_this.sizeBytes}, category: ${_this.category}, favorite: ${_this.favorite}, description: ${_this.description}, folderId: ${_this.folderId}, folderName: ${_this.folderName}, contentStatus: ${_this.contentStatus}, tags: ${_this.tags}, createdAt: ${_this.createdAt}, updatedAt: ${_this.updatedAt})';
}


}

/// @nodoc
abstract mixin class $FileSummaryCopyWith<$Res>  {
  factory $FileSummaryCopyWith(FileSummary value, $Res Function(FileSummary) _then) = _$FileSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? extension, String mimeType, int sizeBytes, LibraryCategory category, bool favorite, String? description, String? folderId, String? folderName, FileContentStatus contentStatus, List<TagSummary> tags, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class _$FileSummaryCopyWithImpl<$Res>
    implements $FileSummaryCopyWith<$Res> {
  _$FileSummaryCopyWithImpl(this._self, this._then);

  final FileSummary _self;
  final $Res Function(FileSummary) _then;

/// Create a copy of FileSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? extension = freezed,Object? mimeType = null,Object? sizeBytes = null,Object? category = null,Object? favorite = null,Object? description = freezed,Object? folderId = freezed,Object? folderName = freezed,Object? contentStatus = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(FileSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,extension: freezed == extension ? _self.extension : extension // ignore: cast_nullable_to_non_nullable
as String?,mimeType: null == mimeType ? _self.mimeType : mimeType // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory,favorite: null == favorite ? _self.favorite : favorite // ignore: cast_nullable_to_non_nullable
as bool,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,folderId: freezed == folderId ? _self.folderId : folderId // ignore: cast_nullable_to_non_nullable
as String?,folderName: freezed == folderName ? _self.folderName : folderName // ignore: cast_nullable_to_non_nullable
as String?,contentStatus: null == contentStatus ? _self.contentStatus : contentStatus // ignore: cast_nullable_to_non_nullable
as FileContentStatus,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<TagSummary>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [FileSummary].
extension FileSummaryPatterns on FileSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FileSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FileSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FileSummary value)  $default,){
final _that = this;
switch (_that) {
case _FileSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FileSummary value)?  $default,){
final _that = this;
switch (_that) {
case _FileSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? extension,  String mimeType,  int sizeBytes,  LibraryCategory category,  bool favorite,  String? description,  String? folderId,  String? folderName,  FileContentStatus contentStatus,  List<TagSummary> tags,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FileSummary() when $default != null:
return $default(_that.id,_that.name,_that.extension,_that.mimeType,_that.sizeBytes,_that.category,_that.favorite,_that.description,_that.folderId,_that.folderName,_that.contentStatus,_that.tags,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? extension,  String mimeType,  int sizeBytes,  LibraryCategory category,  bool favorite,  String? description,  String? folderId,  String? folderName,  FileContentStatus contentStatus,  List<TagSummary> tags,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _FileSummary():
return $default(_that.id,_that.name,_that.extension,_that.mimeType,_that.sizeBytes,_that.category,_that.favorite,_that.description,_that.folderId,_that.folderName,_that.contentStatus,_that.tags,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? extension,  String mimeType,  int sizeBytes,  LibraryCategory category,  bool favorite,  String? description,  String? folderId,  String? folderName,  FileContentStatus contentStatus,  List<TagSummary> tags,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _FileSummary() when $default != null:
return $default(_that.id,_that.name,_that.extension,_that.mimeType,_that.sizeBytes,_that.category,_that.favorite,_that.description,_that.folderId,_that.folderName,_that.contentStatus,_that.tags,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FileSummary implements FileSummary {
  const _FileSummary({required this.id, required this.name, required this.extension, required this.mimeType, required this.sizeBytes, required this.category, required this.favorite, required this.description, required this.folderId, required this.folderName, required this.contentStatus, required  List<TagSummary> tags, required this.createdAt, required this.updatedAt}): _tags = tags;
  factory _FileSummary.fromJson(Map<String, dynamic> json) => _$FileSummaryFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? extension;
@override final  String mimeType;
@override final  int sizeBytes;
@override final  LibraryCategory category;
@override final  bool favorite;
@override final  String? description;
@override final  String? folderId;
@override final  String? folderName;
@override final  FileContentStatus contentStatus;
 final  List<TagSummary> _tags;
@override List<TagSummary> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of FileSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FileSummaryCopyWith<_FileSummary> get copyWith => __$FileSummaryCopyWithImpl<_FileSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FileSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FileSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.extension, extension) || other.extension == extension)&&(identical(other.mimeType, mimeType) || other.mimeType == mimeType)&&(identical(other.sizeBytes, sizeBytes) || other.sizeBytes == sizeBytes)&&(identical(other.category, category) || other.category == category)&&(identical(other.favorite, favorite) || other.favorite == favorite)&&(identical(other.description, description) || other.description == description)&&(identical(other.folderId, folderId) || other.folderId == folderId)&&(identical(other.folderName, folderName) || other.folderName == folderName)&&(identical(other.contentStatus, contentStatus) || other.contentStatus == contentStatus)&&const DeepCollectionEquality().equals(other.tags, _tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,extension,mimeType,sizeBytes,category,favorite,description,folderId,folderName,contentStatus,const DeepCollectionEquality().hash(_tags),createdAt,updatedAt);
}

@override
String toString() {
    return 'FileSummary(id: $id, name: $name, extension: $extension, mimeType: $mimeType, sizeBytes: $sizeBytes, category: $category, favorite: $favorite, description: $description, folderId: $folderId, folderName: $folderName, contentStatus: $contentStatus, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$FileSummaryCopyWith<$Res> implements $FileSummaryCopyWith<$Res> {
  factory _$FileSummaryCopyWith(_FileSummary value, $Res Function(_FileSummary) _then) = __$FileSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? extension, String mimeType, int sizeBytes, LibraryCategory category, bool favorite, String? description, String? folderId, String? folderName, FileContentStatus contentStatus, List<TagSummary> tags, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class __$FileSummaryCopyWithImpl<$Res>
    implements _$FileSummaryCopyWith<$Res> {
  __$FileSummaryCopyWithImpl(this._self, this._then);

  final _FileSummary _self;
  final $Res Function(_FileSummary) _then;

/// Create a copy of FileSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? extension = freezed,Object? mimeType = null,Object? sizeBytes = null,Object? category = null,Object? favorite = null,Object? description = freezed,Object? folderId = freezed,Object? folderName = freezed,Object? contentStatus = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_FileSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,extension: freezed == extension ? _self.extension : extension // ignore: cast_nullable_to_non_nullable
as String?,mimeType: null == mimeType ? _self.mimeType : mimeType // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory,favorite: null == favorite ? _self.favorite : favorite // ignore: cast_nullable_to_non_nullable
as bool,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,folderId: freezed == folderId ? _self.folderId : folderId // ignore: cast_nullable_to_non_nullable
as String?,folderName: freezed == folderName ? _self.folderName : folderName // ignore: cast_nullable_to_non_nullable
as String?,contentStatus: null == contentStatus ? _self.contentStatus : contentStatus // ignore: cast_nullable_to_non_nullable
as FileContentStatus,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<TagSummary>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$FileListResponse {

 List<FileSummary> get items; int get total; int get limit; int get offset; bool get hasMore;
/// Create a copy of FileListResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FileListResponseCopyWith<FileListResponse> get copyWith => _$FileListResponseCopyWithImpl<FileListResponse>(this as FileListResponse, _$identity);

  /// Serializes this FileListResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FileListResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FileListResponse&&const DeepCollectionEquality().equals(other.items, _this.items)&&(identical(other.total, _this.total) || other.total == _this.total)&&(identical(other.limit, _this.limit) || other.limit == _this.limit)&&(identical(other.offset, _this.offset) || other.offset == _this.offset)&&(identical(other.hasMore, _this.hasMore) || other.hasMore == _this.hasMore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FileListResponse;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.items),_this.total,_this.limit,_this.offset,_this.hasMore);
}

@override
String toString() {
  final _this = this as FileListResponse;
  return 'FileListResponse(items: ${_this.items}, total: ${_this.total}, limit: ${_this.limit}, offset: ${_this.offset}, hasMore: ${_this.hasMore})';
}


}

/// @nodoc
abstract mixin class $FileListResponseCopyWith<$Res>  {
  factory $FileListResponseCopyWith(FileListResponse value, $Res Function(FileListResponse) _then) = _$FileListResponseCopyWithImpl;
@useResult
$Res call({
 List<FileSummary> items, int total, int limit, int offset, bool hasMore
});




}
/// @nodoc
class _$FileListResponseCopyWithImpl<$Res>
    implements $FileListResponseCopyWith<$Res> {
  _$FileListResponseCopyWithImpl(this._self, this._then);

  final FileListResponse _self;
  final $Res Function(FileListResponse) _then;

/// Create a copy of FileListResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? items = null,Object? total = null,Object? limit = null,Object? offset = null,Object? hasMore = null,}) {
  return _then(FileListResponse(
items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,offset: null == offset ? _self.offset : offset // ignore: cast_nullable_to_non_nullable
as int,hasMore: null == hasMore ? _self.hasMore : hasMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [FileListResponse].
extension FileListResponsePatterns on FileListResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FileListResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FileListResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FileListResponse value)  $default,){
final _that = this;
switch (_that) {
case _FileListResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FileListResponse value)?  $default,){
final _that = this;
switch (_that) {
case _FileListResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<FileSummary> items,  int total,  int limit,  int offset,  bool hasMore)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FileListResponse() when $default != null:
return $default(_that.items,_that.total,_that.limit,_that.offset,_that.hasMore);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<FileSummary> items,  int total,  int limit,  int offset,  bool hasMore)  $default,) {final _that = this;
switch (_that) {
case _FileListResponse():
return $default(_that.items,_that.total,_that.limit,_that.offset,_that.hasMore);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<FileSummary> items,  int total,  int limit,  int offset,  bool hasMore)?  $default,) {final _that = this;
switch (_that) {
case _FileListResponse() when $default != null:
return $default(_that.items,_that.total,_that.limit,_that.offset,_that.hasMore);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FileListResponse implements FileListResponse {
  const _FileListResponse({required  List<FileSummary> items, required this.total, required this.limit, required this.offset, required this.hasMore}): _items = items;
  factory _FileListResponse.fromJson(Map<String, dynamic> json) => _$FileListResponseFromJson(json);

 final  List<FileSummary> _items;
@override List<FileSummary> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}

@override final  int total;
@override final  int limit;
@override final  int offset;
@override final  bool hasMore;

/// Create a copy of FileListResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FileListResponseCopyWith<_FileListResponse> get copyWith => __$FileListResponseCopyWithImpl<_FileListResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FileListResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FileListResponse&&const DeepCollectionEquality().equals(other.items, _items)&&(identical(other.total, total) || other.total == total)&&(identical(other.limit, limit) || other.limit == limit)&&(identical(other.offset, offset) || other.offset == offset)&&(identical(other.hasMore, hasMore) || other.hasMore == hasMore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_items),total,limit,offset,hasMore);
}

@override
String toString() {
    return 'FileListResponse(items: $items, total: $total, limit: $limit, offset: $offset, hasMore: $hasMore)';
}


}

/// @nodoc
abstract mixin class _$FileListResponseCopyWith<$Res> implements $FileListResponseCopyWith<$Res> {
  factory _$FileListResponseCopyWith(_FileListResponse value, $Res Function(_FileListResponse) _then) = __$FileListResponseCopyWithImpl;
@override @useResult
$Res call({
 List<FileSummary> items, int total, int limit, int offset, bool hasMore
});




}
/// @nodoc
class __$FileListResponseCopyWithImpl<$Res>
    implements _$FileListResponseCopyWith<$Res> {
  __$FileListResponseCopyWithImpl(this._self, this._then);

  final _FileListResponse _self;
  final $Res Function(_FileListResponse) _then;

/// Create a copy of FileListResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? items = null,Object? total = null,Object? limit = null,Object? offset = null,Object? hasMore = null,}) {
  return _then(_FileListResponse(
items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,offset: null == offset ? _self.offset : offset // ignore: cast_nullable_to_non_nullable
as int,hasMore: null == hasMore ? _self.hasMore : hasMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$FolderSummary {

 String get id; String get name; String? get parentFolderId; int get fileCount; int get folderCount; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of FolderSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FolderSummaryCopyWith<FolderSummary> get copyWith => _$FolderSummaryCopyWithImpl<FolderSummary>(this as FolderSummary, _$identity);

  /// Serializes this FolderSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FolderSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FolderSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.parentFolderId, _this.parentFolderId) || other.parentFolderId == _this.parentFolderId)&&(identical(other.fileCount, _this.fileCount) || other.fileCount == _this.fileCount)&&(identical(other.folderCount, _this.folderCount) || other.folderCount == _this.folderCount)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FolderSummary;
  return Object.hash(runtimeType,_this.id,_this.name,_this.parentFolderId,_this.fileCount,_this.folderCount,_this.createdAt,_this.updatedAt);
}

@override
String toString() {
  final _this = this as FolderSummary;
  return 'FolderSummary(id: ${_this.id}, name: ${_this.name}, parentFolderId: ${_this.parentFolderId}, fileCount: ${_this.fileCount}, folderCount: ${_this.folderCount}, createdAt: ${_this.createdAt}, updatedAt: ${_this.updatedAt})';
}


}

/// @nodoc
abstract mixin class $FolderSummaryCopyWith<$Res>  {
  factory $FolderSummaryCopyWith(FolderSummary value, $Res Function(FolderSummary) _then) = _$FolderSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? parentFolderId, int fileCount, int folderCount, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class _$FolderSummaryCopyWithImpl<$Res>
    implements $FolderSummaryCopyWith<$Res> {
  _$FolderSummaryCopyWithImpl(this._self, this._then);

  final FolderSummary _self;
  final $Res Function(FolderSummary) _then;

/// Create a copy of FolderSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? parentFolderId = freezed,Object? fileCount = null,Object? folderCount = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(FolderSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,parentFolderId: freezed == parentFolderId ? _self.parentFolderId : parentFolderId // ignore: cast_nullable_to_non_nullable
as String?,fileCount: null == fileCount ? _self.fileCount : fileCount // ignore: cast_nullable_to_non_nullable
as int,folderCount: null == folderCount ? _self.folderCount : folderCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [FolderSummary].
extension FolderSummaryPatterns on FolderSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FolderSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FolderSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FolderSummary value)  $default,){
final _that = this;
switch (_that) {
case _FolderSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FolderSummary value)?  $default,){
final _that = this;
switch (_that) {
case _FolderSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? parentFolderId,  int fileCount,  int folderCount,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FolderSummary() when $default != null:
return $default(_that.id,_that.name,_that.parentFolderId,_that.fileCount,_that.folderCount,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? parentFolderId,  int fileCount,  int folderCount,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _FolderSummary():
return $default(_that.id,_that.name,_that.parentFolderId,_that.fileCount,_that.folderCount,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? parentFolderId,  int fileCount,  int folderCount,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _FolderSummary() when $default != null:
return $default(_that.id,_that.name,_that.parentFolderId,_that.fileCount,_that.folderCount,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FolderSummary implements FolderSummary {
  const _FolderSummary({required this.id, required this.name, required this.parentFolderId, required this.fileCount, required this.folderCount, required this.createdAt, required this.updatedAt});
  factory _FolderSummary.fromJson(Map<String, dynamic> json) => _$FolderSummaryFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? parentFolderId;
@override final  int fileCount;
@override final  int folderCount;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of FolderSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FolderSummaryCopyWith<_FolderSummary> get copyWith => __$FolderSummaryCopyWithImpl<_FolderSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FolderSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FolderSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.parentFolderId, parentFolderId) || other.parentFolderId == parentFolderId)&&(identical(other.fileCount, fileCount) || other.fileCount == fileCount)&&(identical(other.folderCount, folderCount) || other.folderCount == folderCount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,parentFolderId,fileCount,folderCount,createdAt,updatedAt);
}

@override
String toString() {
    return 'FolderSummary(id: $id, name: $name, parentFolderId: $parentFolderId, fileCount: $fileCount, folderCount: $folderCount, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$FolderSummaryCopyWith<$Res> implements $FolderSummaryCopyWith<$Res> {
  factory _$FolderSummaryCopyWith(_FolderSummary value, $Res Function(_FolderSummary) _then) = __$FolderSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? parentFolderId, int fileCount, int folderCount, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class __$FolderSummaryCopyWithImpl<$Res>
    implements _$FolderSummaryCopyWith<$Res> {
  __$FolderSummaryCopyWithImpl(this._self, this._then);

  final _FolderSummary _self;
  final $Res Function(_FolderSummary) _then;

/// Create a copy of FolderSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? parentFolderId = freezed,Object? fileCount = null,Object? folderCount = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_FolderSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,parentFolderId: freezed == parentFolderId ? _self.parentFolderId : parentFolderId // ignore: cast_nullable_to_non_nullable
as String?,fileCount: null == fileCount ? _self.fileCount : fileCount // ignore: cast_nullable_to_non_nullable
as int,folderCount: null == folderCount ? _self.folderCount : folderCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$FolderListResponse {

 List<FolderSummary> get items;
/// Create a copy of FolderListResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FolderListResponseCopyWith<FolderListResponse> get copyWith => _$FolderListResponseCopyWithImpl<FolderListResponse>(this as FolderListResponse, _$identity);

  /// Serializes this FolderListResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FolderListResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FolderListResponse&&const DeepCollectionEquality().equals(other.items, _this.items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FolderListResponse;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.items));
}

@override
String toString() {
  final _this = this as FolderListResponse;
  return 'FolderListResponse(items: ${_this.items})';
}


}

/// @nodoc
abstract mixin class $FolderListResponseCopyWith<$Res>  {
  factory $FolderListResponseCopyWith(FolderListResponse value, $Res Function(FolderListResponse) _then) = _$FolderListResponseCopyWithImpl;
@useResult
$Res call({
 List<FolderSummary> items
});




}
/// @nodoc
class _$FolderListResponseCopyWithImpl<$Res>
    implements $FolderListResponseCopyWith<$Res> {
  _$FolderListResponseCopyWithImpl(this._self, this._then);

  final FolderListResponse _self;
  final $Res Function(FolderListResponse) _then;

/// Create a copy of FolderListResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? items = null,}) {
  return _then(FolderListResponse(
items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<FolderSummary>,
  ));
}

}


/// Adds pattern-matching-related methods to [FolderListResponse].
extension FolderListResponsePatterns on FolderListResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FolderListResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FolderListResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FolderListResponse value)  $default,){
final _that = this;
switch (_that) {
case _FolderListResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FolderListResponse value)?  $default,){
final _that = this;
switch (_that) {
case _FolderListResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<FolderSummary> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FolderListResponse() when $default != null:
return $default(_that.items);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<FolderSummary> items)  $default,) {final _that = this;
switch (_that) {
case _FolderListResponse():
return $default(_that.items);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<FolderSummary> items)?  $default,) {final _that = this;
switch (_that) {
case _FolderListResponse() when $default != null:
return $default(_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FolderListResponse implements FolderListResponse {
  const _FolderListResponse({required  List<FolderSummary> items}): _items = items;
  factory _FolderListResponse.fromJson(Map<String, dynamic> json) => _$FolderListResponseFromJson(json);

 final  List<FolderSummary> _items;
@override List<FolderSummary> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of FolderListResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FolderListResponseCopyWith<_FolderListResponse> get copyWith => __$FolderListResponseCopyWithImpl<_FolderListResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FolderListResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FolderListResponse&&const DeepCollectionEquality().equals(other.items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_items));
}

@override
String toString() {
    return 'FolderListResponse(items: $items)';
}


}

/// @nodoc
abstract mixin class _$FolderListResponseCopyWith<$Res> implements $FolderListResponseCopyWith<$Res> {
  factory _$FolderListResponseCopyWith(_FolderListResponse value, $Res Function(_FolderListResponse) _then) = __$FolderListResponseCopyWithImpl;
@override @useResult
$Res call({
 List<FolderSummary> items
});




}
/// @nodoc
class __$FolderListResponseCopyWithImpl<$Res>
    implements _$FolderListResponseCopyWith<$Res> {
  __$FolderListResponseCopyWithImpl(this._self, this._then);

  final _FolderListResponse _self;
  final $Res Function(_FolderListResponse) _then;

/// Create a copy of FolderListResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? items = null,}) {
  return _then(_FolderListResponse(
items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<FolderSummary>,
  ));
}


}


/// @nodoc
mixin _$TagListItem {

 String get id; String get name; String? get colorToken; int get fileCount; DateTime get createdAt;
/// Create a copy of TagListItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TagListItemCopyWith<TagListItem> get copyWith => _$TagListItemCopyWithImpl<TagListItem>(this as TagListItem, _$identity);

  /// Serializes this TagListItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TagListItem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TagListItem&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.colorToken, _this.colorToken) || other.colorToken == _this.colorToken)&&(identical(other.fileCount, _this.fileCount) || other.fileCount == _this.fileCount)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TagListItem;
  return Object.hash(runtimeType,_this.id,_this.name,_this.colorToken,_this.fileCount,_this.createdAt);
}

@override
String toString() {
  final _this = this as TagListItem;
  return 'TagListItem(id: ${_this.id}, name: ${_this.name}, colorToken: ${_this.colorToken}, fileCount: ${_this.fileCount}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $TagListItemCopyWith<$Res>  {
  factory $TagListItemCopyWith(TagListItem value, $Res Function(TagListItem) _then) = _$TagListItemCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? colorToken, int fileCount, DateTime createdAt
});




}
/// @nodoc
class _$TagListItemCopyWithImpl<$Res>
    implements $TagListItemCopyWith<$Res> {
  _$TagListItemCopyWithImpl(this._self, this._then);

  final TagListItem _self;
  final $Res Function(TagListItem) _then;

/// Create a copy of TagListItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? colorToken = freezed,Object? fileCount = null,Object? createdAt = null,}) {
  return _then(TagListItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,colorToken: freezed == colorToken ? _self.colorToken : colorToken // ignore: cast_nullable_to_non_nullable
as String?,fileCount: null == fileCount ? _self.fileCount : fileCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [TagListItem].
extension TagListItemPatterns on TagListItem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TagListItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TagListItem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TagListItem value)  $default,){
final _that = this;
switch (_that) {
case _TagListItem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TagListItem value)?  $default,){
final _that = this;
switch (_that) {
case _TagListItem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? colorToken,  int fileCount,  DateTime createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TagListItem() when $default != null:
return $default(_that.id,_that.name,_that.colorToken,_that.fileCount,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? colorToken,  int fileCount,  DateTime createdAt)  $default,) {final _that = this;
switch (_that) {
case _TagListItem():
return $default(_that.id,_that.name,_that.colorToken,_that.fileCount,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? colorToken,  int fileCount,  DateTime createdAt)?  $default,) {final _that = this;
switch (_that) {
case _TagListItem() when $default != null:
return $default(_that.id,_that.name,_that.colorToken,_that.fileCount,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TagListItem implements TagListItem {
  const _TagListItem({required this.id, required this.name, required this.colorToken, required this.fileCount, required this.createdAt});
  factory _TagListItem.fromJson(Map<String, dynamic> json) => _$TagListItemFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? colorToken;
@override final  int fileCount;
@override final  DateTime createdAt;

/// Create a copy of TagListItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TagListItemCopyWith<_TagListItem> get copyWith => __$TagListItemCopyWithImpl<_TagListItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TagListItemToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TagListItem&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.colorToken, colorToken) || other.colorToken == colorToken)&&(identical(other.fileCount, fileCount) || other.fileCount == fileCount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,colorToken,fileCount,createdAt);
}

@override
String toString() {
    return 'TagListItem(id: $id, name: $name, colorToken: $colorToken, fileCount: $fileCount, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$TagListItemCopyWith<$Res> implements $TagListItemCopyWith<$Res> {
  factory _$TagListItemCopyWith(_TagListItem value, $Res Function(_TagListItem) _then) = __$TagListItemCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? colorToken, int fileCount, DateTime createdAt
});




}
/// @nodoc
class __$TagListItemCopyWithImpl<$Res>
    implements _$TagListItemCopyWith<$Res> {
  __$TagListItemCopyWithImpl(this._self, this._then);

  final _TagListItem _self;
  final $Res Function(_TagListItem) _then;

/// Create a copy of TagListItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? colorToken = freezed,Object? fileCount = null,Object? createdAt = null,}) {
  return _then(_TagListItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,colorToken: freezed == colorToken ? _self.colorToken : colorToken // ignore: cast_nullable_to_non_nullable
as String?,fileCount: null == fileCount ? _self.fileCount : fileCount // ignore: cast_nullable_to_non_nullable
as int,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$TagListResponse {

 List<TagListItem> get items;
/// Create a copy of TagListResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TagListResponseCopyWith<TagListResponse> get copyWith => _$TagListResponseCopyWithImpl<TagListResponse>(this as TagListResponse, _$identity);

  /// Serializes this TagListResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TagListResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TagListResponse&&const DeepCollectionEquality().equals(other.items, _this.items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TagListResponse;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.items));
}

@override
String toString() {
  final _this = this as TagListResponse;
  return 'TagListResponse(items: ${_this.items})';
}


}

/// @nodoc
abstract mixin class $TagListResponseCopyWith<$Res>  {
  factory $TagListResponseCopyWith(TagListResponse value, $Res Function(TagListResponse) _then) = _$TagListResponseCopyWithImpl;
@useResult
$Res call({
 List<TagListItem> items
});




}
/// @nodoc
class _$TagListResponseCopyWithImpl<$Res>
    implements $TagListResponseCopyWith<$Res> {
  _$TagListResponseCopyWithImpl(this._self, this._then);

  final TagListResponse _self;
  final $Res Function(TagListResponse) _then;

/// Create a copy of TagListResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? items = null,}) {
  return _then(TagListResponse(
items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<TagListItem>,
  ));
}

}


/// Adds pattern-matching-related methods to [TagListResponse].
extension TagListResponsePatterns on TagListResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TagListResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TagListResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TagListResponse value)  $default,){
final _that = this;
switch (_that) {
case _TagListResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TagListResponse value)?  $default,){
final _that = this;
switch (_that) {
case _TagListResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<TagListItem> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TagListResponse() when $default != null:
return $default(_that.items);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<TagListItem> items)  $default,) {final _that = this;
switch (_that) {
case _TagListResponse():
return $default(_that.items);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<TagListItem> items)?  $default,) {final _that = this;
switch (_that) {
case _TagListResponse() when $default != null:
return $default(_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TagListResponse implements TagListResponse {
  const _TagListResponse({required  List<TagListItem> items}): _items = items;
  factory _TagListResponse.fromJson(Map<String, dynamic> json) => _$TagListResponseFromJson(json);

 final  List<TagListItem> _items;
@override List<TagListItem> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of TagListResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TagListResponseCopyWith<_TagListResponse> get copyWith => __$TagListResponseCopyWithImpl<_TagListResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TagListResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TagListResponse&&const DeepCollectionEquality().equals(other.items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_items));
}

@override
String toString() {
    return 'TagListResponse(items: $items)';
}


}

/// @nodoc
abstract mixin class _$TagListResponseCopyWith<$Res> implements $TagListResponseCopyWith<$Res> {
  factory _$TagListResponseCopyWith(_TagListResponse value, $Res Function(_TagListResponse) _then) = __$TagListResponseCopyWithImpl;
@override @useResult
$Res call({
 List<TagListItem> items
});




}
/// @nodoc
class __$TagListResponseCopyWithImpl<$Res>
    implements _$TagListResponseCopyWith<$Res> {
  __$TagListResponseCopyWithImpl(this._self, this._then);

  final _TagListResponse _self;
  final $Res Function(_TagListResponse) _then;

/// Create a copy of TagListResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? items = null,}) {
  return _then(_TagListResponse(
items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<TagListItem>,
  ));
}


}


/// @nodoc
mixin _$CategorySummary {

 LibraryCategory get category; int get files; int get bytes;
/// Create a copy of CategorySummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CategorySummaryCopyWith<CategorySummary> get copyWith => _$CategorySummaryCopyWithImpl<CategorySummary>(this as CategorySummary, _$identity);

  /// Serializes this CategorySummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as CategorySummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CategorySummary&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.files, _this.files) || other.files == _this.files)&&(identical(other.bytes, _this.bytes) || other.bytes == _this.bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as CategorySummary;
  return Object.hash(runtimeType,_this.category,_this.files,_this.bytes);
}

@override
String toString() {
  final _this = this as CategorySummary;
  return 'CategorySummary(category: ${_this.category}, files: ${_this.files}, bytes: ${_this.bytes})';
}


}

/// @nodoc
abstract mixin class $CategorySummaryCopyWith<$Res>  {
  factory $CategorySummaryCopyWith(CategorySummary value, $Res Function(CategorySummary) _then) = _$CategorySummaryCopyWithImpl;
@useResult
$Res call({
 LibraryCategory category, int files, int bytes
});




}
/// @nodoc
class _$CategorySummaryCopyWithImpl<$Res>
    implements $CategorySummaryCopyWith<$Res> {
  _$CategorySummaryCopyWithImpl(this._self, this._then);

  final CategorySummary _self;
  final $Res Function(CategorySummary) _then;

/// Create a copy of CategorySummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? category = null,Object? files = null,Object? bytes = null,}) {
  return _then(CategorySummary(
category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory,files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [CategorySummary].
extension CategorySummaryPatterns on CategorySummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CategorySummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CategorySummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CategorySummary value)  $default,){
final _that = this;
switch (_that) {
case _CategorySummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CategorySummary value)?  $default,){
final _that = this;
switch (_that) {
case _CategorySummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( LibraryCategory category,  int files,  int bytes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CategorySummary() when $default != null:
return $default(_that.category,_that.files,_that.bytes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( LibraryCategory category,  int files,  int bytes)  $default,) {final _that = this;
switch (_that) {
case _CategorySummary():
return $default(_that.category,_that.files,_that.bytes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( LibraryCategory category,  int files,  int bytes)?  $default,) {final _that = this;
switch (_that) {
case _CategorySummary() when $default != null:
return $default(_that.category,_that.files,_that.bytes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CategorySummary implements CategorySummary {
  const _CategorySummary({required this.category, required this.files, required this.bytes});
  factory _CategorySummary.fromJson(Map<String, dynamic> json) => _$CategorySummaryFromJson(json);

@override final  LibraryCategory category;
@override final  int files;
@override final  int bytes;

/// Create a copy of CategorySummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CategorySummaryCopyWith<_CategorySummary> get copyWith => __$CategorySummaryCopyWithImpl<_CategorySummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CategorySummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _CategorySummary&&(identical(other.category, category) || other.category == category)&&(identical(other.files, files) || other.files == files)&&(identical(other.bytes, bytes) || other.bytes == bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,category,files,bytes);
}

@override
String toString() {
    return 'CategorySummary(category: $category, files: $files, bytes: $bytes)';
}


}

/// @nodoc
abstract mixin class _$CategorySummaryCopyWith<$Res> implements $CategorySummaryCopyWith<$Res> {
  factory _$CategorySummaryCopyWith(_CategorySummary value, $Res Function(_CategorySummary) _then) = __$CategorySummaryCopyWithImpl;
@override @useResult
$Res call({
 LibraryCategory category, int files, int bytes
});




}
/// @nodoc
class __$CategorySummaryCopyWithImpl<$Res>
    implements _$CategorySummaryCopyWith<$Res> {
  __$CategorySummaryCopyWithImpl(this._self, this._then);

  final _CategorySummary _self;
  final $Res Function(_CategorySummary) _then;

/// Create a copy of CategorySummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? category = null,Object? files = null,Object? bytes = null,}) {
  return _then(_CategorySummary(
category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory,files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$LibraryTotals {

 int get files; int get folders; int get bytes; int get tags; int get trashedFiles; int get trashedFolders;
/// Create a copy of LibraryTotals
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LibraryTotalsCopyWith<LibraryTotals> get copyWith => _$LibraryTotalsCopyWithImpl<LibraryTotals>(this as LibraryTotals, _$identity);

  /// Serializes this LibraryTotals to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LibraryTotals;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LibraryTotals&&(identical(other.files, _this.files) || other.files == _this.files)&&(identical(other.folders, _this.folders) || other.folders == _this.folders)&&(identical(other.bytes, _this.bytes) || other.bytes == _this.bytes)&&(identical(other.tags, _this.tags) || other.tags == _this.tags)&&(identical(other.trashedFiles, _this.trashedFiles) || other.trashedFiles == _this.trashedFiles)&&(identical(other.trashedFolders, _this.trashedFolders) || other.trashedFolders == _this.trashedFolders));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LibraryTotals;
  return Object.hash(runtimeType,_this.files,_this.folders,_this.bytes,_this.tags,_this.trashedFiles,_this.trashedFolders);
}

@override
String toString() {
  final _this = this as LibraryTotals;
  return 'LibraryTotals(files: ${_this.files}, folders: ${_this.folders}, bytes: ${_this.bytes}, tags: ${_this.tags}, trashedFiles: ${_this.trashedFiles}, trashedFolders: ${_this.trashedFolders})';
}


}

/// @nodoc
abstract mixin class $LibraryTotalsCopyWith<$Res>  {
  factory $LibraryTotalsCopyWith(LibraryTotals value, $Res Function(LibraryTotals) _then) = _$LibraryTotalsCopyWithImpl;
@useResult
$Res call({
 int files, int folders, int bytes, int tags, int trashedFiles, int trashedFolders
});




}
/// @nodoc
class _$LibraryTotalsCopyWithImpl<$Res>
    implements $LibraryTotalsCopyWith<$Res> {
  _$LibraryTotalsCopyWithImpl(this._self, this._then);

  final LibraryTotals _self;
  final $Res Function(LibraryTotals) _then;

/// Create a copy of LibraryTotals
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? files = null,Object? folders = null,Object? bytes = null,Object? tags = null,Object? trashedFiles = null,Object? trashedFolders = null,}) {
  return _then(LibraryTotals(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as int,trashedFiles: null == trashedFiles ? _self.trashedFiles : trashedFiles // ignore: cast_nullable_to_non_nullable
as int,trashedFolders: null == trashedFolders ? _self.trashedFolders : trashedFolders // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [LibraryTotals].
extension LibraryTotalsPatterns on LibraryTotals {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LibraryTotals value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LibraryTotals() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LibraryTotals value)  $default,){
final _that = this;
switch (_that) {
case _LibraryTotals():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LibraryTotals value)?  $default,){
final _that = this;
switch (_that) {
case _LibraryTotals() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes,  int tags,  int trashedFiles,  int trashedFolders)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LibraryTotals() when $default != null:
return $default(_that.files,_that.folders,_that.bytes,_that.tags,_that.trashedFiles,_that.trashedFolders);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes,  int tags,  int trashedFiles,  int trashedFolders)  $default,) {final _that = this;
switch (_that) {
case _LibraryTotals():
return $default(_that.files,_that.folders,_that.bytes,_that.tags,_that.trashedFiles,_that.trashedFolders);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int files,  int folders,  int bytes,  int tags,  int trashedFiles,  int trashedFolders)?  $default,) {final _that = this;
switch (_that) {
case _LibraryTotals() when $default != null:
return $default(_that.files,_that.folders,_that.bytes,_that.tags,_that.trashedFiles,_that.trashedFolders);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LibraryTotals implements LibraryTotals {
  const _LibraryTotals({required this.files, required this.folders, required this.bytes, required this.tags, required this.trashedFiles, required this.trashedFolders});
  factory _LibraryTotals.fromJson(Map<String, dynamic> json) => _$LibraryTotalsFromJson(json);

@override final  int files;
@override final  int folders;
@override final  int bytes;
@override final  int tags;
@override final  int trashedFiles;
@override final  int trashedFolders;

/// Create a copy of LibraryTotals
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LibraryTotalsCopyWith<_LibraryTotals> get copyWith => __$LibraryTotalsCopyWithImpl<_LibraryTotals>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LibraryTotalsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LibraryTotals&&(identical(other.files, files) || other.files == files)&&(identical(other.folders, folders) || other.folders == folders)&&(identical(other.bytes, bytes) || other.bytes == bytes)&&(identical(other.tags, tags) || other.tags == tags)&&(identical(other.trashedFiles, trashedFiles) || other.trashedFiles == trashedFiles)&&(identical(other.trashedFolders, trashedFolders) || other.trashedFolders == trashedFolders));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,files,folders,bytes,tags,trashedFiles,trashedFolders);
}

@override
String toString() {
    return 'LibraryTotals(files: $files, folders: $folders, bytes: $bytes, tags: $tags, trashedFiles: $trashedFiles, trashedFolders: $trashedFolders)';
}


}

/// @nodoc
abstract mixin class _$LibraryTotalsCopyWith<$Res> implements $LibraryTotalsCopyWith<$Res> {
  factory _$LibraryTotalsCopyWith(_LibraryTotals value, $Res Function(_LibraryTotals) _then) = __$LibraryTotalsCopyWithImpl;
@override @useResult
$Res call({
 int files, int folders, int bytes, int tags, int trashedFiles, int trashedFolders
});




}
/// @nodoc
class __$LibraryTotalsCopyWithImpl<$Res>
    implements _$LibraryTotalsCopyWith<$Res> {
  __$LibraryTotalsCopyWithImpl(this._self, this._then);

  final _LibraryTotals _self;
  final $Res Function(_LibraryTotals) _then;

/// Create a copy of LibraryTotals
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? files = null,Object? folders = null,Object? bytes = null,Object? tags = null,Object? trashedFiles = null,Object? trashedFolders = null,}) {
  return _then(_LibraryTotals(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as int,trashedFiles: null == trashedFiles ? _self.trashedFiles : trashedFiles // ignore: cast_nullable_to_non_nullable
as int,trashedFolders: null == trashedFolders ? _self.trashedFolders : trashedFolders // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$LibrarySummaryResponse {

 LibraryTotals get totals; List<CategorySummary> get categories; List<FileSummary> get recent; List<FileSummary> get largest;
/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LibrarySummaryResponseCopyWith<LibrarySummaryResponse> get copyWith => _$LibrarySummaryResponseCopyWithImpl<LibrarySummaryResponse>(this as LibrarySummaryResponse, _$identity);

  /// Serializes this LibrarySummaryResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LibrarySummaryResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LibrarySummaryResponse&&(identical(other.totals, _this.totals) || other.totals == _this.totals)&&const DeepCollectionEquality().equals(other.categories, _this.categories)&&const DeepCollectionEquality().equals(other.recent, _this.recent)&&const DeepCollectionEquality().equals(other.largest, _this.largest));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LibrarySummaryResponse;
  return Object.hash(runtimeType,_this.totals,const DeepCollectionEquality().hash(_this.categories),const DeepCollectionEquality().hash(_this.recent),const DeepCollectionEquality().hash(_this.largest));
}

@override
String toString() {
  final _this = this as LibrarySummaryResponse;
  return 'LibrarySummaryResponse(totals: ${_this.totals}, categories: ${_this.categories}, recent: ${_this.recent}, largest: ${_this.largest})';
}


}

/// @nodoc
abstract mixin class $LibrarySummaryResponseCopyWith<$Res>  {
  factory $LibrarySummaryResponseCopyWith(LibrarySummaryResponse value, $Res Function(LibrarySummaryResponse) _then) = _$LibrarySummaryResponseCopyWithImpl;
@useResult
$Res call({
 LibraryTotals totals, List<CategorySummary> categories, List<FileSummary> recent, List<FileSummary> largest
});


$LibraryTotalsCopyWith<$Res> get totals;

}
/// @nodoc
class _$LibrarySummaryResponseCopyWithImpl<$Res>
    implements $LibrarySummaryResponseCopyWith<$Res> {
  _$LibrarySummaryResponseCopyWithImpl(this._self, this._then);

  final LibrarySummaryResponse _self;
  final $Res Function(LibrarySummaryResponse) _then;

/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? totals = null,Object? categories = null,Object? recent = null,Object? largest = null,}) {
  return _then(LibrarySummaryResponse(
totals: null == totals ? _self.totals : totals // ignore: cast_nullable_to_non_nullable
as LibraryTotals,categories: null == categories ? _self.categories : categories // ignore: cast_nullable_to_non_nullable
as List<CategorySummary>,recent: null == recent ? _self.recent : recent // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,largest: null == largest ? _self.largest : largest // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,
  ));
}
/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LibraryTotalsCopyWith<$Res> get totals {
  
  return $LibraryTotalsCopyWith<$Res>(_self.totals, (value) {
    return _then(_self.copyWith(totals: value));
  });
}
}


/// Adds pattern-matching-related methods to [LibrarySummaryResponse].
extension LibrarySummaryResponsePatterns on LibrarySummaryResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LibrarySummaryResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LibrarySummaryResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LibrarySummaryResponse value)  $default,){
final _that = this;
switch (_that) {
case _LibrarySummaryResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LibrarySummaryResponse value)?  $default,){
final _that = this;
switch (_that) {
case _LibrarySummaryResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( LibraryTotals totals,  List<CategorySummary> categories,  List<FileSummary> recent,  List<FileSummary> largest)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LibrarySummaryResponse() when $default != null:
return $default(_that.totals,_that.categories,_that.recent,_that.largest);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( LibraryTotals totals,  List<CategorySummary> categories,  List<FileSummary> recent,  List<FileSummary> largest)  $default,) {final _that = this;
switch (_that) {
case _LibrarySummaryResponse():
return $default(_that.totals,_that.categories,_that.recent,_that.largest);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( LibraryTotals totals,  List<CategorySummary> categories,  List<FileSummary> recent,  List<FileSummary> largest)?  $default,) {final _that = this;
switch (_that) {
case _LibrarySummaryResponse() when $default != null:
return $default(_that.totals,_that.categories,_that.recent,_that.largest);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LibrarySummaryResponse implements LibrarySummaryResponse {
  const _LibrarySummaryResponse({required this.totals, required  List<CategorySummary> categories, required  List<FileSummary> recent, required  List<FileSummary> largest}): _categories = categories,_recent = recent,_largest = largest;
  factory _LibrarySummaryResponse.fromJson(Map<String, dynamic> json) => _$LibrarySummaryResponseFromJson(json);

@override final  LibraryTotals totals;
 final  List<CategorySummary> _categories;
@override List<CategorySummary> get categories {
  if (_categories is EqualUnmodifiableListView) return _categories;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_categories);
}

 final  List<FileSummary> _recent;
@override List<FileSummary> get recent {
  if (_recent is EqualUnmodifiableListView) return _recent;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_recent);
}

 final  List<FileSummary> _largest;
@override List<FileSummary> get largest {
  if (_largest is EqualUnmodifiableListView) return _largest;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_largest);
}


/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LibrarySummaryResponseCopyWith<_LibrarySummaryResponse> get copyWith => __$LibrarySummaryResponseCopyWithImpl<_LibrarySummaryResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LibrarySummaryResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LibrarySummaryResponse&&(identical(other.totals, totals) || other.totals == totals)&&const DeepCollectionEquality().equals(other.categories, _categories)&&const DeepCollectionEquality().equals(other.recent, _recent)&&const DeepCollectionEquality().equals(other.largest, _largest));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,totals,const DeepCollectionEquality().hash(_categories),const DeepCollectionEquality().hash(_recent),const DeepCollectionEquality().hash(_largest));
}

@override
String toString() {
    return 'LibrarySummaryResponse(totals: $totals, categories: $categories, recent: $recent, largest: $largest)';
}


}

/// @nodoc
abstract mixin class _$LibrarySummaryResponseCopyWith<$Res> implements $LibrarySummaryResponseCopyWith<$Res> {
  factory _$LibrarySummaryResponseCopyWith(_LibrarySummaryResponse value, $Res Function(_LibrarySummaryResponse) _then) = __$LibrarySummaryResponseCopyWithImpl;
@override @useResult
$Res call({
 LibraryTotals totals, List<CategorySummary> categories, List<FileSummary> recent, List<FileSummary> largest
});


@override $LibraryTotalsCopyWith<$Res> get totals;

}
/// @nodoc
class __$LibrarySummaryResponseCopyWithImpl<$Res>
    implements _$LibrarySummaryResponseCopyWith<$Res> {
  __$LibrarySummaryResponseCopyWithImpl(this._self, this._then);

  final _LibrarySummaryResponse _self;
  final $Res Function(_LibrarySummaryResponse) _then;

/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? totals = null,Object? categories = null,Object? recent = null,Object? largest = null,}) {
  return _then(_LibrarySummaryResponse(
totals: null == totals ? _self.totals : totals // ignore: cast_nullable_to_non_nullable
as LibraryTotals,categories: null == categories ? _self._categories : categories // ignore: cast_nullable_to_non_nullable
as List<CategorySummary>,recent: null == recent ? _self._recent : recent // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,largest: null == largest ? _self._largest : largest // ignore: cast_nullable_to_non_nullable
as List<FileSummary>,
  ));
}

/// Create a copy of LibrarySummaryResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LibraryTotalsCopyWith<$Res> get totals {
  
  return $LibraryTotalsCopyWith<$Res>(_self.totals, (value) {
    return _then(_self.copyWith(totals: value));
  });
}
}


/// @nodoc
mixin _$FolderUsage {

 String get id; String get name; int get files; int get bytes;
/// Create a copy of FolderUsage
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FolderUsageCopyWith<FolderUsage> get copyWith => _$FolderUsageCopyWithImpl<FolderUsage>(this as FolderUsage, _$identity);

  /// Serializes this FolderUsage to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FolderUsage;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FolderUsage&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.files, _this.files) || other.files == _this.files)&&(identical(other.bytes, _this.bytes) || other.bytes == _this.bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FolderUsage;
  return Object.hash(runtimeType,_this.id,_this.name,_this.files,_this.bytes);
}

@override
String toString() {
  final _this = this as FolderUsage;
  return 'FolderUsage(id: ${_this.id}, name: ${_this.name}, files: ${_this.files}, bytes: ${_this.bytes})';
}


}

/// @nodoc
abstract mixin class $FolderUsageCopyWith<$Res>  {
  factory $FolderUsageCopyWith(FolderUsage value, $Res Function(FolderUsage) _then) = _$FolderUsageCopyWithImpl;
@useResult
$Res call({
 String id, String name, int files, int bytes
});




}
/// @nodoc
class _$FolderUsageCopyWithImpl<$Res>
    implements $FolderUsageCopyWith<$Res> {
  _$FolderUsageCopyWithImpl(this._self, this._then);

  final FolderUsage _self;
  final $Res Function(FolderUsage) _then;

/// Create a copy of FolderUsage
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? files = null,Object? bytes = null,}) {
  return _then(FolderUsage(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [FolderUsage].
extension FolderUsagePatterns on FolderUsage {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FolderUsage value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FolderUsage() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FolderUsage value)  $default,){
final _that = this;
switch (_that) {
case _FolderUsage():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FolderUsage value)?  $default,){
final _that = this;
switch (_that) {
case _FolderUsage() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  int files,  int bytes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FolderUsage() when $default != null:
return $default(_that.id,_that.name,_that.files,_that.bytes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  int files,  int bytes)  $default,) {final _that = this;
switch (_that) {
case _FolderUsage():
return $default(_that.id,_that.name,_that.files,_that.bytes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  int files,  int bytes)?  $default,) {final _that = this;
switch (_that) {
case _FolderUsage() when $default != null:
return $default(_that.id,_that.name,_that.files,_that.bytes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FolderUsage implements FolderUsage {
  const _FolderUsage({required this.id, required this.name, required this.files, required this.bytes});
  factory _FolderUsage.fromJson(Map<String, dynamic> json) => _$FolderUsageFromJson(json);

@override final  String id;
@override final  String name;
@override final  int files;
@override final  int bytes;

/// Create a copy of FolderUsage
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FolderUsageCopyWith<_FolderUsage> get copyWith => __$FolderUsageCopyWithImpl<_FolderUsage>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FolderUsageToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FolderUsage&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.files, files) || other.files == files)&&(identical(other.bytes, bytes) || other.bytes == bytes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,files,bytes);
}

@override
String toString() {
    return 'FolderUsage(id: $id, name: $name, files: $files, bytes: $bytes)';
}


}

/// @nodoc
abstract mixin class _$FolderUsageCopyWith<$Res> implements $FolderUsageCopyWith<$Res> {
  factory _$FolderUsageCopyWith(_FolderUsage value, $Res Function(_FolderUsage) _then) = __$FolderUsageCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, int files, int bytes
});




}
/// @nodoc
class __$FolderUsageCopyWithImpl<$Res>
    implements _$FolderUsageCopyWith<$Res> {
  __$FolderUsageCopyWithImpl(this._self, this._then);

  final _FolderUsage _self;
  final $Res Function(_FolderUsage) _then;

/// Create a copy of FolderUsage
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? files = null,Object? bytes = null,}) {
  return _then(_FolderUsage(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$InsightFile {

 String get id; String get name; LibraryCategory? get category; int get sizeBytes; DateTime get updatedAt;
/// Create a copy of InsightFile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InsightFileCopyWith<InsightFile> get copyWith => _$InsightFileCopyWithImpl<InsightFile>(this as InsightFile, _$identity);

  /// Serializes this InsightFile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as InsightFile;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InsightFile&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.sizeBytes, _this.sizeBytes) || other.sizeBytes == _this.sizeBytes)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as InsightFile;
  return Object.hash(runtimeType,_this.id,_this.name,_this.category,_this.sizeBytes,_this.updatedAt);
}

@override
String toString() {
  final _this = this as InsightFile;
  return 'InsightFile(id: ${_this.id}, name: ${_this.name}, category: ${_this.category}, sizeBytes: ${_this.sizeBytes}, updatedAt: ${_this.updatedAt})';
}


}

/// @nodoc
abstract mixin class $InsightFileCopyWith<$Res>  {
  factory $InsightFileCopyWith(InsightFile value, $Res Function(InsightFile) _then) = _$InsightFileCopyWithImpl;
@useResult
$Res call({
 String id, String name, LibraryCategory? category, int sizeBytes, DateTime updatedAt
});




}
/// @nodoc
class _$InsightFileCopyWithImpl<$Res>
    implements $InsightFileCopyWith<$Res> {
  _$InsightFileCopyWithImpl(this._self, this._then);

  final InsightFile _self;
  final $Res Function(InsightFile) _then;

/// Create a copy of InsightFile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? category = freezed,Object? sizeBytes = null,Object? updatedAt = null,}) {
  return _then(InsightFile(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory?,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [InsightFile].
extension InsightFilePatterns on InsightFile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InsightFile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InsightFile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InsightFile value)  $default,){
final _that = this;
switch (_that) {
case _InsightFile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InsightFile value)?  $default,){
final _that = this;
switch (_that) {
case _InsightFile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  LibraryCategory? category,  int sizeBytes,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InsightFile() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.sizeBytes,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  LibraryCategory? category,  int sizeBytes,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _InsightFile():
return $default(_that.id,_that.name,_that.category,_that.sizeBytes,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  LibraryCategory? category,  int sizeBytes,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _InsightFile() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.sizeBytes,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InsightFile implements InsightFile {
  const _InsightFile({required this.id, required this.name, required this.category, required this.sizeBytes, required this.updatedAt});
  factory _InsightFile.fromJson(Map<String, dynamic> json) => _$InsightFileFromJson(json);

@override final  String id;
@override final  String name;
@override final  LibraryCategory? category;
@override final  int sizeBytes;
@override final  DateTime updatedAt;

/// Create a copy of InsightFile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InsightFileCopyWith<_InsightFile> get copyWith => __$InsightFileCopyWithImpl<_InsightFile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InsightFileToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _InsightFile&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.category, category) || other.category == category)&&(identical(other.sizeBytes, sizeBytes) || other.sizeBytes == sizeBytes)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,category,sizeBytes,updatedAt);
}

@override
String toString() {
    return 'InsightFile(id: $id, name: $name, category: $category, sizeBytes: $sizeBytes, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$InsightFileCopyWith<$Res> implements $InsightFileCopyWith<$Res> {
  factory _$InsightFileCopyWith(_InsightFile value, $Res Function(_InsightFile) _then) = __$InsightFileCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, LibraryCategory? category, int sizeBytes, DateTime updatedAt
});




}
/// @nodoc
class __$InsightFileCopyWithImpl<$Res>
    implements _$InsightFileCopyWith<$Res> {
  __$InsightFileCopyWithImpl(this._self, this._then);

  final _InsightFile _self;
  final $Res Function(_InsightFile) _then;

/// Create a copy of InsightFile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? category = freezed,Object? sizeBytes = null,Object? updatedAt = null,}) {
  return _then(_InsightFile(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as LibraryCategory?,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$DuplicateGroup {

 String get fingerprint; int get sizeBytes; int get wastedBytes; List<InsightFile> get files;
/// Create a copy of DuplicateGroup
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DuplicateGroupCopyWith<DuplicateGroup> get copyWith => _$DuplicateGroupCopyWithImpl<DuplicateGroup>(this as DuplicateGroup, _$identity);

  /// Serializes this DuplicateGroup to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DuplicateGroup;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DuplicateGroup&&(identical(other.fingerprint, _this.fingerprint) || other.fingerprint == _this.fingerprint)&&(identical(other.sizeBytes, _this.sizeBytes) || other.sizeBytes == _this.sizeBytes)&&(identical(other.wastedBytes, _this.wastedBytes) || other.wastedBytes == _this.wastedBytes)&&const DeepCollectionEquality().equals(other.files, _this.files));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DuplicateGroup;
  return Object.hash(runtimeType,_this.fingerprint,_this.sizeBytes,_this.wastedBytes,const DeepCollectionEquality().hash(_this.files));
}

@override
String toString() {
  final _this = this as DuplicateGroup;
  return 'DuplicateGroup(fingerprint: ${_this.fingerprint}, sizeBytes: ${_this.sizeBytes}, wastedBytes: ${_this.wastedBytes}, files: ${_this.files})';
}


}

/// @nodoc
abstract mixin class $DuplicateGroupCopyWith<$Res>  {
  factory $DuplicateGroupCopyWith(DuplicateGroup value, $Res Function(DuplicateGroup) _then) = _$DuplicateGroupCopyWithImpl;
@useResult
$Res call({
 String fingerprint, int sizeBytes, int wastedBytes, List<InsightFile> files
});




}
/// @nodoc
class _$DuplicateGroupCopyWithImpl<$Res>
    implements $DuplicateGroupCopyWith<$Res> {
  _$DuplicateGroupCopyWithImpl(this._self, this._then);

  final DuplicateGroup _self;
  final $Res Function(DuplicateGroup) _then;

/// Create a copy of DuplicateGroup
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? fingerprint = null,Object? sizeBytes = null,Object? wastedBytes = null,Object? files = null,}) {
  return _then(DuplicateGroup(
fingerprint: null == fingerprint ? _self.fingerprint : fingerprint // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,wastedBytes: null == wastedBytes ? _self.wastedBytes : wastedBytes // ignore: cast_nullable_to_non_nullable
as int,files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as List<InsightFile>,
  ));
}

}


/// Adds pattern-matching-related methods to [DuplicateGroup].
extension DuplicateGroupPatterns on DuplicateGroup {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DuplicateGroup value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DuplicateGroup() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DuplicateGroup value)  $default,){
final _that = this;
switch (_that) {
case _DuplicateGroup():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DuplicateGroup value)?  $default,){
final _that = this;
switch (_that) {
case _DuplicateGroup() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String fingerprint,  int sizeBytes,  int wastedBytes,  List<InsightFile> files)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DuplicateGroup() when $default != null:
return $default(_that.fingerprint,_that.sizeBytes,_that.wastedBytes,_that.files);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String fingerprint,  int sizeBytes,  int wastedBytes,  List<InsightFile> files)  $default,) {final _that = this;
switch (_that) {
case _DuplicateGroup():
return $default(_that.fingerprint,_that.sizeBytes,_that.wastedBytes,_that.files);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String fingerprint,  int sizeBytes,  int wastedBytes,  List<InsightFile> files)?  $default,) {final _that = this;
switch (_that) {
case _DuplicateGroup() when $default != null:
return $default(_that.fingerprint,_that.sizeBytes,_that.wastedBytes,_that.files);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DuplicateGroup implements DuplicateGroup {
  const _DuplicateGroup({required this.fingerprint, required this.sizeBytes, required this.wastedBytes, required  List<InsightFile> files}): _files = files;
  factory _DuplicateGroup.fromJson(Map<String, dynamic> json) => _$DuplicateGroupFromJson(json);

@override final  String fingerprint;
@override final  int sizeBytes;
@override final  int wastedBytes;
 final  List<InsightFile> _files;
@override List<InsightFile> get files {
  if (_files is EqualUnmodifiableListView) return _files;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_files);
}


/// Create a copy of DuplicateGroup
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DuplicateGroupCopyWith<_DuplicateGroup> get copyWith => __$DuplicateGroupCopyWithImpl<_DuplicateGroup>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DuplicateGroupToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DuplicateGroup&&(identical(other.fingerprint, fingerprint) || other.fingerprint == fingerprint)&&(identical(other.sizeBytes, sizeBytes) || other.sizeBytes == sizeBytes)&&(identical(other.wastedBytes, wastedBytes) || other.wastedBytes == wastedBytes)&&const DeepCollectionEquality().equals(other.files, _files));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,fingerprint,sizeBytes,wastedBytes,const DeepCollectionEquality().hash(_files));
}

@override
String toString() {
    return 'DuplicateGroup(fingerprint: $fingerprint, sizeBytes: $sizeBytes, wastedBytes: $wastedBytes, files: $files)';
}


}

/// @nodoc
abstract mixin class _$DuplicateGroupCopyWith<$Res> implements $DuplicateGroupCopyWith<$Res> {
  factory _$DuplicateGroupCopyWith(_DuplicateGroup value, $Res Function(_DuplicateGroup) _then) = __$DuplicateGroupCopyWithImpl;
@override @useResult
$Res call({
 String fingerprint, int sizeBytes, int wastedBytes, List<InsightFile> files
});




}
/// @nodoc
class __$DuplicateGroupCopyWithImpl<$Res>
    implements _$DuplicateGroupCopyWith<$Res> {
  __$DuplicateGroupCopyWithImpl(this._self, this._then);

  final _DuplicateGroup _self;
  final $Res Function(_DuplicateGroup) _then;

/// Create a copy of DuplicateGroup
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? fingerprint = null,Object? sizeBytes = null,Object? wastedBytes = null,Object? files = null,}) {
  return _then(_DuplicateGroup(
fingerprint: null == fingerprint ? _self.fingerprint : fingerprint // ignore: cast_nullable_to_non_nullable
as String,sizeBytes: null == sizeBytes ? _self.sizeBytes : sizeBytes // ignore: cast_nullable_to_non_nullable
as int,wastedBytes: null == wastedBytes ? _self.wastedBytes : wastedBytes // ignore: cast_nullable_to_non_nullable
as int,files: null == files ? _self._files : files // ignore: cast_nullable_to_non_nullable
as List<InsightFile>,
  ));
}


}


/// @nodoc
mixin _$InsightTotals {

 int get files; int get folders; int get bytes; int get trashedFiles; int get trashedFolders; int get trashedBytes; int get versions; int get versionBytes; int get tags;
/// Create a copy of InsightTotals
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InsightTotalsCopyWith<InsightTotals> get copyWith => _$InsightTotalsCopyWithImpl<InsightTotals>(this as InsightTotals, _$identity);

  /// Serializes this InsightTotals to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as InsightTotals;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InsightTotals&&(identical(other.files, _this.files) || other.files == _this.files)&&(identical(other.folders, _this.folders) || other.folders == _this.folders)&&(identical(other.bytes, _this.bytes) || other.bytes == _this.bytes)&&(identical(other.trashedFiles, _this.trashedFiles) || other.trashedFiles == _this.trashedFiles)&&(identical(other.trashedFolders, _this.trashedFolders) || other.trashedFolders == _this.trashedFolders)&&(identical(other.trashedBytes, _this.trashedBytes) || other.trashedBytes == _this.trashedBytes)&&(identical(other.versions, _this.versions) || other.versions == _this.versions)&&(identical(other.versionBytes, _this.versionBytes) || other.versionBytes == _this.versionBytes)&&(identical(other.tags, _this.tags) || other.tags == _this.tags));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as InsightTotals;
  return Object.hash(runtimeType,_this.files,_this.folders,_this.bytes,_this.trashedFiles,_this.trashedFolders,_this.trashedBytes,_this.versions,_this.versionBytes,_this.tags);
}

@override
String toString() {
  final _this = this as InsightTotals;
  return 'InsightTotals(files: ${_this.files}, folders: ${_this.folders}, bytes: ${_this.bytes}, trashedFiles: ${_this.trashedFiles}, trashedFolders: ${_this.trashedFolders}, trashedBytes: ${_this.trashedBytes}, versions: ${_this.versions}, versionBytes: ${_this.versionBytes}, tags: ${_this.tags})';
}


}

/// @nodoc
abstract mixin class $InsightTotalsCopyWith<$Res>  {
  factory $InsightTotalsCopyWith(InsightTotals value, $Res Function(InsightTotals) _then) = _$InsightTotalsCopyWithImpl;
@useResult
$Res call({
 int files, int folders, int bytes, int trashedFiles, int trashedFolders, int trashedBytes, int versions, int versionBytes, int tags
});




}
/// @nodoc
class _$InsightTotalsCopyWithImpl<$Res>
    implements $InsightTotalsCopyWith<$Res> {
  _$InsightTotalsCopyWithImpl(this._self, this._then);

  final InsightTotals _self;
  final $Res Function(InsightTotals) _then;

/// Create a copy of InsightTotals
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? files = null,Object? folders = null,Object? bytes = null,Object? trashedFiles = null,Object? trashedFolders = null,Object? trashedBytes = null,Object? versions = null,Object? versionBytes = null,Object? tags = null,}) {
  return _then(InsightTotals(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,trashedFiles: null == trashedFiles ? _self.trashedFiles : trashedFiles // ignore: cast_nullable_to_non_nullable
as int,trashedFolders: null == trashedFolders ? _self.trashedFolders : trashedFolders // ignore: cast_nullable_to_non_nullable
as int,trashedBytes: null == trashedBytes ? _self.trashedBytes : trashedBytes // ignore: cast_nullable_to_non_nullable
as int,versions: null == versions ? _self.versions : versions // ignore: cast_nullable_to_non_nullable
as int,versionBytes: null == versionBytes ? _self.versionBytes : versionBytes // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [InsightTotals].
extension InsightTotalsPatterns on InsightTotals {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InsightTotals value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InsightTotals() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InsightTotals value)  $default,){
final _that = this;
switch (_that) {
case _InsightTotals():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InsightTotals value)?  $default,){
final _that = this;
switch (_that) {
case _InsightTotals() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes,  int trashedFiles,  int trashedFolders,  int trashedBytes,  int versions,  int versionBytes,  int tags)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InsightTotals() when $default != null:
return $default(_that.files,_that.folders,_that.bytes,_that.trashedFiles,_that.trashedFolders,_that.trashedBytes,_that.versions,_that.versionBytes,_that.tags);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int files,  int folders,  int bytes,  int trashedFiles,  int trashedFolders,  int trashedBytes,  int versions,  int versionBytes,  int tags)  $default,) {final _that = this;
switch (_that) {
case _InsightTotals():
return $default(_that.files,_that.folders,_that.bytes,_that.trashedFiles,_that.trashedFolders,_that.trashedBytes,_that.versions,_that.versionBytes,_that.tags);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int files,  int folders,  int bytes,  int trashedFiles,  int trashedFolders,  int trashedBytes,  int versions,  int versionBytes,  int tags)?  $default,) {final _that = this;
switch (_that) {
case _InsightTotals() when $default != null:
return $default(_that.files,_that.folders,_that.bytes,_that.trashedFiles,_that.trashedFolders,_that.trashedBytes,_that.versions,_that.versionBytes,_that.tags);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _InsightTotals implements InsightTotals {
  const _InsightTotals({required this.files, required this.folders, required this.bytes, required this.trashedFiles, required this.trashedFolders, required this.trashedBytes, required this.versions, required this.versionBytes, required this.tags});
  factory _InsightTotals.fromJson(Map<String, dynamic> json) => _$InsightTotalsFromJson(json);

@override final  int files;
@override final  int folders;
@override final  int bytes;
@override final  int trashedFiles;
@override final  int trashedFolders;
@override final  int trashedBytes;
@override final  int versions;
@override final  int versionBytes;
@override final  int tags;

/// Create a copy of InsightTotals
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InsightTotalsCopyWith<_InsightTotals> get copyWith => __$InsightTotalsCopyWithImpl<_InsightTotals>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$InsightTotalsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _InsightTotals&&(identical(other.files, files) || other.files == files)&&(identical(other.folders, folders) || other.folders == folders)&&(identical(other.bytes, bytes) || other.bytes == bytes)&&(identical(other.trashedFiles, trashedFiles) || other.trashedFiles == trashedFiles)&&(identical(other.trashedFolders, trashedFolders) || other.trashedFolders == trashedFolders)&&(identical(other.trashedBytes, trashedBytes) || other.trashedBytes == trashedBytes)&&(identical(other.versions, versions) || other.versions == versions)&&(identical(other.versionBytes, versionBytes) || other.versionBytes == versionBytes)&&(identical(other.tags, tags) || other.tags == tags));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,files,folders,bytes,trashedFiles,trashedFolders,trashedBytes,versions,versionBytes,tags);
}

@override
String toString() {
    return 'InsightTotals(files: $files, folders: $folders, bytes: $bytes, trashedFiles: $trashedFiles, trashedFolders: $trashedFolders, trashedBytes: $trashedBytes, versions: $versions, versionBytes: $versionBytes, tags: $tags)';
}


}

/// @nodoc
abstract mixin class _$InsightTotalsCopyWith<$Res> implements $InsightTotalsCopyWith<$Res> {
  factory _$InsightTotalsCopyWith(_InsightTotals value, $Res Function(_InsightTotals) _then) = __$InsightTotalsCopyWithImpl;
@override @useResult
$Res call({
 int files, int folders, int bytes, int trashedFiles, int trashedFolders, int trashedBytes, int versions, int versionBytes, int tags
});




}
/// @nodoc
class __$InsightTotalsCopyWithImpl<$Res>
    implements _$InsightTotalsCopyWith<$Res> {
  __$InsightTotalsCopyWithImpl(this._self, this._then);

  final _InsightTotals _self;
  final $Res Function(_InsightTotals) _then;

/// Create a copy of InsightTotals
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? files = null,Object? folders = null,Object? bytes = null,Object? trashedFiles = null,Object? trashedFolders = null,Object? trashedBytes = null,Object? versions = null,Object? versionBytes = null,Object? tags = null,}) {
  return _then(_InsightTotals(
files: null == files ? _self.files : files // ignore: cast_nullable_to_non_nullable
as int,folders: null == folders ? _self.folders : folders // ignore: cast_nullable_to_non_nullable
as int,bytes: null == bytes ? _self.bytes : bytes // ignore: cast_nullable_to_non_nullable
as int,trashedFiles: null == trashedFiles ? _self.trashedFiles : trashedFiles // ignore: cast_nullable_to_non_nullable
as int,trashedFolders: null == trashedFolders ? _self.trashedFolders : trashedFolders // ignore: cast_nullable_to_non_nullable
as int,trashedBytes: null == trashedBytes ? _self.trashedBytes : trashedBytes // ignore: cast_nullable_to_non_nullable
as int,versions: null == versions ? _self.versions : versions // ignore: cast_nullable_to_non_nullable
as int,versionBytes: null == versionBytes ? _self.versionBytes : versionBytes // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$StorageInsightsResponse {

 InsightTotals get totals; List<CategorySummary> get categories; List<InsightFile> get largestFiles; List<FolderUsage> get largestFolders; List<DuplicateGroup> get duplicateGroups; DateTime get generatedAt;
/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StorageInsightsResponseCopyWith<StorageInsightsResponse> get copyWith => _$StorageInsightsResponseCopyWithImpl<StorageInsightsResponse>(this as StorageInsightsResponse, _$identity);

  /// Serializes this StorageInsightsResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StorageInsightsResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StorageInsightsResponse&&(identical(other.totals, _this.totals) || other.totals == _this.totals)&&const DeepCollectionEquality().equals(other.categories, _this.categories)&&const DeepCollectionEquality().equals(other.largestFiles, _this.largestFiles)&&const DeepCollectionEquality().equals(other.largestFolders, _this.largestFolders)&&const DeepCollectionEquality().equals(other.duplicateGroups, _this.duplicateGroups)&&(identical(other.generatedAt, _this.generatedAt) || other.generatedAt == _this.generatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StorageInsightsResponse;
  return Object.hash(runtimeType,_this.totals,const DeepCollectionEquality().hash(_this.categories),const DeepCollectionEquality().hash(_this.largestFiles),const DeepCollectionEquality().hash(_this.largestFolders),const DeepCollectionEquality().hash(_this.duplicateGroups),_this.generatedAt);
}

@override
String toString() {
  final _this = this as StorageInsightsResponse;
  return 'StorageInsightsResponse(totals: ${_this.totals}, categories: ${_this.categories}, largestFiles: ${_this.largestFiles}, largestFolders: ${_this.largestFolders}, duplicateGroups: ${_this.duplicateGroups}, generatedAt: ${_this.generatedAt})';
}


}

/// @nodoc
abstract mixin class $StorageInsightsResponseCopyWith<$Res>  {
  factory $StorageInsightsResponseCopyWith(StorageInsightsResponse value, $Res Function(StorageInsightsResponse) _then) = _$StorageInsightsResponseCopyWithImpl;
@useResult
$Res call({
 InsightTotals totals, List<CategorySummary> categories, List<InsightFile> largestFiles, List<FolderUsage> largestFolders, List<DuplicateGroup> duplicateGroups, DateTime generatedAt
});


$InsightTotalsCopyWith<$Res> get totals;

}
/// @nodoc
class _$StorageInsightsResponseCopyWithImpl<$Res>
    implements $StorageInsightsResponseCopyWith<$Res> {
  _$StorageInsightsResponseCopyWithImpl(this._self, this._then);

  final StorageInsightsResponse _self;
  final $Res Function(StorageInsightsResponse) _then;

/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? totals = null,Object? categories = null,Object? largestFiles = null,Object? largestFolders = null,Object? duplicateGroups = null,Object? generatedAt = null,}) {
  return _then(StorageInsightsResponse(
totals: null == totals ? _self.totals : totals // ignore: cast_nullable_to_non_nullable
as InsightTotals,categories: null == categories ? _self.categories : categories // ignore: cast_nullable_to_non_nullable
as List<CategorySummary>,largestFiles: null == largestFiles ? _self.largestFiles : largestFiles // ignore: cast_nullable_to_non_nullable
as List<InsightFile>,largestFolders: null == largestFolders ? _self.largestFolders : largestFolders // ignore: cast_nullable_to_non_nullable
as List<FolderUsage>,duplicateGroups: null == duplicateGroups ? _self.duplicateGroups : duplicateGroups // ignore: cast_nullable_to_non_nullable
as List<DuplicateGroup>,generatedAt: null == generatedAt ? _self.generatedAt : generatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}
/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InsightTotalsCopyWith<$Res> get totals {
  
  return $InsightTotalsCopyWith<$Res>(_self.totals, (value) {
    return _then(_self.copyWith(totals: value));
  });
}
}


/// Adds pattern-matching-related methods to [StorageInsightsResponse].
extension StorageInsightsResponsePatterns on StorageInsightsResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StorageInsightsResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StorageInsightsResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StorageInsightsResponse value)  $default,){
final _that = this;
switch (_that) {
case _StorageInsightsResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StorageInsightsResponse value)?  $default,){
final _that = this;
switch (_that) {
case _StorageInsightsResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( InsightTotals totals,  List<CategorySummary> categories,  List<InsightFile> largestFiles,  List<FolderUsage> largestFolders,  List<DuplicateGroup> duplicateGroups,  DateTime generatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StorageInsightsResponse() when $default != null:
return $default(_that.totals,_that.categories,_that.largestFiles,_that.largestFolders,_that.duplicateGroups,_that.generatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( InsightTotals totals,  List<CategorySummary> categories,  List<InsightFile> largestFiles,  List<FolderUsage> largestFolders,  List<DuplicateGroup> duplicateGroups,  DateTime generatedAt)  $default,) {final _that = this;
switch (_that) {
case _StorageInsightsResponse():
return $default(_that.totals,_that.categories,_that.largestFiles,_that.largestFolders,_that.duplicateGroups,_that.generatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( InsightTotals totals,  List<CategorySummary> categories,  List<InsightFile> largestFiles,  List<FolderUsage> largestFolders,  List<DuplicateGroup> duplicateGroups,  DateTime generatedAt)?  $default,) {final _that = this;
switch (_that) {
case _StorageInsightsResponse() when $default != null:
return $default(_that.totals,_that.categories,_that.largestFiles,_that.largestFolders,_that.duplicateGroups,_that.generatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StorageInsightsResponse implements StorageInsightsResponse {
  const _StorageInsightsResponse({required this.totals, required  List<CategorySummary> categories, required  List<InsightFile> largestFiles, required  List<FolderUsage> largestFolders, required  List<DuplicateGroup> duplicateGroups, required this.generatedAt}): _categories = categories,_largestFiles = largestFiles,_largestFolders = largestFolders,_duplicateGroups = duplicateGroups;
  factory _StorageInsightsResponse.fromJson(Map<String, dynamic> json) => _$StorageInsightsResponseFromJson(json);

@override final  InsightTotals totals;
 final  List<CategorySummary> _categories;
@override List<CategorySummary> get categories {
  if (_categories is EqualUnmodifiableListView) return _categories;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_categories);
}

 final  List<InsightFile> _largestFiles;
@override List<InsightFile> get largestFiles {
  if (_largestFiles is EqualUnmodifiableListView) return _largestFiles;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_largestFiles);
}

 final  List<FolderUsage> _largestFolders;
@override List<FolderUsage> get largestFolders {
  if (_largestFolders is EqualUnmodifiableListView) return _largestFolders;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_largestFolders);
}

 final  List<DuplicateGroup> _duplicateGroups;
@override List<DuplicateGroup> get duplicateGroups {
  if (_duplicateGroups is EqualUnmodifiableListView) return _duplicateGroups;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_duplicateGroups);
}

@override final  DateTime generatedAt;

/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StorageInsightsResponseCopyWith<_StorageInsightsResponse> get copyWith => __$StorageInsightsResponseCopyWithImpl<_StorageInsightsResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StorageInsightsResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StorageInsightsResponse&&(identical(other.totals, totals) || other.totals == totals)&&const DeepCollectionEquality().equals(other.categories, _categories)&&const DeepCollectionEquality().equals(other.largestFiles, _largestFiles)&&const DeepCollectionEquality().equals(other.largestFolders, _largestFolders)&&const DeepCollectionEquality().equals(other.duplicateGroups, _duplicateGroups)&&(identical(other.generatedAt, generatedAt) || other.generatedAt == generatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,totals,const DeepCollectionEquality().hash(_categories),const DeepCollectionEquality().hash(_largestFiles),const DeepCollectionEquality().hash(_largestFolders),const DeepCollectionEquality().hash(_duplicateGroups),generatedAt);
}

@override
String toString() {
    return 'StorageInsightsResponse(totals: $totals, categories: $categories, largestFiles: $largestFiles, largestFolders: $largestFolders, duplicateGroups: $duplicateGroups, generatedAt: $generatedAt)';
}


}

/// @nodoc
abstract mixin class _$StorageInsightsResponseCopyWith<$Res> implements $StorageInsightsResponseCopyWith<$Res> {
  factory _$StorageInsightsResponseCopyWith(_StorageInsightsResponse value, $Res Function(_StorageInsightsResponse) _then) = __$StorageInsightsResponseCopyWithImpl;
@override @useResult
$Res call({
 InsightTotals totals, List<CategorySummary> categories, List<InsightFile> largestFiles, List<FolderUsage> largestFolders, List<DuplicateGroup> duplicateGroups, DateTime generatedAt
});


@override $InsightTotalsCopyWith<$Res> get totals;

}
/// @nodoc
class __$StorageInsightsResponseCopyWithImpl<$Res>
    implements _$StorageInsightsResponseCopyWith<$Res> {
  __$StorageInsightsResponseCopyWithImpl(this._self, this._then);

  final _StorageInsightsResponse _self;
  final $Res Function(_StorageInsightsResponse) _then;

/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? totals = null,Object? categories = null,Object? largestFiles = null,Object? largestFolders = null,Object? duplicateGroups = null,Object? generatedAt = null,}) {
  return _then(_StorageInsightsResponse(
totals: null == totals ? _self.totals : totals // ignore: cast_nullable_to_non_nullable
as InsightTotals,categories: null == categories ? _self._categories : categories // ignore: cast_nullable_to_non_nullable
as List<CategorySummary>,largestFiles: null == largestFiles ? _self._largestFiles : largestFiles // ignore: cast_nullable_to_non_nullable
as List<InsightFile>,largestFolders: null == largestFolders ? _self._largestFolders : largestFolders // ignore: cast_nullable_to_non_nullable
as List<FolderUsage>,duplicateGroups: null == duplicateGroups ? _self._duplicateGroups : duplicateGroups // ignore: cast_nullable_to_non_nullable
as List<DuplicateGroup>,generatedAt: null == generatedAt ? _self.generatedAt : generatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

/// Create a copy of StorageInsightsResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$InsightTotalsCopyWith<$Res> get totals {
  
  return $InsightTotalsCopyWith<$Res>(_self.totals, (value) {
    return _then(_self.copyWith(totals: value));
  });
}
}

// dart format on
