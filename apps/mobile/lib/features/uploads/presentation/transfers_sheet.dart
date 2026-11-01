import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/ui/components/state_message.dart';
import '../../../core/ui/formatters.dart';
import '../../encryption/presentation/vault_unlock.dart';
import 'transfer_controller.dart';

Future<void> showTransfersSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => const TransfersSheet(),
  );
}

class TransfersSheet extends ConsumerWidget {
  const TransfersSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = context.stackColors;
    final transfers = ref.watch(transferControllerProvider);
    return FractionallySizedBox(
      heightFactor: 0.82,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Space.x4,
          Space.x2,
          Space.x4,
          Space.x4,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Transfers',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Ciphertext is staged on this device and uploaded '
                        'chunk by chunk. Plaintext never leaves the app.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: Space.x2),
                FilledButton.icon(
                  onPressed: () => _pickAndUpload(context, ref),
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Upload'),
                ),
              ],
            ),
            const SizedBox(height: Space.x2),
            const Divider(),
            Expanded(
              child: transfers.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(),
                ),
                error: (error, _) => Center(
                  child: StateMessage(
                    icon: Icons.swap_vert_rounded,
                    title: 'Transfers are unavailable',
                    message: error is ApiException
                        ? error.userMessage
                        : 'The local transfer queue could not be read.',
                    actionLabel: 'Retry',
                    onAction: () =>
                        ref.invalidate(transferControllerProvider),
                    tone: StateMessageTone.error,
                    compact: true,
                  ),
                ),
                data: (state) => _Queue(state: state),
              ),
            ),
            const SizedBox(height: Space.x2),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
    final file = await openFile();
    if (file == null || !context.mounted) return;
    final unlocked = await ensureVaultUnlocked(context, ref);
    if (!unlocked || !context.mounted) return;
    try {
      await ref.read(transferControllerProvider.notifier).enqueue(file);
    } on TransferException catch (error) {
      if (!context.mounted) return;
      _show(context, error.message);
    } catch (_) {
      if (!context.mounted) return;
      _show(context, 'The selected file could not be queued.');
    }
  }
}

class _Queue extends ConsumerWidget {
  const _Queue({required this.state});

  final TransferState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (state.restoring) {
      return const Center(child: CircularProgressIndicator());
    }
    return ListView(
      padding: const EdgeInsets.only(top: Space.x2),
      children: [
        if (state.restoreError) ...[
          StateMessage(
            compact: true,
            icon: Icons.cloud_off_rounded,
            title: 'The server queue could not be checked',
            message:
                'Local staged transfers are still listed. Only the server '
                'state is unknown; retry when the API is reachable.',
            actionLabel: 'Check again',
            onAction: () => ref.invalidate(transferControllerProvider),
            tone: StateMessageTone.error,
          ),
          const SizedBox(height: Space.x2),
        ],
        if (state.items.isEmpty)
          const StateMessage(
            compact: true,
            icon: Icons.swap_vert_rounded,
            title: 'No transfers yet',
            message:
                'Choose a file to encrypt it locally and upload the ciphertext. '
                'Progress, pause, resume and retry appear here.',
          )
        else
          for (final item in state.items)
            _TransferRow(
              key: ValueKey(item.id),
              item: item,
              onPause: () => _run(
                context,
                () => ref
                    .read(transferControllerProvider.notifier)
                    .pause(item.id),
              ),
              onResume: () => _run(
                context,
                () => ref
                    .read(transferControllerProvider.notifier)
                    .resume(item.id),
              ),
              onCancel: () => _run(
                context,
                () => ref
                    .read(transferControllerProvider.notifier)
                    .cancel(item.id),
              ),
              onDismiss: () =>
                  ref.read(transferControllerProvider.notifier).dismiss(item.id),
            ),
        if (state.items.any((item) => item.isFinished)) ...[
          const SizedBox(height: Space.x2),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: () =>
                  ref.read(transferControllerProvider.notifier).clearFinished(),
              child: const Text('Clear finished'),
            ),
          ),
        ],
        const SizedBox(height: Space.x2),
      ],
    );
  }

  Future<void> _run(
    BuildContext context,
    Future<void> Function() action,
  ) async {
    try {
      await action();
    } on TransferException catch (error) {
      if (!context.mounted) return;
      _show(context, error.message);
    } on ApiException catch (error) {
      if (!context.mounted) return;
      _show(context, error.userMessage);
    }
  }
}

class _TransferRow extends StatelessWidget {
  const _TransferRow({
    super.key,
    required this.item,
    required this.onPause,
    required this.onResume,
    required this.onCancel,
    required this.onDismiss,
  });

  final TransferItem item;
  final VoidCallback onPause;
  final VoidCallback onResume;
  final VoidCallback onCancel;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final tint = switch (item.status) {
      TransferItemStatus.completed => colors.success,
      TransferItemStatus.failed => colors.error,
      TransferItemStatus.cancelled => colors.mutedForeground,
      TransferItemStatus.paused => colors.primaryInk,
      _ => colors.primaryInk,
    };
    return Container(
      margin: const EdgeInsets.only(bottom: Space.x2),
      padding: const EdgeInsets.all(Space.x3),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(Radii.card),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(_iconFor(item.status), size: 18, color: tint),
              const SizedBox(width: Space.x2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${formatBytes(item.sourceSizeBytes)} · ${item.detail}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: colors.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (item.error != null) ...[
            const SizedBox(height: Space.x1),
            Text(
              item.error!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.error,
              ),
            ),
          ],
          if (item.showsProgress) ...[
            const SizedBox(height: Space.x2),
            Semantics(
              label: '${item.name} upload progress',
              value: '${item.percent} percent',
              child: LinearProgressIndicator(
                value: item.percent / 100,
                minHeight: 5,
                borderRadius: BorderRadius.circular(Radii.chip),
              ),
            ),
          ],
          const SizedBox(height: Space.x1),
          Align(
            alignment: Alignment.centerRight,
            child: Wrap(
              spacing: Space.x1,
              children: [
                if (item.isActive) ...[
                  TextButton(
                    onPressed: onPause,
                    child: const Text('Pause'),
                  ),
                  TextButton(
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                ] else if (item.status == TransferItemStatus.paused) ...[
                  FilledButton(
                    onPressed: item.canRetry ? onResume : null,
                    child: const Text('Resume'),
                  ),
                  TextButton(
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                ] else if (item.status == TransferItemStatus.failed) ...[
                  if (item.canRetry)
                    FilledButton(
                      onPressed: onResume,
                      child: const Text('Retry'),
                    ),
                  TextButton(
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                ] else
                  TextButton(
                    onPressed: onDismiss,
                    child: const Text('Dismiss'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _iconFor(TransferItemStatus status) {
    return switch (status) {
      TransferItemStatus.completed => Icons.check_circle_rounded,
      TransferItemStatus.failed => Icons.error_outline_rounded,
      TransferItemStatus.cancelled => Icons.cancel_outlined,
      TransferItemStatus.paused => Icons.pause_circle_outline_rounded,
      _ => Icons.sync_rounded,
    };
  }
}

void _show(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
