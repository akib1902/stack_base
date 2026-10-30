import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/config/app_config.dart';
import '../../../core/ui/components/app_card.dart';
import '../../../core/ui/components/stackbase_mark.dart';

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key, required this.config});

  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    final colors = context.stackColors;
    final command =
        'flutter run \\\n'
        '  --dart-define=API_BASE_URL=http://10.0.2.2:8787 \\\n'
        '  --dart-define=AUTH_MODE=dev';

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
                    'Finish the mobile build setup',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: Space.x2),
                  Text(
                    'This build has no usable backend configuration, so it '
                    'stops before starting a session. Nothing is sent anywhere '
                    'and no placeholder account is created.',
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
                          'Configuration problems',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: Space.x3),
                        for (final problem in config.problems) ...[
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.error_outline_rounded,
                                size: 18,
                                color: colors.error,
                              ),
                              const SizedBox(width: Space.x2),
                              Expanded(
                                child: Text(
                                  problem,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: Space.x2),
                        ],
                        if (config.problems.isEmpty)
                          Text(
                            'No problems were reported, but the configuration '
                            'is incomplete.',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.x4),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Development example',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: Space.x2),
                        Text(
                          'Android emulators reach the host at 10.0.2.2. A '
                          'physical device needs the host LAN address. iOS '
                          'simulators use 127.0.0.1. Rebuild after changing '
                          'dart-defines; restarting alone does not change them.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colors.mutedForeground),
                        ),
                        const SizedBox(height: Space.x3),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(Space.x3),
                          decoration: BoxDecoration(
                            color: colors.surfaceRaised,
                            borderRadius: BorderRadius.circular(
                              Radii.chipSmall,
                            ),
                            border: Border.all(color: colors.border),
                          ),
                          child: SelectableText(
                            command,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  fontFamily: 'monospace',
                                  height: 1.5,
                                ),
                          ),
                        ),
                        const SizedBox(height: Space.x3),
                        OutlinedButton.icon(
                          onPressed: () async {
                            await Clipboard.setData(
                              ClipboardData(text: command),
                            );
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Development command copied.'),
                              ),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded, size: 18),
                          label: const Text('Copy command'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.x4),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Release builds',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: Space.x2),
                        Text(
                          'Production requires HTTPS, Supabase Auth and a '
                          'published application. Development sessions are '
                          'rejected by the release configuration.',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colors.mutedForeground),
                        ),
                        if (config.rawApiBaseUrl.isNotEmpty) ...[
                          const SizedBox(height: Space.x3),
                          Text(
                            'Configured API: ${config.rawApiBaseUrl}',
                            style: Theme.of(context).textTheme.bodySmall,
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
