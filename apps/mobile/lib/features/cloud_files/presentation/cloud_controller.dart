import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/database/app_database.dart';
import '../../../core/models/library.dart';
import '../../../core/models/user_settings.dart';
import '../../../core/providers.dart';
import '../data/cloud_library_repository.dart';
import '../domain/cloud_query.dart';

/// The signed-in account's cache file. Providers are torn down when the
/// account changes, which closes the database before another account opens.
final cloudDatabaseProvider = Provider<AppDatabase>((ref) {
  final session = ref.watch(authControllerProvider).value?.session;
  if (session == null) {
    throw StateError('The cloud cache requires a signed-in account.');
  }
  final database = AppDatabase.forAccount(session.userId);
  ref.onDispose(database.close);
  return database;
});

final cloudLibraryRepositoryProvider = Provider<CloudLibraryRepository>((ref) {
  return CloudLibraryRepository(
    api: ref.watch(apiClientProvider),
    database: ref.watch(cloudDatabaseProvider),
  );
});

/// Read-only storage insights. Fetched when the sheet opens, so the numbers are
/// never presented as part of the cached snapshot.
final insightsProvider = FutureProvider.autoDispose<StorageInsightsResponse>(
  (ref) => ref.watch(apiClientProvider).fetchInsights(),
);

@immutable
class CloudLibraryState {
  const CloudLibraryState({
    required this.query,
    required this.files,
    required this.total,
    required this.cachedFileCount,
    required this.folders,
    required this.tags,
    required this.summary,
    required this.syncedAt,
    required this.truncated,
    required this.refreshing,
    required this.syncError,
    required this.hasCache,
  });

  final CloudQuery query;

  /// The filtered page currently on screen (at most `pageSize` per load).
  final List<FileSummary> files;
  final int total;
  final int cachedFileCount;
  final List<FolderSummary> folders;
  final List<TagListItem> tags;
  final LibrarySummaryResponse? summary;
  final DateTime? syncedAt;

  /// The server had more files than the sync cap; the UI must say so.
  final bool truncated;
  final bool refreshing;

  /// Last network failure. When [hasCache] is also true the content on screen
  /// is the saved copy and must be labelled as such.
  final ApiException? syncError;
  final bool hasCache;

  bool get showingCachedCopy => hasCache && syncError != null;
  bool get hasMore => files.length < total;
  bool get isLibraryEmpty => hasCache && (summary?.totals.files ?? 0) == 0;

  List<FolderSummary> get visibleFolders =>
      childFolders(folders, query.folderId);

  List<FolderSummary> get breadcrumb => folderPath(folders, query.folderId);

  bool get matchesNothing =>
      hasCache && total == 0 && !isLibraryEmpty;

  CloudLibraryState copyWith({
    CloudQuery? query,
    List<FileSummary>? files,
    int? total,
    int? cachedFileCount,
    List<FolderSummary>? folders,
    List<TagListItem>? tags,
    LibrarySummaryResponse? summary,
    DateTime? syncedAt,
    bool? truncated,
    bool? refreshing,
    ApiException? syncError,
    bool clearError = false,
    bool? hasCache,
  }) {
    return CloudLibraryState(
      query: query ?? this.query,
      files: files ?? this.files,
      total: total ?? this.total,
      cachedFileCount: cachedFileCount ?? this.cachedFileCount,
      folders: folders ?? this.folders,
      tags: tags ?? this.tags,
      summary: summary ?? this.summary,
      syncedAt: syncedAt ?? this.syncedAt,
      truncated: truncated ?? this.truncated,
      refreshing: refreshing ?? this.refreshing,
      syncError: clearError ? null : (syncError ?? this.syncError),
      hasCache: hasCache ?? this.hasCache,
    );
  }
}

final cloudLibraryProvider =
    AsyncNotifierProvider<CloudLibraryController, CloudLibraryState>(
      CloudLibraryController.new,
    );

/// Cache-first cloud browsing. `build()` renders the saved snapshot
/// immediately, then refreshes in the background; the UI never waits on the
/// network to show metadata it already has.
class CloudLibraryController extends AsyncNotifier<CloudLibraryState> {
  static const int pageSize = 50;

