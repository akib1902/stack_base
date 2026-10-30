// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => _AuthUser(
  id: json['id'] as String,
  email: json['email'] as String?,
  displayName: json['displayName'] as String?,
  avatarUrl: json['avatarUrl'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$AuthUserToJson(_AuthUser instance) => <String, dynamic>{
  'id': instance.id,
  'email': instance.email,
  'displayName': instance.displayName,
  'avatarUrl': instance.avatarUrl,
  'createdAt': instance.createdAt.toIso8601String(),
};
