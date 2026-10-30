import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({
    super.key,
    required this.message,
    this.onRetry,
    this.retryLabel = 'Retry',
  });

  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.x4,
        vertical: Space.x3,
      ),
      decoration: BoxDecoration(
        color: colors.primary.withValues(alpha: 0.10),
        border: Border(
          bottom: BorderSide(color: colors.primary.withValues(alpha: 0.28)),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_off_rounded, size: 18, color: colors.primaryInk),
          const SizedBox(width: Space.x2),
          Expanded(
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colors.foreground,
              ),
            ),
          ),
          if (onRetry != null)
            TextButton(
              onPressed: onRetry,
              style: TextButton.styleFrom(
                minimumSize: const Size(48, 36),
                padding: const EdgeInsets.symmetric(horizontal: Space.x2),
              ),
              child: Text(retryLabel),
            ),
        ],
      ),
    );
  }
}
