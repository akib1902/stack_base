import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';

class StackBaseMark extends StatelessWidget {
  const StackBaseMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Semantics(
      label: 'StackBase',
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: colors.primary,
          borderRadius: BorderRadius.circular(size * 0.28),
          boxShadow: [
            BoxShadow(
              color: colors.primary.withValues(alpha: 0.28),
              blurRadius: size * 0.45,
              offset: Offset(0, size * 0.12),
            ),
          ],
        ),
        child: Icon(
          Icons.layers_rounded,
          size: size * 0.52,
          color: colors.primaryForeground,
        ),
      ),
    );
  }
}
