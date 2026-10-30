import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/models/user_settings.dart';

void main() {
  RequestOptions options() => RequestOptions(
    path: '/api/v1/me',
    extra: const {'requestId': 'request-1'},
  );

  group('ApiException.fromDio', () {
    test('reads the stable error envelope and request id', () {
      final error = DioException(
        requestOptions: options(),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: options(),
          statusCode: 401,
          data: {
            'error': {
              'code': 'AUTH_REQUIRED',
              'message': 'Authentication required.',
              'details': {'reason': 'expired'},
            },
          },
        ),
      );

      final api = ApiException.fromDio(error);
      expect(api.code, 'AUTH_REQUIRED');
      expect(api.message, 'Authentication required.');
      expect(api.statusCode, 401);
      expect(api.details, {'reason': 'expired'});
      expect(api.requestId, 'request-1');
      expect(api.isAuthFailure, isTrue);
      expect(api.userMessage, contains('session expired'));
    });

    test('decodes a JSON envelope that arrived as text', () {
      final error = DioException(
        requestOptions: options(),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: options(),
          statusCode: 409,
          data:
              '{"error":{"code":"UPLOAD_STATE_CONFLICT",'
              '"message":"Conflict"}}',
        ),
      );
      expect(ApiException.fromDio(error).code, 'UPLOAD_STATE_CONFLICT');
    });

    test('maps timeouts without exposing transport details', () {
      final api = ApiException.fromDio(
        DioException(
          requestOptions: options(),
          type: DioExceptionType.receiveTimeout,
        ),
      );
      expect(api.code, 'TIMEOUT');
      expect(api.isNetworkFailure, isTrue);
    });

    test('maps connection failures to NETWORK_UNAVAILABLE', () {
      final api = ApiException.fromDio(
        DioException(
          requestOptions: options(),
          type: DioExceptionType.connectionError,
        ),
      );
      expect(api.code, 'NETWORK_UNAVAILABLE');
    });

    test('maps a bare 401 to AUTH_REQUIRED', () {
      final api = ApiException.fromDio(
        DioException(
          requestOptions: options(),
          type: DioExceptionType.badResponse,
          response: Response<dynamic>(
            requestOptions: options(),
            statusCode: 401,
            data: null,
          ),
        ),
      );
      expect(api.code, 'AUTH_REQUIRED');
    });
  });

  group('UserSettingsUpdate', () {
    test('omits absent fields and uses contract enum names', () {
      const update = UserSettingsUpdate(theme: ServerTheme.graphite);
      expect(update.toJson(), {'theme': 'graphite'});
    });

    test('serializes every provided field', () {
      const update = UserSettingsUpdate(
        theme: ServerTheme.amber,
        defaultView: DefaultView.list,
        defaultSort: FileSort.sizeAsc,
        trashRetentionDays: 14,
        offlineEnabled: true,
      );
      expect(update.toJson(), {
        'theme': 'amber',
        'defaultView': 'list',
        'defaultSort': 'size_asc',
        'trashRetentionDays': 14,
        'offlineEnabled': true,
      });
    });
  });
}
