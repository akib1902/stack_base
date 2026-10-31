import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/theme/tokens.dart';
import '../../../../core/api/api_exception.dart';
import '../../../../core/models/library.dart';
import '../../../../core/ui/components/app_card.dart';
import '../../../../core/ui/components/section_header.dart';
import '../../../../core/ui/components/state_message.dart';
import '../../../../core/ui/components/status_pill.dart';
import '../../../../core/ui/formatters.dart';
import '../cloud_controller.dart';
import 'cloud_summary.dart';

Future<void> showFileDetailsSheet(
  BuildContext context,
  FileSummary file,
) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: context.stackColors.surface,
    builder: (context) => _FileDetailsSheet(file: file),
  );
}

class _FileDetailsSheet extends StatelessWidget {
  const _FileDetailsSheet({required this.file});

  final FileSummary file;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final tags = file.tags;
    final ready = file.contentStatus == FileContentStatus.ready;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.85,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            Space.x5,
            0,
            Space.x5,
            Space.x6,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: colors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(Radii.control),
                        ),
                        child: Icon(
                          libraryCategoryIcon(file.category),
                          color: colors.primaryInk,
                        ),
                      ),
                      const SizedBox(width: Space.x3),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              file.name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              file.extension == null
                                  ? file.mimeType
                                  : '.${file.extension} · ${file.mimeType}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: colors.mutedForeground),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.x3),
                  Wrap(
                    spacing: Space.x2,
                    runSpacing: Space.x2,
                    children: [
                      StatusPill(label: file.category.label),
                      if (file.favorite)
                        const StatusPill(
                          label: 'Favourite',
                          tone: StatusTone.success,
                          icon: Icons.star_rounded,
                        ),
                      StatusPill(
                        label: ready
                            ? 'Encrypted version ready'
                            : 'No encrypted version yet',
                        tone: ready ? StatusTone.success : StatusTone.warning,
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.x4),
                  Divider(height: 1, color: colors.border),
                  const SizedBox(height: Space.x3),
                  _DetailRow(label: 'Size', value: formatBytes(file.sizeBytes)),
                  _DetailRow(label: 'Type', value: file.mimeType),
                  _DetailRow(
                    label: 'Folder',
                    value: file.folderName ?? 'Not in a folder',
                  ),
                  _DetailRow(
                    label: 'Created',
                    value: formatDate(file.createdAt),
                  ),
                  _DetailRow(
                    label: 'Updated',
                    value: formatDate(file.updatedAt),
                  ),
                  _DetailRow(
                    label: 'Description',
                    value: file.description ?? 'No description',
                  ),
                  const SizedBox(height: Space.x3),
                  Text(
                    'Tags',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: Space.x2),
                  if (tags.isEmpty)
                    Text(
                      'No tags',
                      style: Theme.of(context).textTheme.bodySmall,
                    )
                  else
                    Wrap(
                      spacing: Space.x2,
                      runSpacing: Space.x2,
                      children: [
                        for (final tag in tags) StatusPill(label: tag.name),
                      ],
                    ),
                  const SizedBox(height: Space.x5),
                  Container(
                    padding: const EdgeInsets.all(Space.x3),
                    decoration: BoxDecoration(
                      color: colors.surfaceRaised,
                      borderRadius: BorderRadius.circular(Radii.control),
                      border: Border.all(color: colors.border),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.lock_outline_rounded,
                          size: 18,
                          color: colors.mutedForeground,
                        ),
                        const SizedBox(width: Space.x2),
                        Expanded(
                          child: Text(
                            'Preview and download arrive with the cryptography '
                            'and transfer milestones. This build shows metadata '
                            'only and never decrypts content or asks for a '
                            'passphrase.',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: colors.mutedForeground),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.x1),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 104,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.mutedForeground,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodySmall),
          ),
        ],
      ),
    );
  }
}

Future<void> showInsightsSheet(BuildContext context) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: context.stackColors.surface,
    builder: (context) => const InsightsSheet(),
  );
}

