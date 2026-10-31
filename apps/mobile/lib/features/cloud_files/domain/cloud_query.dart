import 'package:flutter/foundation.dart';

import '../../../core/models/library.dart';
import '../../../core/models/user_settings.dart';

enum CloudViewMode { grid, list }

const _unset = Object();

/// The complete cloud browsing state that is cached locally and reflected in
/// the URL-free screen state. Filtering, sorting and paging all happen on the
/// device over the last synced snapshot, so airplane mode behaves the same as
/// the live view and every list carries a real freshness timestamp.
@immutable
class CloudQuery {
  const CloudQuery({
    this.search = '',
    this.category,
    this.folderId,
    this.favoritesOnly = false,
    this.tagId,
    this.sort = FileSort.updatedAt,
    this.viewMode = CloudViewMode.grid,
  });

  final String search;
  final LibraryCategory? category;

  /// `null` means the whole library; a value restricts the list to that
  /// folder's direct files.
  final String? folderId;
  final bool favoritesOnly;
  final String? tagId;
  final FileSort sort;
  final CloudViewMode viewMode;

  bool get hasFilters =>
      search.trim().isNotEmpty ||
      category != null ||
      favoritesOnly ||
      tagId != null;

  bool get isBrowsingFolder => folderId != null;

  CloudQuery copyWith({
    String? search,
    Object? category = _unset,
    Object? folderId = _unset,
    bool? favoritesOnly,
    Object? tagId = _unset,
    FileSort? sort,
    CloudViewMode? viewMode,
  }) {
    return CloudQuery(
      search: search ?? this.search,
      category: identical(category, _unset)
          ? this.category
          : category as LibraryCategory?,
      folderId: identical(folderId, _unset)
          ? this.folderId
          : folderId as String?,
      favoritesOnly: favoritesOnly ?? this.favoritesOnly,
      tagId: identical(tagId, _unset) ? this.tagId : tagId as String?,
      sort: sort ?? this.sort,
      viewMode: viewMode ?? this.viewMode,
    );
  }
}

/// Pure filtering used by both the live cache view and tests. There is no
/// server-side filter duplication: the snapshot is complete for the synced
/// range, so the same predicate runs in both modes.
List<FileSummary> filterFiles(List<FileSummary> files, CloudQuery query) {
  final term = query.search.trim().toLowerCase();
  final result = files.where((file) {
    if (query.folderId != null && file.folderId != query.folderId) {
      return false;
    }
    if (query.category != null && file.category != query.category) {
      return false;
    }
    if (query.favoritesOnly && !file.favorite) return false;
    if (query.tagId != null &&
        !file.tags.any((tag) => tag.id == query.tagId)) {
      return false;
    }
    if (term.isEmpty) return true;
    if (file.name.toLowerCase().contains(term)) return true;
    if ((file.description ?? '').toLowerCase().contains(term)) return true;
    return file.tags.any((tag) => tag.name.toLowerCase().contains(term));
  }).toList();

  result.sort((a, b) => _compare(a, b, query.sort));
  return result;
}

int _compare(FileSummary a, FileSummary b, FileSort sort) {
  switch (sort) {
    case FileSort.updatedAt:
      final byUpdated = b.updatedAt.compareTo(a.updatedAt);
      return byUpdated != 0 ? byUpdated : _byName(a, b);
    case FileSort.createdAt:
      final byCreated = b.createdAt.compareTo(a.createdAt);
      return byCreated != 0 ? byCreated : _byName(a, b);
    case FileSort.nameAsc:
      return _byName(a, b);
    case FileSort.nameDesc:
      return _byName(b, a);
    case FileSort.sizeDesc:
      final bySize = b.sizeBytes.compareTo(a.sizeBytes);
      return bySize != 0 ? bySize : _byName(a, b);
    case FileSort.sizeAsc:
      final bySize = a.sizeBytes.compareTo(b.sizeBytes);
      return bySize != 0 ? bySize : _byName(a, b);
  }
}

int _byName(FileSummary a, FileSummary b) =>
    a.name.toLowerCase().compareTo(b.name.toLowerCase());

/// Direct children of [parentId] (`null` = top level), name-sorted.
List<FolderSummary> childFolders(
  List<FolderSummary> folders,
  String? parentId,
) {
  final children = folders
      .where((folder) => folder.parentFolderId == parentId)
      .toList();
  children.sort(
    (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
  );
  return children;
}

/// Root-first path to [folderId], with a visited guard so a malformed parent
/// chain from the server cannot loop forever.
List<FolderSummary> folderPath(
  List<FolderSummary> folders,
  String? folderId,
) {
  if (folderId == null) return const [];
  final byId = {for (final folder in folders) folder.id: folder};
  final path = <FolderSummary>[];
  final seen = <String>{};
  var current = byId[folderId];
  while (current != null && seen.add(current.id)) {
    path.insert(0, current);
    final parentId = current.parentFolderId;
    current = parentId == null ? null : byId[parentId];
  }
  return path;
}

/// Total bytes of a list, bounded to avoid a 32-bit overflow on large
/// libraries.
int totalBytes(Iterable<FileSummary> files) {
  var total = 0;
  for (final file in files) {
    total += file.sizeBytes;
  }
  return total;
}
