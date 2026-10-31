import 'package:flutter_test/flutter_test.dart';
import 'package:stackbase_mobile/core/models/library.dart';
import 'package:stackbase_mobile/core/models/user_settings.dart';
import 'package:stackbase_mobile/features/cloud_files/domain/cloud_query.dart';

import '../support/library_fixtures.dart';

void main() {
  final files = [
    fileFixture(
      id: 'images-1',
      name: 'Sunset.jpg',
      category: LibraryCategory.images,
      sizeBytes: 900,
      updatedAt: DateTime.utc(2026, 10, 30),
      tags: [tagFixture(id: 'holiday', name: 'Holiday')],
    ),
    fileFixture(
      id: 'docs-1',
      name: 'Report.pdf',
      category: LibraryCategory.documents,
      sizeBytes: 5000,
      updatedAt: DateTime.utc(2026, 10, 29),
      description: 'Quarterly numbers',
      folderId: 'folder-1',
      folderName: 'Receipts',
    ),
    fileFixture(
      id: 'audio-1',
      name: 'Voice memo.m4a',
      category: LibraryCategory.audio,
      sizeBytes: 300,
      favorite: true,
      updatedAt: DateTime.utc(2026, 10, 31),
    ),
  ];

  group('filterFiles', () {
    test('filters by category, favourite, tag and folder', () {
      expect(
        filterFiles(files, const CloudQuery(category: LibraryCategory.audio)),
        [files[2]],
      );
      expect(
        filterFiles(files, const CloudQuery(favoritesOnly: true)),
        [files[2]],
      );
      expect(
        filterFiles(files, const CloudQuery(tagId: 'holiday')),
        [files[0]],
      );
      expect(
        filterFiles(files, const CloudQuery(folderId: 'folder-1')),
        [files[1]],
      );
    });

    test('searches names, descriptions and tag names case-insensitively', () {
      expect(filterFiles(files, const CloudQuery(search: 'SUNSET')), [files[0]]);
      expect(filterFiles(files, const CloudQuery(search: 'quarterly')), [
        files[1],
      ]);
      expect(filterFiles(files, const CloudQuery(search: 'holiday')), [
        files[0],
      ]);
      expect(filterFiles(files, const CloudQuery(search: 'nothing')), isEmpty);
    });

    test('sorts by size and name without losing rows', () {
      expect(
        filterFiles(files, const CloudQuery(sort: FileSort.sizeDesc))
            .map((file) => file.id)
            .toList(),
        ['docs-1', 'images-1', 'audio-1'],
      );
      expect(
        filterFiles(files, const CloudQuery(sort: FileSort.sizeAsc))
            .map((file) => file.id)
            .toList(),
        ['audio-1', 'images-1', 'docs-1'],
      );
      expect(
        filterFiles(files, const CloudQuery(sort: FileSort.nameAsc))
            .map((file) => file.name)
            .toList(),
        ['Report.pdf', 'Sunset.jpg', 'Voice memo.m4a'],
      );
    });

    test('default sort is last-updated descending', () {
      expect(
        filterFiles(files, const CloudQuery()).map((file) => file.id).toList(),
        ['audio-1', 'images-1', 'docs-1'],
      );
    });
  });

  group('folder navigation', () {
    final folders = [
      folderFixture(id: 'a', name: 'A'),
      folderFixture(id: 'b', name: 'B', parentFolderId: 'a'),
      folderFixture(id: 'c', name: 'C', parentFolderId: 'b'),
    ];

    test('returns only direct children, name-sorted', () {
      expect(childFolders(folders, null).map((f) => f.id), ['a']);
      expect(childFolders(folders, 'a').map((f) => f.id), ['b']);
      expect(childFolders(folders, 'c'), isEmpty);
    });

    test('builds a root-first path and survives a parent cycle', () {
      expect(folderPath(folders, 'c').map((f) => f.name), ['A', 'B', 'C']);
      expect(folderPath(folders, null), isEmpty);

      final cyclic = [
        folderFixture(id: 'x', name: 'X', parentFolderId: 'y'),
        folderFixture(id: 'y', name: 'Y', parentFolderId: 'x'),
      ];
      expect(folderPath(cyclic, 'x'), hasLength(2));
    });
  });

  test('totalBytes sums the logical sizes', () {
    expect(totalBytes(files), 6200);
    expect(totalBytes(const []), 0);
  });

  test('copyWith clears nullable filters explicitly', () {
    const query = CloudQuery(
      category: LibraryCategory.audio,
      folderId: 'folder-1',
      tagId: 'tag-1',
    );
    final cleared = query.copyWith(category: null, folderId: null, tagId: null);
    expect(cleared.category, isNull);
    expect(cleared.folderId, isNull);
    expect(cleared.tagId, isNull);
    expect(cleared.sort, FileSort.updatedAt);
  });
}
