import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/ui/components/state_message.dart';

Future<void> showTransfersSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (context) => const TransfersSheet(),
  );
}

class TransfersSheet extends StatelessWidget {
  const TransfersSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Space.x4,
        Space.x2,
        Space.x4,
        Space.x6,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Transfers', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: Space.x1),
          Text(
            'Upload and download activity stays reachable from every screen.',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: colors.mutedForeground),
          ),
          const SizedBox(height: Space.x2),
          const Divider(),
          const StateMessage(
            compact: true,
            icon: Icons.swap_vert_rounded,
            title: 'No transfers yet',
            message:
                'Encrypted uploads and downloads are not enabled in this '
                'build. When they are, their progress and recovery actions will '
                'appear here.',
          ),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ),
        ],
      ),
    );
  }
}
