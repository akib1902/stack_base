import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';

/// Loading, empty, error and offline states share one accessible layout.
class StateMessage extends StatelessWidget {
  const StateMessage({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.compact = false,
    this.tone = StateMessageTone.neutral,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool compact;
  final StateMessageTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final tint = switch (tone) {
      StateMessageTone.neutral => colors.primaryInk,
      StateMessageTone.error => colors.error,
    };
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: Space.x6,
        vertical: compact ? Space.x4 : Space.x8,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(Radii.control),
              border: Border.all(color: tint.withValues(alpha: 0.24)),
            ),
            child: Icon(icon, color: tint, size: compact ? 20 : 28),
          ),
          SizedBox(height: compact ? Space.x3 : Space.x4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: Space.x2),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: colors.mutedForeground),
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: Space.x5),
            FilledButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}

enum StateMessageTone { neutral, error }
