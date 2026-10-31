import 'package:collection/collection.dart';
import 'package:flutter/material.dart';

import '../../../../app/theme/tokens.dart';
import '../../../../core/models/library.dart';
import '../../../../core/models/user_settings.dart';
import '../../../../core/ui/components/app_card.dart';
import '../../../../core/ui/components/section_header.dart';
import '../../../../core/ui/formatters.dart';
import '../../domain/cloud_query.dart';
import '../cloud_controller.dart';

/// The first thing on the screen: whether this list is live or a saved copy.
class CloudFreshnessBar extends StatelessWidget {
  const CloudFreshnessBar({super.key, required this.state});

  final CloudLibraryState state;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final cached = state.showingCachedCopy;
    final syncedAt = state.syncedAt;
    final label = cached
        ? 'Saved copy · last synced '
              '${syncedAt == null ? 'unknown' : formatRelativeTime(syncedAt)}'
        : syncedAt == null
        ? 'Not synced yet'
        : 'Synced ${formatRelativeTime(syncedAt)}';
    final suffix = state.truncated
        ? ' · first ${state.cachedFileCount} files cached'
        : '';

    return Row(
      children: [
        Icon(
          cached ? Icons.cloud_off_rounded : Icons.cloud_done_outlined,
          size: 16,
          color: cached ? colors.primaryInk : colors.mutedForeground,
        ),
        const SizedBox(width: Space.x2),
        Expanded(
          child: Text(
            '$label$suffix',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: cached ? colors.primaryInk : colors.mutedForeground,
            ),
          ),
        ),
        if (state.refreshing)
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
      ],
    );
  }
}

/// Real totals and category buckets from `/library/summary`, plus the recent
/// files the server returned. Every number is a server aggregate.
class CloudSummaryCard extends StatelessWidget {
  const CloudSummaryCard({
    super.key,
    required this.summary,
    required this.query,
    required this.onCategorySelected,
    required this.onFileTap,
    required this.onFolderTap,
  });

