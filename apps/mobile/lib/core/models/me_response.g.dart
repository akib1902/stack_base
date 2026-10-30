// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'me_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MeResponse _$MeResponseFromJson(Map<String, dynamic> json) => _MeResponse(
  user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
  settings: UserSettings.fromJson(json['settings'] as Map<String, dynamic>),
);

Map<String, dynamic> _$MeResponseToJson(_MeResponse instance) =>
    <String, dynamic>{'user': instance.user, 'settings': instance.settings};
