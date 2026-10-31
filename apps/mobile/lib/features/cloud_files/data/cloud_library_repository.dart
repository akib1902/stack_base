import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/foundation.dart';

import '../../../core/api/api_client.dart';
import '../../../core/database/app_database.dart';
import '../../../core/models/library.dart';

/// A complete, consistent view of the synced library snapshot.
@immutable
class LibraryCache {
  const LibraryCache({
    required this.files,
    required this.folders,
    required this.tags,
    required this.summary,
    required this.syncedAt,
    required this.truncated,
  });

  final List<FileSummary> files;
  final List<FolderSummary> folders;
  final List<TagListItem> tags;
  final LibrarySummaryResponse summary;
  final DateTime syncedAt;

  /// True when the server had more rows than the sync page cap. The UI says so
  /// rather than implying the cache is the whole library.
  final bool truncated;
}

/// Reads the existing endpoints into the per-account cache. The server has no
/// bulk/incremental export yet (gap G3), so a refresh pages through `/files`
/// and replaces the snapshot atomically. Reads are local from then on.
class CloudLibraryRepository {
  CloudLibraryRepository({
    required ApiClient api,
    required AppDatabase database,
    DateTime Function()? clock,
  }) : _api = api,
       _database = database,
       _clock = clock ?? DateTime.now;

  final ApiClient _api;
  final AppDatabase _database;
  final DateTime Function() _clock;

  static const int pageSize = 100;

  /// 20 pages = 2,000 files. A larger library is cached only up to here and
  /// [LibraryCache.truncated] stays true; nothing is silently implied.
  static const int pageCap = 20;

  /// Returns `null` when this account has never completed a sync.
  Future<LibraryCache?> readCache() async {
    final summaryRows = await (_database.select(
      _database.cachedSummaries,
    )..limit(1)).get();
    if (summaryRows.isEmpty) return null;
    final summaryRow = summaryRows.single;

    final fileRows = await _database.select(_database.cachedFiles).get();
    final folderRows = await _database.select(_database.cachedFolders).get();
    final tagRows = await _database.select(_database.cachedTags).get();

    try {
      final summary = LibrarySummaryResponse.fromJson(
        Map<String, dynamic>.from(
          jsonDecode(summaryRow.payload) as Map<Object?, Object?>,
        ),
      );
      return LibraryCache(
        files: [for (final row in fileRows) _fileFromRow(row)],
        folders: [for (final row in folderRows) _folderFromRow(row)],
        tags: [for (final row in tagRows) _tagFromRow(row)],
        summary: summary,
        syncedAt: summaryRow.syncedAt,
        truncated: summaryRow.truncated,
      );
    } on FormatException {
      // A corrupted or older cache is discarded, never shown as truth.
      await clear();
      return null;
    } on TypeError {
      await clear();
      return null;
    } on ArgumentError {
      // An unknown enum wire value from an older/newer build is also corruption.
      await clear();
      return null;
    }
  }

  Future<LibraryCache> refresh() async {
    final folders = (await _api.fetchFolders()).items;
    final tags = (await _api.fetchTags()).items;
    final summary = await _api.fetchLibrarySummary();

    final files = <FileSummary>[];
    var offset = 0;
    var truncated = false;
    for (var page = 0; page < pageCap; page++) {
      final response = await _api.fetchFiles(limit: pageSize, offset: offset);
      files.addAll(response.items);
      if (!response.hasMore) break;
      offset += response.items.length;
      if (page == pageCap - 1) truncated = true;
      if (response.items.isEmpty) break;
    }

    final syncedAt = _clock().toUtc();
    await _database.transaction(() async {
      await _database.delete(_database.cachedFiles).go();
      await _database.delete(_database.cachedFolders).go();
      await _database.delete(_database.cachedTags).go();
      await _database.delete(_database.cachedSummaries).go();

      await _database.batch((batch) {
        batch.insertAll(_database.cachedFiles, [
          for (final file in files) _fileCompanion(file),
        ]);
        batch.insertAll(_database.cachedFolders, [
          for (final folder in folders) _folderCompanion(folder),
        ]);
        batch.insertAll(_database.cachedTags, [
          for (final tag in tags) _tagCompanion(tag),
        ]);
        batch.insert(
          _database.cachedSummaries,
          CachedSummariesCompanion.insert(
            id: 1,
            payload: jsonEncode(summary.toJson()),
            syncedAt: syncedAt,
            truncated: Value(truncated),
          ),
        );
      });
    });

    return LibraryCache(
      files: files,
      folders: folders,
      tags: tags,
      summary: summary,
      syncedAt: syncedAt,
      truncated: truncated,
    );
  }

  /// Removes every cached row. Sign-out uses this before the account database
  /// is closed; tests use it to prove isolation.
  Future<void> clear() async {
    await _database.transaction(() async {
      await _database.delete(_database.cachedFiles).go();
      await _database.delete(_database.cachedFolders).go();
      await _database.delete(_database.cachedTags).go();
      await _database.delete(_database.cachedSummaries).go();
    });
  }

  CachedFilesCompanion _fileCompanion(FileSummary file) {
    return CachedFilesCompanion.insert(
      id: file.id,
      name: file.name,
      extension: Value(file.extension),
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      category: file.category.wireValue,
      favorite: file.favorite,
      description: Value(file.description),
      folderId: Value(file.folderId),
      folderName: Value(file.folderName),
      contentStatus: file.contentStatus.name,
      tagsJson: jsonEncode([for (final tag in file.tags) tag.toJson()]),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    );
  }

  CachedFoldersCompanion _folderCompanion(FolderSummary folder) {
    return CachedFoldersCompanion.insert(
      id: folder.id,
      name: folder.name,
      parentFolderId: Value(folder.parentFolderId),
      fileCount: folder.fileCount,
      folderCount: folder.folderCount,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    );
  }

  CachedTagsCompanion _tagCompanion(TagListItem tag) {
    return CachedTagsCompanion.insert(
      id: tag.id,
      name: tag.name,
      colorToken: Value(tag.colorToken),
      fileCount: tag.fileCount,
      createdAt: tag.createdAt,
    );
  }

  FileSummary _fileFromRow(CachedFile row) {
    final rawTags = jsonDecode(row.tagsJson);
    if (rawTags is! List) {
      throw const FormatException('Cached tags are not a list.');
    }
    return FileSummary(
      id: row.id,
      name: row.name,
      extension: row.extension,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      category: libraryCategoryFromWire(row.category),
      favorite: row.favorite,
      description: row.description,
      folderId: row.folderId,
      folderName: row.folderName,
      contentStatus: FileContentStatus.values.byName(row.contentStatus),
      tags: [
        for (final tag in rawTags)
          TagSummary.fromJson(Map<String, dynamic>.from(tag as Map)),
      ],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  FolderSummary _folderFromRow(CachedFolder row) {
    return FolderSummary(
      id: row.id,
      name: row.name,
      parentFolderId: row.parentFolderId,
      fileCount: row.fileCount,
      folderCount: row.folderCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  TagListItem _tagFromRow(CachedTag row) {
    return TagListItem(
      id: row.id,
      name: row.name,
      colorToken: row.colorToken,
      fileCount: row.fileCount,
      createdAt: row.createdAt,
    );
  }
}
