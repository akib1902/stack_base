import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/ui/components/stackbase_mark.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const StackBaseMark(size: 64),
            const SizedBox(height: Space.x5),
            Text(
              'StackBase',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: Space.x2),
            Text(
              'Restoring your session',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: colors.mutedForeground),
            ),
            const SizedBox(height: Space.x6),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
          ],
        ),
      ),
    );
  }
}
