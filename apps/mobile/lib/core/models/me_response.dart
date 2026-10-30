import 'package:freezed_annotation/freezed_annotation.dart';

import 'auth_user.dart';
import 'user_settings.dart';

part 'me_response.freezed.dart';
part 'me_response.g.dart';

@freezed
abstract class MeResponse with _$MeResponse {
  const factory MeResponse({
    required AuthUser user,
    required UserSettings settings,
  }) = _MeResponse;

  factory MeResponse.fromJson(Map<String, dynamic> json) =>
      _$MeResponseFromJson(json);
}
