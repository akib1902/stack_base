import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';

/// White/graphite surface with the restrained StackBase border and radius.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.x4),
    this.onTap,
    this.semanticLabel,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(Radii.card),
      side: BorderSide(color: colors.border),
    );
    return Semantics(
      label: semanticLabel,
      button: onTap != null,
      child: Material(
        color: colors.surface,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(Radii.card),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
