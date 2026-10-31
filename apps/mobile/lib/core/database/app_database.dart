import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

/// Cached cloud metadata. One database file per account (see
/// `AppDatabase.forAccount`), so a second account can never read the first's
/// rows even if a query forgets a filter.
class CachedFiles extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get extension => text().nullable()();
  TextColumn get mimeType => text()();
  IntColumn get sizeBytes => integer()();
  TextColumn get category => text()();
  BoolColumn get favorite => boolean()();
  TextColumn get description => text().nullable()();
  TextColumn get folderId => text().nullable()();
  TextColumn get folderName => text().nullable()();
  TextColumn get contentStatus => text()();
  TextColumn get tagsJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class CachedFolders extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get parentFolderId => text().nullable()();
  IntColumn get fileCount => integer()();
  IntColumn get folderCount => integer()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

class CachedTags extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get colorToken => text().nullable()();
  IntColumn get fileCount => integer()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// The library summary plus the freshness metadata for the whole cache.
/// A single row (`id = 1`) keeps the timestamp atomic with the snapshot.
class CachedSummaries extends Table {
  IntColumn get id => integer()();
  TextColumn get payload => text()();
  DateTimeColumn get syncedAt => dateTime()();
  BoolColumn get truncated => boolean().withDefault(const Constant(false))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

@DriftDatabase(
  tables: [CachedFiles, CachedFolders, CachedTags, CachedSummaries],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.executor);

  /// Opens the account's own cache file under application support. A signed-in
  /// account id is a UUID, so it is safe as a directory name and cannot collide
  /// with another account.
  AppDatabase.forAccount(String accountId)
    : super(_openAccountDatabase(accountId));

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (migrator) async {
        await migrator.createAll();
      },
    );
  }
}

QueryExecutor _openAccountDatabase(String accountId) {
  return LazyDatabase(() async {
    final support = await getApplicationSupportDirectory();
    final file = File(
      p.join(
        support.path,
        'stackbase',
        'account-$accountId',
        'library.sqlite',
      ),
    );
    await file.parent.create(recursive: true);
    return NativeDatabase.createInBackground(file);
  });
}
