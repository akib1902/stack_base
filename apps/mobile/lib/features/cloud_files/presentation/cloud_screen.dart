import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/models/library.dart';
import '../../../core/models/user_settings.dart';
import '../../../core/ui/components/offline_banner.dart';
import '../../../core/ui/components/section_header.dart';
import '../../../core/ui/components/stackbase_app_bar.dart';
import '../../../core/ui/components/state_message.dart';
import '../../../core/ui/formatters.dart';
import '../domain/cloud_query.dart';
import 'cloud_controller.dart';
import 'widgets/cloud_sheets.dart';
import 'widgets/cloud_summary.dart';
import 'widgets/file_views.dart';

/// Read-only browser for the shared StackBase namespace. Every row comes from
/// the last successful sync of the real API; the cache is per account and the
/// screen always states whether it is live or a saved copy.
class CloudScreen extends ConsumerStatefulWidget {
  const CloudScreen({super.key});

  @override
  ConsumerState<CloudScreen> createState() => _CloudScreenState();
}

class _CloudScreenState extends ConsumerState<CloudScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  bool _searchOpen = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final library = ref.watch(cloudLibraryProvider);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: StackBaseAppBar(
        title: 'Cloud files',
        showTransfers: false,
        actions: [
          if (library.value != null)
            IconButton(
              onPressed: _toggleSearch,
              tooltip: _searchOpen ? 'Close search' : 'Search cloud files',
              icon: Icon(
                _searchOpen ? Icons.search_off_rounded : Icons.search_rounded,
              ),
            ),
          IconButton(
            onPressed: () => showInsightsSheet(context),
            tooltip: 'Storage insights',
            icon: const Icon(Icons.insights_outlined),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: library.when(
          loading: () =>
              const _CloudLoading(label: 'Loading your saved library…'),
          error: (error, _) => _CloudUnavailable(
            error: error,
            onRetry: () => ref.invalidate(cloudLibraryProvider),
          ),
          data: _buildData,
        ),
      ),
    );
  }

  Widget _buildData(CloudLibraryState state) {
    final controller = ref.read(cloudLibraryProvider.notifier);
    if (!state.hasCache) {
      if (state.syncError != null) {
        return _CloudUnavailable(
          error: state.syncError!,
          onRetry: controller.refresh,
        );
      }
      return const _CloudLoading(label: 'Syncing your cloud library…');
    }

    final query = state.query;
    final atRootOverview = query.folderId == null && !query.hasFilters;
    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          Space.x4,
          Space.x3,
          Space.x4,
          Space.x8,
        ),
        children: [
          CloudFreshnessBar(state: state),
          if (state.syncError != null) ...[
            const SizedBox(height: Space.x2),
            OfflineBanner(
              message:
                  'Showing the saved copy. ${state.syncError!.userMessage}',
              onRetry: controller.refresh,
            ),
          ],
          if (_searchOpen) ...[
            const SizedBox(height: Space.x3),
            TextField(
              controller: _searchController,
              autofocus: true,
              textInputAction: TextInputAction.search,
              onChanged: _onSearchChanged,
              onSubmitted: (value) {
                _debounce?.cancel();
                controller.setSearch(value);
              },
              decoration: InputDecoration(
                hintText: 'Search names, descriptions and tags',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: IconButton(
                  onPressed: () {
                    _searchController.clear();
                    _onSearchChanged('');
                  },
                  tooltip: 'Clear search',
                  icon: const Icon(Icons.close_rounded),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radii.control),
                ),
                isDense: true,
              ),
            ),
          ],
          const SizedBox(height: Space.x3),
          CloudFilterBar(
            state: state,
            onCategory: controller.setCategory,
            onFavorites: controller.toggleFavorites,
            onTag: controller.setTag,
          ),
          if (query.folderId != null) ...[
            const SizedBox(height: Space.x2),
            CloudBreadcrumb(
              path: state.breadcrumb,
              onOpen: controller.openFolder,
            ),
          ],
          if (atRootOverview && state.summary != null) ...[
            const SizedBox(height: Space.x4),
            CloudSummaryCard(
              summary: state.summary!,
              query: query,
              onCategorySelected: (category) =>
                  controller.setCategory(category),
              onFileTap: (file) => showFileDetailsSheet(context, file),
              onFolderTap: controller.openFolder,
            ),
          ],
          if (query.search.trim().isEmpty && state.visibleFolders.isNotEmpty) ...[
            const SizedBox(height: Space.x5),
            SectionHeader(
              title: query.folderId == null ? 'Folders' : 'Subfolders',
              subtitle:
                  '${state.visibleFolders.length} '
                  '${state.visibleFolders.length == 1 ? 'folder' : 'folders'} '
                  'in this view.',
            ),
            const SizedBox(height: Space.x2),
            CloudFolderStrip(
              folders: state.visibleFolders,
              onOpen: controller.openFolder,
            ),
          ],
          const SizedBox(height: Space.x5),
          _FilesHeader(state: state, controller: controller),
          const SizedBox(height: Space.x2),
          if (state.files.isEmpty)
            _EmptyFiles(
              state: state,
              onClearFilters: () {
                _searchController.clear();
                controller.clearFilters();
              },
              onRefresh: controller.refresh,
            )
          else if (query.viewMode == CloudViewMode.grid)
            CloudFileGrid(
              key: const Key('cloud-file-grid'),
              files: state.files,
              onOpen: (file) => showFileDetailsSheet(context, file),
            )
          else
            CloudFileList(
              key: const Key('cloud-file-list'),
              files: state.files,
              onOpen: (file) => showFileDetailsSheet(context, file),
            ),
          if (state.hasMore) ...[
            const SizedBox(height: Space.x3),
            OutlinedButton.icon(
              onPressed: controller.loadMore,
              icon: const Icon(Icons.expand_more_rounded),
              label: Text(
                'Load more (${state.total - state.files.length} remaining)',
              ),
            ),
          ],
          const SizedBox(height: Space.x6),
        ],
      ),
    );
  }

  void _toggleSearch() {
    setState(() => _searchOpen = !_searchOpen);
    if (!_searchOpen) {
      _debounce?.cancel();
      _searchController.clear();
      ref.read(cloudLibraryProvider.notifier).setSearch('');
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      ref.read(cloudLibraryProvider.notifier).setSearch(value);
    });
  }
}

