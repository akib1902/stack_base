import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/api/api_client.dart';
import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/database/app_database.dart';
import 'package:stackbase_mobile/features/cloud_files/data/cloud_library_repository.dart';

import '../support/fixtures.dart';
import '../support/library_fixtures.dart';
import '../support/scripted_http_adapter.dart';

void main() {
  late AppDatabase database;

  setUp(() {
    database = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await database.close();
  });

  (ApiClient, ScriptedHttpAdapter) clientWith(
    List<ScriptedReply> replies,
  ) {
    final config = testConfig(api: 'https://api.example.test');
    final dio = Dio(BaseOptions(baseUrl: config.apiV1Base.toString()));
    final adapter = ScriptedHttpAdapter(replies);
    dio.httpClientAdapter = adapter;
    return (ApiClient(dio: dio, config: config), adapter);
  }

  test('refresh pages through files and stores one atomic snapshot', () async {
    final (api, adapter) = clientWith([
      ScriptedReply(200, {
        'items': [folderJson()],
      }),
      ScriptedReply(200, {
        'items': [tagListItemJson()],
      }),
      ScriptedReply(200, summaryJson()),
      ScriptedReply(
        200,
        fileListJson(
          items: [fileJson(id: 'f-1')],
          total: 2,
          offset: 0,
          hasMore: true,
        ),
      ),
      ScriptedReply(
        200,
        fileListJson(
          items: [fileJson(id: 'f-2', name: 'Second.pdf')],
          total: 2,
          offset: 1,
          hasMore: false,
        ),
      ),
    ]);
    final repository = CloudLibraryRepository(
      api: api,
      database: database,
      clock: () => fixtureNow,
    );

    final cache = await repository.refresh();

    expect(cache.files.map((file) => file.id), ['f-1', 'f-2']);
    expect(cache.folders.single.name, 'Receipts');
    expect(cache.tags.single.name, 'Work');
    expect(cache.syncedAt, fixtureNow);
    expect(cache.truncated, isFalse);
    expect(cache.summary.totals.files, 2);

    expect(adapter.requests, hasLength(5));
    final fileRequests = adapter.requests
        .where((request) => request.path == 'files')
        .toList();
    expect(fileRequests, hasLength(2));
    expect(fileRequests[0].queryParameters['limit'], '100');
    expect(fileRequests[0].queryParameters['offset'], '0');
    expect(fileRequests[1].queryParameters['offset'], '1');

    final stored = await repository.readCache();
    expect(stored, isNotNull);
    expect(stored!.files, hasLength(2));
    expect(stored.files.last.name, 'Second.pdf');
    expect(stored.files.first.tags.single.name, 'Work');
    expect(stored.syncedAt, fixtureNow);
  });

  test('a failed refresh throws and leaves the previous cache intact', () async {
    final (api, _) = clientWith([
      ScriptedReply(200, {
        'items': [folderJson()],
      }),
      ScriptedReply(200, {
        'items': [tagListItemJson()],
      }),
      ScriptedReply(200, summaryJson()),
      ScriptedReply(
        200,
        fileListJson(
          items: [fileJson()],
          total: 1,
          offset: 0,
          hasMore: false,
        ),
      ),
    ]);
    final repository = CloudLibraryRepository(
      api: api,
      database: database,
      clock: () => fixtureNow,
    );
    await repository.refresh();

    final (failingApi, _) = clientWith([
      const ScriptedReply(400, {
        'error': {'code': 'VALIDATION_ERROR', 'message': 'Nope.'},
      }),
    ]);
    final failingRepository = CloudLibraryRepository(
      api: failingApi,
      database: database,
      clock: () => fixtureNow,
    );

    await expectLater(
      failingRepository.refresh(),
      throwsA(
        isA<ApiException>().having(
          (error) => error.code,
          'code',
          'VALIDATION_ERROR',
        ),
      ),
    );

    final stored = await failingRepository.readCache();
    expect(stored, isNotNull);
    expect(stored!.files, hasLength(1));
    expect(stored.syncedAt, fixtureNow);
  });

  test('two account databases never share cached rows', () async {
    final second = AppDatabase(NativeDatabase.memory());
    addTearDown(second.close);

    final (api, _) = clientWith([
      ScriptedReply(200, {
        'items': [folderJson()],
      }),
      ScriptedReply(200, {
        'items': [tagListItemJson()],
      }),
      ScriptedReply(200, summaryJson()),
      ScriptedReply(
        200,
        fileListJson(
          items: [fileJson()],
          total: 1,
          offset: 0,
          hasMore: false,
        ),
      ),
    ]);

    final firstRepository = CloudLibraryRepository(
      api: api,
      database: database,
      clock: () => fixtureNow,
    );
    final secondRepository = CloudLibraryRepository(
      api: api,
      database: second,
      clock: () => fixtureNow,
    );

    await firstRepository.refresh();

    expect(await firstRepository.readCache(), isNotNull);
    expect(await secondRepository.readCache(), isNull);
  });

  test('clear removes every cached row', () async {
    final (api, _) = clientWith([
      ScriptedReply(200, {
        'items': [folderJson()],
      }),
      ScriptedReply(200, {
        'items': [tagListItemJson()],
      }),
      ScriptedReply(200, summaryJson()),
      ScriptedReply(
        200,
        fileListJson(
          items: [fileJson()],
          total: 1,
          offset: 0,
          hasMore: false,
        ),
      ),
    ]);
    final repository = CloudLibraryRepository(
      api: api,
      database: database,
      clock: () => fixtureNow,
    );
    await repository.refresh();

    await repository.clear();

    expect(await repository.readCache(), isNull);
  });
}
