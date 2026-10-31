import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/database/app_database.dart';
import 'package:stackbase_mobile/core/models/library.dart';

void main() {
  test('opens an in-memory library cache and round-trips a file row', () async {
    final db = AppDatabase(NativeDatabase.memory());
    addTearDown(db.close);

    await db
        .into(db.cachedFiles)
        .insert(
          CachedFilesCompanion.insert(
            id: 'file-1',
            name: 'report.pdf',
            extension: const Value('pdf'),
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            category: LibraryCategory.documents.wireValue,
            favorite: false,
            contentStatus: FileContentStatus.ready.name,
            tagsJson: '[]',
            createdAt: DateTime.utc(2026, 10, 1),
            updatedAt: DateTime.utc(2026, 10, 2),
          ),
        );

    final rows = await db.select(db.cachedFiles).get();
    expect(rows, hasLength(1));
    expect(rows.single.name, 'report.pdf');
    expect(rows.single.sizeBytes, 2048);
  });
}
