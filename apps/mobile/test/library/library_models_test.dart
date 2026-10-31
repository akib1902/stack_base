import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/models/library.dart';

import '../support/library_fixtures.dart';

void main() {
  test('parses a file summary and its nested tags', () {
    final file = FileSummary.fromJson(
      fileJson(id: 'f-1', name: 'Report.pdf', favorite: true),
    );

    expect(file.id, 'f-1');
    expect(file.name, 'Report.pdf');
    expect(file.extension, 'pdf');
    expect(file.category, LibraryCategory.documents);
    expect(file.favorite, isTrue);
    expect(file.contentStatus, FileContentStatus.ready);
    expect(file.tags.single.name, 'Work');
    expect(file.createdAt.toUtc(), DateTime.utc(2026, 10, 1, 10));
    expect(file.updatedAt.toUtc(), DateTime.utc(2026, 10, 2, 10));
  });

  test('keeps null folder and description values null', () {
    final file = FileSummary.fromJson(fileJson());
    expect(file.folderId, isNull);
    expect(file.folderName, isNull);
    expect(file.description, isNull);
  });

  test('parses a file list page with pagination fields', () {
    final page = FileListResponse.fromJson(
      fileListJson(
        items: [fileJson(), fileJson(id: 'f-2', name: 'B.pdf')],
        total: 12,
        offset: 0,
        hasMore: true,
      ),
    );

    expect(page.items, hasLength(2));
    expect(page.total, 12);
    expect(page.limit, 100);
    expect(page.hasMore, isTrue);
  });

  test('parses all nine summary categories in server order', () {
    final summary = LibrarySummaryResponse.fromJson(summaryJson());

    expect(summary.totals.files, 2);
    expect(summary.categories, hasLength(LibraryCategory.values.length));
    expect(
      summary.categories.map((category) => category.category).toList(),
      LibraryCategory.values,
    );
    expect(summary.recent.single.name, 'report.pdf');
  });

  test('parses insight totals and duplicate groups', () {
    final insights = StorageInsightsResponse.fromJson({
      'totals': {
        'files': 4,
        'folders': 2,
        'bytes': 8192,
        'trashedFiles': 1,
        'trashedFolders': 0,
        'trashedBytes': 1024,
        'versions': 2,
        'versionBytes': 512,
        'tags': 3,
      },
      'categories': summaryJson()['categories'],
      'largestFiles': [
        {
          'id': 'f-1',
          'name': 'Report.pdf',
          'category': 'documents',
          'sizeBytes': 5000,
          'updatedAt': '2026-10-02T10:00:00.000Z',
        },
        {
          'id': 'f-2',
          'name': 'Unknown.bin',
          'category': null,
          'sizeBytes': 100,
          'updatedAt': '2026-10-02T10:00:00.000Z',
        },
      ],
      'largestFolders': [
        {'id': 'folder-1', 'name': 'Receipts', 'files': 2, 'bytes': 3000},
      ],
      'duplicateGroups': [
        {
          'fingerprint': 'a' * 64,
          'sizeBytes': 5000,
          'wastedBytes': 5000,
          'files': [
            {
              'id': 'f-1',
              'name': 'Report.pdf',
              'category': 'documents',
              'sizeBytes': 5000,
              'updatedAt': '2026-10-02T10:00:00.000Z',
            },
          ],
        },
      ],
      'generatedAt': '2026-10-31T12:00:00.000Z',
    });

    expect(insights.totals.versionBytes, 512);
    expect(insights.largestFiles.last.category, isNull);
    expect(insights.duplicateGroups.single.wastedBytes, 5000);
  });

  test('an unknown category is a parse failure, never a guessed bucket', () {
    final json = fileJson()..['category'] = 'holograms';
    expect(() => FileSummary.fromJson(json), throwsA(anything));
  });
}
