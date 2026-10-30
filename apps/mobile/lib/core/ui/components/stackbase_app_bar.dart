import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';
import '../../../features/uploads/presentation/transfers_sheet.dart';

class StackBaseAppBar extends StatelessWidget implements PreferredSizeWidget {
  const StackBaseAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.showTransfers = true,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool showTransfers;

  @override
  Size get preferredSize => Size.fromHeight(subtitle == null ? 64 : 76);

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return AppBar(
      toolbarHeight: preferredSize.height,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title),
          if (subtitle != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                subtitle!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.mutedForeground,
                ),
              ),
            ),
        ],
      ),
      actions: [
        if (showTransfers)
          IconButton(
            onPressed: () => showTransfersSheet(context),
            tooltip: 'Transfers',
            icon: const Icon(Icons.swap_vert_rounded),
          ),
        ...actions,
        const SizedBox(width: Space.x2),
      ],
    );
  }
}