  final LibrarySummaryResponse summary;
  final CloudQuery query;
  final ValueChanged<LibraryCategory?> onCategorySelected;
  final ValueChanged<FileSummary> onFileTap;
  final ValueChanged<String> onFolderTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final nonEmpty = summary.categories.where((c) => c.files > 0).toList();
    final recent = summary.recent.take(5).toList();

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Library',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              Text(
                'From the server',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: colors.mutedForeground,
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.x3),
          Wrap(
            spacing: Space.x2,
            runSpacing: Space.x2,
            children: [
              _Stat(
                value: '${summary.totals.files}',
                label: summary.totals.files == 1 ? 'file' : 'files',
              ),
              _Stat(
                value: '${summary.totals.folders}',
                label: summary.totals.folders == 1 ? 'folder' : 'folders',
              ),
              _Stat(value: formatBytes(summary.totals.bytes), label: 'used'),
              _Stat(
                value: '${summary.totals.tags}',
                label: summary.totals.tags == 1 ? 'tag' : 'tags',
              ),
            ],
          ),
          if (nonEmpty.isNotEmpty) ...[
            const SizedBox(height: Space.x4),
            Text(
              'Categories',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
            const SizedBox(height: Space.x2),
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: nonEmpty.length,
                separatorBuilder: (_, _) => const SizedBox(width: Space.x2),
                itemBuilder: (context, index) {
                  final category = nonEmpty[index];
                  final selected = query.category == category.category;
                  return FilterChip(
                    selected: selected,
                    onSelected: (_) => onCategorySelected(
                      selected ? null : category.category,
                    ),
                    label: Text(
                      '${category.category.label} ${category.files}',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                    visualDensity: VisualDensity.compact,
                    showCheckmark: false,
                  );
                },
              ),
            ),
          ],
          if (recent.isNotEmpty) ...[
            const SizedBox(height: Space.x4),
            SectionHeader(
              title: 'Recent',
              subtitle: 'The five most recently updated files.',
            ),
            const SizedBox(height: Space.x2),
            SizedBox(
              height: 84,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: recent.length,
                separatorBuilder: (_, _) => const SizedBox(width: Space.x2),
                itemBuilder: (context, index) {
                  final file = recent[index];
                  return SizedBox(
                    width: 190,
                    child: Material(
                      color: colors.surfaceRaised,
                      borderRadius: BorderRadius.circular(Radii.control),
                      child: InkWell(
                        onTap: () => onFileTap(file),
                        borderRadius: BorderRadius.circular(Radii.control),
                        child: Padding(
                          padding: const EdgeInsets.all(Space.x3),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    libraryCategoryIcon(file.category),
                                    size: 16,
                                    color: colors.primaryInk,
                                  ),
                                  const SizedBox(width: Space.x1),
                                  Expanded(
                                    child: Text(
                                      file.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.labelLarge,
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                '${formatBytes(file.sizeBytes)} · '
                                '${formatRelativeTime(file.updatedAt)}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: colors.mutedForeground,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          if (summary.totals.trashedFiles + summary.totals.trashedFolders >
              0) ...[
            const SizedBox(height: Space.x3),
            Text(
              '${summary.totals.trashedFiles} trashed '
              '${summary.totals.trashedFiles == 1 ? 'file' : 'files'} · '
              '${summary.totals.trashedFolders} trashed '
              '${summary.totals.trashedFolders == 1 ? 'folder' : 'folders'}. '
              'Trash management arrives in a later milestone.',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Breadcrumb for folder navigation. Horizontally scrollable so a deep path
/// never overflows a 320 dp phone.
class CloudBreadcrumb extends StatelessWidget {
  const CloudBreadcrumb({
    super.key,
    required this.path,
    required this.onOpen,
  });

  final List<FolderSummary> path;
  final ValueChanged<String?> onOpen;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        children: [
          TextButton(
            onPressed: () => onOpen(null),
            style: TextButton.styleFrom(
              minimumSize: const Size(48, 32),
              padding: const EdgeInsets.symmetric(horizontal: Space.x2),
            ),
            child: const Text('All files'),
          ),
          for (final folder in path) ...[
            Icon(Icons.chevron_right, size: 16, color: colors.mutedForeground),
            TextButton(
              onPressed: folder.id == path.last.id
                  ? null
                  : () => onOpen(folder.id),
              style: TextButton.styleFrom(
                minimumSize: const Size(48, 32),
                padding: const EdgeInsets.symmetric(horizontal: Space.x2),
              ),
              child: Text(
                folder.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class CloudFolderStrip extends StatelessWidget {
  const CloudFolderStrip({
    super.key,
    required this.folders,
    required this.onOpen,
  });

  final List<FolderSummary> folders;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: Space.x2,
      runSpacing: Space.x2,
      children: [
        for (final folder in folders)
          ActionChip(
            avatar: const Icon(Icons.folder_rounded, size: 18),
            onPressed: () => onOpen(folder.id),
            label: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 200),
              child: Text(
                '${folder.name} · ${folder.fileCount}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
      ],
    );
  }
}

/// Category/favourite/tag filters. All predicates run on the synced snapshot,
/// so the result count and the selected state are always consistent.
class CloudFilterBar extends StatelessWidget {
  const CloudFilterBar({
    super.key,
    required this.state,
    required this.onCategory,
    required this.onFavorites,
    required this.onTag,
  });

  final CloudLibraryState state;
  final ValueChanged<LibraryCategory?> onCategory;
  final VoidCallback onFavorites;
  final ValueChanged<String?> onTag;

  @override
  Widget build(BuildContext context) {
    final query = state.query;
    final selectedTag = state.tags
        .where((tag) => tag.id == query.tagId)
        .firstOrNull;
    final allSelected =
        query.category == null && !query.favoritesOnly && query.tagId == null;

    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          FilterChip(
            selected: allSelected,
            onSelected: (_) {
              onCategory(null);
              if (query.favoritesOnly) onFavorites();
              if (query.tagId != null) onTag(null);
            },
            label: const Text('All'),
            showCheckmark: false,
            visualDensity: VisualDensity.compact,
          ),
          const SizedBox(width: Space.x2),
          FilterChip(
            selected: query.favoritesOnly,
            onSelected: (_) => onFavorites(),
            avatar: Icon(
              query.favoritesOnly ? Icons.star : Icons.star_border,
              size: 16,
            ),
            label: const Text('Favourites'),
            showCheckmark: false,
            visualDensity: VisualDensity.compact,
          ),
          for (final category in LibraryCategory.values) ...[
            const SizedBox(width: Space.x2),
            FilterChip(
              selected: query.category == category,
              onSelected: (_) => onCategory(
                query.category == category ? null : category,
              ),
              label: Text(category.label),
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
            ),
          ],
          if (state.tags.isNotEmpty) ...[
            const SizedBox(width: Space.x2),
            PopupMenuButton<String>(
              tooltip: 'Filter by tag',
              initialValue: query.tagId ?? '',
              onSelected: (value) => onTag(value.isEmpty ? null : value),
              itemBuilder: (context) => [
                const PopupMenuItem<String>(
                  value: '',
                  child: Text('All tags'),
                ),
                for (final tag in state.tags)
                  PopupMenuItem<String>(
                    value: tag.id,
                    child: Text('${tag.name} · ${tag.fileCount}'),
                  ),
              ],
              child: Chip(
                avatar: const Icon(Icons.label_outline_rounded, size: 16),
                label: Text(selectedTag?.name ?? 'Tags'),
                visualDensity: VisualDensity.compact,
                backgroundColor: query.tagId == null
                    ? null
                    : Theme.of(context).colorScheme.secondaryContainer,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.x3,
        vertical: Space.x2,
      ),
      decoration: BoxDecoration(
        color: colors.surfaceRaised,
        borderRadius: BorderRadius.circular(Radii.control),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(value, style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(width: Space.x1),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

IconData libraryCategoryIcon(LibraryCategory category) {
  return switch (category) {
    LibraryCategory.images => Icons.image_outlined,
    LibraryCategory.videos => Icons.movie_outlined,
    LibraryCategory.audio => Icons.audiotrack_outlined,
    LibraryCategory.documents => Icons.description_outlined,
    LibraryCategory.apks => Icons.android_outlined,
    LibraryCategory.archives => Icons.folder_zip_outlined,
    LibraryCategory.apps => Icons.apps_rounded,
    LibraryCategory.downloads => Icons.download_outlined,
    LibraryCategory.other => Icons.insert_drive_file_outlined,
  };
}

String fileSortLabel(FileSort sort) {
  return switch (sort) {
    FileSort.updatedAt => 'Last updated',
    FileSort.createdAt => 'Newest first',
    FileSort.nameAsc => 'Name A–Z',
    FileSort.nameDesc => 'Name Z–A',
    FileSort.sizeDesc => 'Largest first',
    FileSort.sizeAsc => 'Smallest first',
  };
}