class InsightsSheet extends ConsumerWidget {
  const InsightsSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final insights = ref.watch(insightsProvider);
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.85,
      child: insights.when(
        loading: () => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: Space.x3),
              Text(
                'Reading storage insights…',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
        error: (error, _) => Center(
          child: StateMessage(
            icon: Icons.insights_outlined,
            title: 'Insights are unavailable',
            message: error is ApiException
                ? error.userMessage
                : 'The server did not return storage insights.',
            actionLabel: 'Retry',
            onAction: () => ref.invalidate(insightsProvider),
            tone: StateMessageTone.error,
          ),
        ),
        data: (value) {
          final totals = value.totals;
          return ListView(
            padding: const EdgeInsets.fromLTRB(
              Space.x4,
              0,
              Space.x4,
              Space.x6,
            ),
            children: [
              const SectionHeader(
                title: 'Storage insights',
                subtitle:
                    'Computed by the server from your real metadata. No file '
                    'content is read.',
              ),
              const SizedBox(height: Space.x3),
              AppCard(
                child: Wrap(
                  spacing: Space.x2,
                  runSpacing: Space.x2,
                  children: [
                    _InsightStat(
                      value: formatBytes(totals.bytes),
                      label: 'in ${totals.files} files',
                    ),
                    _InsightStat(
                      value: formatBytes(totals.trashedBytes),
                      label: 'in Trash',
                    ),
                    _InsightStat(
                      value: formatBytes(totals.versionBytes),
                      label: 'older versions',
                    ),
                    _InsightStat(
                      value: '${totals.versions}',
                      label: totals.versions == 1 ? 'version' : 'versions',
                    ),
                    _InsightStat(
                      value: '${totals.tags}',
                      label: totals.tags == 1 ? 'tag' : 'tags',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.x5),
              const SectionHeader(title: 'By category'),
              const SizedBox(height: Space.x2),
              AppCard(
                child: Column(
                  children: [
                    for (final category in value.categories)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: Space.x1),
                        child: Row(
                          children: [
                            Icon(
                              libraryCategoryIcon(category.category),
                              size: 16,
                              color: colors.mutedForeground,
                            ),
                            const SizedBox(width: Space.x2),
                            Expanded(
                              child: Text(
                                category.category.label,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ),
                            Text(
                              '${category.files} · '
                              '${formatBytes(category.bytes)}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: colors.mutedForeground),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              if (value.largestFiles.isNotEmpty) ...[
                const SizedBox(height: Space.x5),
                const SectionHeader(
                  title: 'Largest files',
                  subtitle: 'Logical plaintext size, not provider usage.',
                ),
                const SizedBox(height: Space.x2),
                AppCard(
                  child: Column(
                    children: [
                      for (final file in value.largestFiles)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: Space.x1,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  file.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.bodySmall,
                                ),
                              ),
                              Text(
                                formatBytes(file.sizeBytes),
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: colors.mutedForeground),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              if (value.largestFolders.isNotEmpty) ...[
                const SizedBox(height: Space.x5),
                const SectionHeader(title: 'Largest folders'),
                const SizedBox(height: Space.x2),
                AppCard(
                  child: Column(
                    children: [
                      for (final folder in value.largestFolders)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: Space.x1,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  folder.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.bodySmall,
                                ),
                              ),
                              Text(
                                '${folder.files} · '
                                '${formatBytes(folder.bytes)}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: colors.mutedForeground),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: Space.x5),
              const SectionHeader(
                title: 'Duplicate candidates',
                subtitle:
                    'Files whose plaintext fingerprint matches. Only the client '
                    'sees the fingerprint; the server never sees content.',
              ),
              const SizedBox(height: Space.x2),
              if (value.duplicateGroups.isEmpty)
                AppCard(
                  child: Text(
                    'No duplicate candidates were found in your library.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                )
              else
                for (final group in value.duplicateGroups)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Space.x2),
                    child: AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${group.files.length} copies · '
                            '${formatBytes(group.wastedBytes)} reclaimable',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: Space.x1),
                          Text(
                            'Each copy is ${formatBytes(group.sizeBytes)}.',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: colors.mutedForeground),
                          ),
                          const SizedBox(height: Space.x1),
                          for (final file in group.files.take(5))
                            Text(
                              file.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                        ],
                      ),
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

class _InsightStat extends StatelessWidget {
  const _InsightStat({required this.value, required this.label});

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