  CloudQuery _query = const CloudQuery();
  LibraryCache? _cache;
  int _visibleCount = pageSize;

  @override
  Future<CloudLibraryState> build() async {
    final repository = ref.watch(cloudLibraryRepositoryProvider);
    final cache = await repository.readCache();
    _cache = cache;
    _visibleCount = pageSize;
    final initial = _fromCache(cache, refreshing: cache == null);
    // Runs after the provider stores the initial state; a microtask can still
    // observe AsyncLoading here, which would silently skip the first sync.
    unawaited(
      Future<void>.delayed(Duration.zero, () => _sync(repository)),
    );
    return initial;
  }

  Future<void> refresh() async {
    await _sync(ref.read(cloudLibraryRepositoryProvider));
  }

  void setSearch(String value) {
    if (value == _query.search) return;
    _query = _query.copyWith(search: value);
    _resetPaging();
  }

  void setCategory(LibraryCategory? category) {
    _query = _query.copyWith(category: category);
    _resetPaging();
  }

  void toggleFavorites() {
    _query = _query.copyWith(favoritesOnly: !_query.favoritesOnly);
    _resetPaging();
  }

  void setTag(String? tagId) {
    _query = _query.copyWith(tagId: tagId);
    _resetPaging();
  }

  void setSort(FileSort sort) {
    _query = _query.copyWith(sort: sort);
    _resetPaging();
  }

  void setViewMode(CloudViewMode mode) {
    _query = _query.copyWith(viewMode: mode);
    _emit();
  }

  void openFolder(String? folderId) {
    _query = _query.copyWith(
      folderId: folderId,
      search: '',
      category: null,
      favoritesOnly: false,
      tagId: null,
    );
    _resetPaging();
  }

  void clearFilters() {
    _query = _query.copyWith(
      search: '',
      category: null,
      favoritesOnly: false,
      tagId: null,
    );
    _resetPaging();
  }

  void loadMore() {
    if (!(state.value?.hasMore ?? false)) return;
    _visibleCount += pageSize;
    _emit();
  }

  void _resetPaging() {
    _visibleCount = pageSize;
    _emit();
  }

  void _emit() {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(
      _fromCache(
        _cache,
        refreshing: current.refreshing,
        error: current.syncError,
      ),
    );
  }

  Future<void> _sync(CloudLibraryRepository repository) async {
    final current = state.value;
    if (current == null) return;
    state = AsyncData(current.copyWith(refreshing: true, clearError: true));
    try {
      final cache = await repository.refresh();
      _cache = cache;
      if (!ref.mounted) return;
      state = AsyncData(_fromCache(cache));
    } on ApiException catch (error) {
      if (!ref.mounted) return;
      state = AsyncData(_fromCache(_cache, error: error));
    } catch (_) {
      if (!ref.mounted) return;
      state = AsyncData(
        _fromCache(
          _cache,
          error: const ApiException(
            code: 'INTERNAL_ERROR',
            message: 'The library could not be refreshed.',
          ),
        ),
      );
    }
  }

  CloudLibraryState _fromCache(
    LibraryCache? cache, {
    bool refreshing = false,
    ApiException? error,
  }) {
    if (cache == null) {
      return CloudLibraryState(
        query: _query,
        files: const [],
        total: 0,
        cachedFileCount: 0,
        folders: const [],
        tags: const [],
        summary: null,
        syncedAt: null,
        truncated: false,
        refreshing: refreshing,
        syncError: error,
        hasCache: false,
      );
    }
    final filtered = filterFiles(cache.files, _query);
    return CloudLibraryState(
      query: _query,
      files: filtered.take(_visibleCount).toList(growable: false),
      total: filtered.length,
      cachedFileCount: cache.files.length,
      folders: cache.folders,
      tags: cache.tags,
      summary: cache.summary,
      syncedAt: cache.syncedAt,
      truncated: cache.truncated,
      refreshing: refreshing,
      syncError: error,
      hasCache: true,
    );
  }
}
