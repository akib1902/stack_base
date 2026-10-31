import 'package:flutter/material.dart';

import '../../../../app/theme/tokens.dart';
import '../../../../core/models/library.dart';
import '../../../../core/ui/components/app_card.dart';
import '../../../../core/ui/formatters.dart';
import 'cloud_summary.dart';

class CloudFileGrid extends StatelessWidget {
  const CloudFileGrid({
    super.key,
    required this.files,
    required this.onOpen,
  });

  final List<FileSummary> files;
  final ValueChanged<FileSummary> onOpen;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final columns = width >= 900
            ? 4
            : width >= 600
            ? 3
            : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: files.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: Space.x2,
            mainAxisSpacing: Space.x2,
            childAspectRatio: 0.92,
          ),
          itemBuilder: (context, index) {
            final file = files[index];
            return _GridFileCard(
              file: file,
              onTap: () => onOpen(file),
            );
          },
        );
      },
    );
  }
}

class CloudFileList extends StatelessWidget {
  const CloudFileList({
    super.key,
    required this.files,
    required this.onOpen,
  });

  final List<FileSummary> files;
  final ValueChanged<FileSummary> onOpen;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(Radii.card),
        border: Border.all(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var index = 0; index < files.length; index++) ...[
            if (index > 0) Divider(height: 1, color: colors.border),
            _ListFileRow(
              file: files[index],
              onTap: () => onOpen(files[index]),
            ),
          ],
        ],
      ),
    );
  }
}

class _GridFileCard extends StatelessWidget {
  const _GridFileCard({required this.file, required this.onTap});

  final FileSummary file;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return AppCard(
      onTap: onTap,
      semanticLabel: '${file.name}, ${formatBytes(file.sizeBytes)}',
      padding: const EdgeInsets.all(Space.x3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _FileIcon(category: file.category),
              const Spacer(),
              if (file.favorite)
                Icon(Icons.star_rounded, size: 16, color: colors.primaryInk),
            ],
          ),
          const SizedBox(height: Space.x3),
          Text(
            file.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const Spacer(),
          const SizedBox(height: Space.x1),
          Text(
            formatBytes(file.sizeBytes),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.mutedForeground,
            ),
          ),
          Text(
            formatRelativeTime(file.updatedAt),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colors.mutedForeground,
            ),
          ),
        ],
      ),
    );
  }
}

class _ListFileRow extends StatelessWidget {
  const _ListFileRow({required this.file, required this.onTap});

  final FileSummary file;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final tags = file.tags.map((tag) => tag.name).join(', ');
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Space.x3,
          vertical: Space.x3,
        ),
        child: Row(
          children: [
            _FileIcon(category: file.category, small: true),
            const SizedBox(width: Space.x3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          file.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                      if (file.favorite) ...[
                        const SizedBox(width: Space.x1),
                        Icon(
                          Icons.star_rounded,
                          size: 14,
                          color: colors.primaryInk,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${formatBytes(file.sizeBytes)} · '
                    '${formatRelativeTime(file.updatedAt)}'
                    '${file.folderName == null ? '' : ' · ${file.folderName}'}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                  if (tags.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      tags,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: colors.primaryInk,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(width: Space.x2),
            Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: colors.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}

class _FileIcon extends StatelessWidget {
  const _FileIcon({required this.category, this.small = false});

  final LibraryCategory category;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final size = small ? 34.0 : 36.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(Radii.chipSmall),
        border: Border.all(color: colors.primary.withValues(alpha: 0.24)),
      ),
      child: Icon(
        libraryCategoryIcon(category),
        size: small ? 18 : 20,
        color: colors.primaryInk,
      ),
    );
  }
}
