import 'package:flutter/material.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/config/app_config.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/stackbase_mark.dart';

class StartupFailureScreen extends StatelessWidget {
  const StartupFailureScreen({
    super.key,
    required this.config,
    required this.details,
  });

  final AppConfig config;
  final String? details;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Space.x5),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Align(
                    alignment: Alignment.centerLeft,
                    child: StackBaseMark(size: 52),
                  ),
                  const SizedBox(height: Space.x5),
                  Text(
                    'Authentication could not start',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: Space.x2),
                  Text(
                    'The build configuration is valid, but the Supabase client '
                    'failed to initialize. No session was created and no '
                    'credentials were sent.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: colors.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: Space.x5),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'What to check',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: Space.x2),
                        Text(
                          'SUPABASE_URL must be the project URL and '
                          'SUPABASE_PUBLISHABLE_KEY must be the public '
                          'publishable key, not a service-role key. Rebuild '
                          'after correcting either value.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: Space.x3),
                        Text(
                          'API: ${config.apiBaseUrl ?? 'not set'}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colors.mutedForeground),
                        ),
                        if (config.isDebug && details != null) ...[
                          const SizedBox(height: Space.x3),
                          SelectableText(
                            details!,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: colors.error),
                          ),
                        ],
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