class _FilesHeader extends StatelessWidget {
  const _FilesHeader({required this.state, required this.controller});

  final CloudLibraryState state;
  final CloudLibraryController controller;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final query = state.query;
    final countLabel = '${state.total} ${state.total == 1 ? 'file' : 'files'}';
    final scope = query.folderId == null
        ? 'in the synced library'
        : 'in this folder';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                countLabel,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                query.hasFilters ? '$scope · filtered' : scope,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colors.mutedForeground,
                ),
              ),
            ],
          ),
        ),
        PopupMenuButton<FileSort>(
          tooltip: 'Sort files',
          initialValue: query.sort,
          onSelected: controller.setSort,
          icon: const Icon(Icons.sort_rounded),
          itemBuilder: (context) => [
            for (final sort in FileSort.values)
              PopupMenuItem<FileSort>(
                value: sort,
                child: Row(
                  children: [
                    if (sort == query.sort) ...[
                      const Icon(Icons.check, size: 16),
                      const SizedBox(width: Space.x2),
                    ],
                    Text(fileSortLabel(sort)),
                  ],
                ),
              ),
          ],
        ),
        IconButton(
          tooltip: query.viewMode == CloudViewMode.grid
              ? 'Switch to list view'
              : 'Switch to grid view',
          onPressed: () => controller.setViewMode(
            query.viewMode == CloudViewMode.grid
                ? CloudViewMode.list
                : CloudViewMode.grid,
          ),
          icon: Icon(
            query.viewMode == CloudViewMode.grid
                ? Icons.view_list_rounded
                : Icons.grid_view_rounded,
          ),
        ),
      ],
    );
  }
}

class _EmptyFiles extends StatelessWidget {
  const _EmptyFiles({
    required this.state,
    required this.onClearFilters,
    required this.onRefresh,
  });

  final CloudLibraryState state;
  final VoidCallback onClearFilters;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final query = state.query;
    if (state.isLibraryEmpty) {
      return StateMessage(
        icon: Icons.cloud_upload_outlined,
        title: 'Your cloud library is empty',
        message:
            'Files you upload on the web appear here after a refresh. '
            'Uploading from this app arrives with the encrypted transfer '
            'milestone; nothing is invented to fill the space.',
        actionLabel: 'Refresh',
        onAction: onRefresh,
      );
    }
    if (state.matchesNothing) {
      return StateMessage(
        icon: Icons.filter_alt_off_outlined,
        title: 'No files match these filters',
        message:
            'Nothing in the last synced snapshot matches this search, '
            'category or tag. Clear the filters to see the whole library.',
        actionLabel: 'Clear filters',
        onAction: onClearFilters,
      );
    }
    if (query.folderId != null) {
      return StateMessage(
        icon: Icons.folder_open_rounded,
        title: 'This folder is empty',
        message:
            'The folder has no files directly inside it. Subfolders, if any, '
            'are listed above.',
        actionLabel: 'Refresh',
        onAction: onRefresh,
      );
    }
    return StateMessage(
      icon: Icons.folder_off_outlined,
      title: 'No files here',
      message: 'The synced snapshot has no files for this view.',
      actionLabel: 'Refresh',
      onAction: onRefresh,
    );
  }
}

class _CloudLoading extends StatelessWidget {
  const _CloudLoading({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: Space.x3),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _CloudUnavailable extends StatelessWidget {
  const _CloudUnavailable({required this.error, required this.onRetry});

  final Object error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        child: StateMessage(
          icon: Icons.cloud_off_rounded,
          title: 'The cloud library is unavailable',
          message: error is ApiException
              ? (error as ApiException).userMessage
              : 'Your library could not be read from the server or the '
                    'device cache.',
          actionLabel: 'Retry',
          onAction: onRetry,
          tone: StateMessageTone.error,
        ),
      ),
    );
  }
}
