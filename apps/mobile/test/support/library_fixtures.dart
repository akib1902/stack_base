import 'package:stackbase_mobile/core/api/api_exception.dart';
import 'package:stackbase_mobile/core/models/library.dart';
import 'package:stackbase_mobile/features/cloud_files/data/cloud_library_repository.dart';

final DateTime fixtureNow = DateTime.utc(2026, 10, 31, 12);

TagSummary tagFixture({String id = 'tag-1', String name = 'Work'}) {
  return TagSummary(id: id, name: name, colorToken: 'sky');
}

TagListItem tagListItemFixture({
  String id = 'tag-1',
  String name = 'Work',
  int fileCount = 1,
}) {
  return TagListItem(
    id: id,
    name: name,
    colorToken: 'sky',
    fileCount: fileCount,
    createdAt: fixtureNow.subtract(const Duration(days: 3)),
  );
}

FileSummary fileFixture({
  String id = 'file-1',
  String name = 'report.pdf',
  String? extension = 'pdf',
  LibraryCategory category = LibraryCategory.documents,
  int sizeBytes = 2048,
  bool favorite = false,
  String? description,
  String? folderId,
  String? folderName,
  FileContentStatus contentStatus = FileContentStatus.ready,
  List<TagSummary>? tags,
  DateTime? updatedAt,
}) {
  return FileSummary(
    id: id,
    name: name,
    extension: extension,
    mimeType: 'application/pdf',
    sizeBytes: sizeBytes,
    category: category,
    favorite: favorite,
    description: description,
    folderId: folderId,
    folderName: folderName,
    contentStatus: contentStatus,
    tags: tags ?? [tagFixture()],
    createdAt: fixtureNow.subtract(const Duration(days: 5)),
    updatedAt: updatedAt ?? fixtureNow.subtract(const Duration(hours: 2)),
  );
}

FolderSummary folderFixture({
  String id = 'folder-1',
  String name = 'Receipts',
  String? parentFolderId,
  int fileCount = 1,
  int folderCount = 0,
}) {
  return FolderSummary(
    id: id,
    name: name,
    parentFolderId: parentFolderId,
    fileCount: fileCount,
    folderCount: folderCount,
    createdAt: fixtureNow.subtract(const Duration(days: 10)),
    updatedAt: fixtureNow.subtract(const Duration(days: 2)),
  );
}

LibrarySummaryResponse summaryFixture({
  int files = 2,
  int folders = 1,
  int bytes = 4096,
  List<FileSummary>? recent,
}) {
  return LibrarySummaryResponse(
    totals: LibraryTotals(
      files: files,
      folders: folders,
      bytes: bytes,
      tags: 1,
      trashedFiles: 0,
      trashedFolders: 0,
    ),
    categories: [
      for (final category in LibraryCategory.values)
        CategorySummary(
          category: category,
          files: category == LibraryCategory.documents ? files : 0,
          bytes: category == LibraryCategory.documents ? bytes : 0,
        ),
    ],
    recent: recent ?? [fileFixture()],
    largest: recent ?? [fileFixture()],
  );
}

LibraryCache libraryCacheFixture({
  List<FileSummary>? files,
  List<FolderSummary>? folders,
  List<TagListItem>? tags,
  int? summaryFiles,
  DateTime? syncedAt,
  bool truncated = false,
}) {
  final resolvedFiles = files ?? [fileFixture()];
  final resolvedFolders = folders ?? [folderFixture()];
  final resolvedTags = tags ?? [tagListItemFixture()];
  return LibraryCache(
    files: resolvedFiles,
    folders: resolvedFolders,
    tags: resolvedTags,
    summary: summaryFixture(
      files: summaryFiles ?? resolvedFiles.length,
      folders: resolvedFolders.length,
      bytes: resolvedFiles.fold(0, (sum, file) => sum + file.sizeBytes),
      recent: resolvedFiles.take(5).toList(),
    ),
    syncedAt: syncedAt ?? fixtureNow.subtract(const Duration(minutes: 3)),
    truncated: truncated,
  );
}

/// Contract-shaped JSON so parsing is tested against the wire format, not
/// against the generated `toJson` of the same model.
Map<String, dynamic> tagJson({String id = 'tag-1', String name = 'Work'}) {
  return {'id': id, 'name': name, 'colorToken': 'sky'};
}

Map<String, dynamic> fileJson({
  String id = 'file-1',
  String name = 'report.pdf',
  String? folderId,
  bool favorite = false,
  List<Map<String, dynamic>>? tags,
}) {
  return {
    'id': id,
    'name': name,
    'extension': 'pdf',
    'mimeType': 'application/pdf',
    'sizeBytes': 2048,
    'category': 'documents',
    'favorite': favorite,
    'description': null,
    'folderId': folderId,
    'folderName': folderId == null ? null : 'Receipts',
    'contentStatus': 'ready',
    'tags': tags ?? [tagJson()],
    'createdAt': '2026-10-01T10:00:00.000Z',
    'updatedAt': '2026-10-02T10:00:00.000Z',
  };
}

Map<String, dynamic> folderJson({
  String id = 'folder-1',
  String name = 'Receipts',
  String? parentFolderId,
}) {
  return {
    'id': id,
    'name': name,
    'parentFolderId': parentFolderId,
    'fileCount': 1,
    'folderCount': 0,
    'createdAt': '2026-09-01T10:00:00.000Z',
    'updatedAt': '2026-10-20T10:00:00.000Z',
  };
}

Map<String, dynamic> tagListItemJson({
  String id = 'tag-1',
  String name = 'Work',
}) {
  return {
    'id': id,
    'name': name,
    'colorToken': 'sky',
    'fileCount': 1,
    'createdAt': '2026-09-01T10:00:00.000Z',
  };
}

Map<String, dynamic> summaryJson({int files = 2}) {
  final categories = [
    for (final category in LibraryCategory.values)
      {
        'category': category.wireValue,
        'files': category == LibraryCategory.documents ? files : 0,
        'bytes': category == LibraryCategory.documents ? files * 2048 : 0,
      },
  ];
  return {
    'totals': {
      'files': files,
      'folders': 1,
      'bytes': files * 2048,
      'tags': 1,
      'trashedFiles': 0,
      'trashedFolders': 0,
    },
    'categories': categories,
    'recent': [fileJson()],
    'largest': [fileJson()],
  };
}

Map<String, dynamic> fileListJson({
  required List<Map<String, dynamic>> items,
  required int total,
  required int offset,
  required bool hasMore,
}) {
  return {
    'items': items,
    'total': total,
    'limit': 100,
    'offset': offset,
    'hasMore': hasMore,
  };
}

/// Deterministic stand-in for the API + database pair. The controller is still
/// the real one, so its cache-first and error behaviour are under test.
class FakeCloudLibraryRepository implements CloudLibraryRepository {
  FakeCloudLibraryRepository({this.cache, this.refreshError});

  LibraryCache? cache;
  ApiException? refreshError;
  int refreshCalls = 0;

  @override
  Future<LibraryCache?> readCache() async => cache;

  @override
  Future<LibraryCache> refresh() async {
    refreshCalls++;
    final error = refreshError;
    if (error != null) throw error;
    final value = cache;
    if (value == null) {
      throw const ApiException(
        code: 'INTERNAL_ERROR',
        message: 'No fake cache configured.',
      );
    }
    return value;
  }

  @override
  Future<void> clear() async {
    cache = null;
  }
}
